import { blocksClient } from "./client";
import { isJwtExpired } from "./jwt";

// IAM can set the session as a Secure, httpOnly cookie -- this app never
// sees that token and must not try to. Bearer tokens below are only
// populated when IAM also returns tokens in the response body; in a pure
// cookie flow every function below simply no-ops around them.
const TOKEN_KEY = "blocks-app:access-token";
const REFRESH_TOKEN_KEY = "blocks-app:refresh-token";

let cachedAccessToken: string | undefined;
let cachedRefreshToken: string | undefined;
let refreshInFlight: Promise<string | undefined> | undefined;

// AuthProvider subscribes to this to learn the session died out-of-band (a
// refresh came back invalid_grant) so it can flip status to unauthenticated
// and let RequireAuth redirect to /login -- this module has no router access
// of its own to do that navigation directly.
const sessionExpiredListeners = new Set<() => void>();

export function onSessionExpired(listener: () => void): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

function notifySessionExpired(): void {
  for (const listener of sessionExpiredListeners) listener();
}

function getAccessToken(): string | undefined {
  if (cachedAccessToken && !isJwtExpired(cachedAccessToken)) return cachedAccessToken;

  const stored = sessionStorage.getItem(TOKEN_KEY);
  if (stored && !isJwtExpired(stored)) {
    cachedAccessToken = stored;
    return stored;
  }

  return undefined;
}

// Never written to storage by this app, deliberately: a refresh token is
// long-lived, and anything readable from JS is readable by an XSS payload.
// The access token is short-lived, so that one is persisted to keep a
// reload from bouncing the user, and IAM's httpOnly session cookie
// re-establishes the session once it expires.
//
// The stored value is still *read* as a fallback, for a host that can
// re-establish a session but cannot reach this module's variables -- a
// build running inside blocks-studio's preview is the case that matters:
// the session lives in an httpOnly cookie the page cannot see, and there
// is no reload-surviving cookie flow to fall back on, so the host seeds a
// non-secret marker here to say "ask for a refresh". Reading it is safe
// precisely because this app never puts a real token there.
function getRefreshToken(): string | undefined {
  if (cachedRefreshToken) return cachedRefreshToken;

  const seeded = sessionStorage.getItem(REFRESH_TOKEN_KEY);
  return seeded ?? undefined;
}

function persistTokens(accessToken: string, refreshToken?: string): void {
  cachedAccessToken = accessToken;
  sessionStorage.setItem(TOKEN_KEY, accessToken);

  if (refreshToken) cachedRefreshToken = refreshToken;
}

function clearLocalTokens(): void {
  cachedAccessToken = undefined;
  cachedRefreshToken = undefined;
  sessionStorage.removeItem(TOKEN_KEY);
  // This app never writes that key, but a host may have seeded it (see
  // getRefreshToken) and an earlier build of this app may have persisted a
  // real token there -- either way it must not survive a sign-out.
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

// Passed to createBlocksClient as the `accessToken` resolver: returns the
// cached token when it's still fresh, otherwise refreshes it through
// blocksClient.auth.oidc.refreshToken() -- concurrent callers share one
// in-flight refresh instead of racing duplicate requests. Resolves to
// undefined in the default cookie flow (nothing cached, nothing to
// refresh); the SDK still sends the session cookie on every request, so
// protected calls keep working without an Authorization header.
export async function getValidAccessToken(): Promise<string | undefined> {
  const current = getAccessToken();
  if (current) return current;
  return forceRefreshAccessToken();
}

// Passed to createBlocksClient as `onUnauthorized`: unlike getValidAccessToken,
// this skips the "is the cached token still fresh" check and always goes
// straight to refreshAccessToken() -- a 401 means the server already
// disagreed with our local judgment of freshness, so re-checking it would
// just resend the same rejected token. Still funnels through the same
// refreshInFlight guard, so a burst of concurrent 401s (and any proactive
// caller racing them) share one refresh call instead of firing one each.
export async function forceRefreshAccessToken(): Promise<string | undefined> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return undefined;

  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken(refreshToken).finally(() => {
      refreshInFlight = undefined;
    });
  }

  return refreshInFlight;
}

async function refreshAccessToken(refreshToken: string): Promise<string | undefined> {
  let response: Awaited<ReturnType<typeof blocksClient.auth.oidc.refreshToken>>;
  try {
    response = await blocksClient.auth.oidc.refreshToken({ refreshToken });
  } catch {
    // A network/transport failure here says nothing about whether the
    // refresh token itself is still valid -- keep it cached so the next
    // attempt can still use it, instead of forcing a fresh sign-in over a
    // transient blip (e.g. the dev server restarting mid-session).
    return undefined;
  }

  const accessToken = response.access_token ?? response.accessToken;
  if (!accessToken) {
    // IAM answered but explicitly rejected the grant (e.g. invalid_grant --
    // the refresh token expired or was already rotated away) -- now it
    // really is dead, so this is a full sign-out, not just a cache clear.
    // Clear local state before the logout call so its own accessToken
    // lookup finds nothing to refresh and doesn't loop back into us.
    clearLocalTokens();
    await blocksClient.auth.logout({ refreshToken }).catch(() => undefined);
    notifySessionExpired();
    return undefined;
  }

  // The identity provider may not rotate the refresh token on every call --
  // keep the previous one instead of overwriting a working token with undefined.
  const nextRefreshToken = response.refresh_token ?? response.refreshToken ?? refreshToken;
  persistTokens(accessToken, nextRefreshToken);
  return accessToken;
}

// The session's source of truth is IAM, not a token this app can inspect --
// `GET /iam/v4/auth/me` (blocksClient.auth.userInfo()) validates the
// httpOnly session cookie (or bearer token, if one is cached) and returns
// its claims in one round trip. `iam.me()` is a different, heavier call --
// the full IAM user profile with roles/permissions -- and is used
// separately on the Profile page; it is not a substitute for this check.
export async function fetchSessionClaims(): Promise<Record<string, unknown> | undefined> {
  try {
    return await blocksClient.auth.userInfo();
  } catch {
    return undefined;
  }
}

// Thrown for IAM's well-known login rejections so the login page can show a
// translated message instead of IAM's raw English error_description.
export class LoginError extends Error {
  constructor(readonly code: "invalid_credentials" | "mfa_required" | "unknown", message: string) {
    super(message);
  }
}

// Sign-in happens on this app's own login page, never on a Blocks-hosted
// one: the email and password go straight to IAM's AuthController
// (POST /iam/v4/auth/login). Like the old hosted flow, IAM may set the
// session as an httpOnly cookie on this response, return tokens in the body,
// or both -- a body token is cached, and AuthProvider then confirms the
// session through auth/me either way.
export async function signInWithPassword(input: { email: string; password: string; rememberMe: boolean }): Promise<void> {
  const data = await blocksClient.auth.login({
    username: input.email.trim(),
    password: input.password,
    rememberMe: input.rememberMe
  });

  if (data.error) {
    const message = data.error_description || data.error;
    if (data.error === "invalid_username_password") throw new LoginError("invalid_credentials", message);
    throw new LoginError("unknown", message);
  }

  // Two-step sign-in is off for this project; if it is ever switched on,
  // IAM answers with an MFA challenge instead of a session, which this
  // form can't complete yet.
  if (data.mfaId || data.enable_mfa || data.enableMfa) {
    throw new LoginError("mfa_required", "This account needs a verification code to sign in.");
  }

  const accessToken = data.access_token ?? data.accessToken;
  if (accessToken) persistTokens(accessToken, data.refresh_token ?? data.refreshToken);
}

// IAM's account endpoints (signup, recover, reset, activate) answer
// { isSuccess, errors } rather than throwing -- turn a rejection into an
// Error carrying IAM's own messages.
export function ensureIamSuccess(response: unknown, fallback: string): void {
  const body = (response ?? {}) as { isSuccess?: boolean; errors?: Record<string, string> | null };
  const errors = Object.values(body.errors ?? {}).filter(Boolean);
  if (body.isSuccess === false || errors.length) {
    throw new Error(errors.join(" ") || fallback);
  }
}

// IAM emails a reset link to <accountActionBaseUrl>/<recoverAccountPath>,
// which the auth config points at this app's /reset-password page.
export async function requestPasswordReset(email: string): Promise<void> {
  ensureIamSuccess(await blocksClient.auth.recover({ email: email.trim() }), "Couldn't send the reset email.");
}

export async function resetPassword(code: string, password: string): Promise<void> {
  ensureIamSuccess(await blocksClient.auth.resetPassword({ code, password }), "Couldn't reset the password.");
}

// Same for the activation link sent after sign-up: it lands on this app's
// /activate page, where the person chooses their password.
export async function activateAccount(code: string, password: string): Promise<void> {
  ensureIamSuccess(await blocksClient.auth.activate({ code, password }), "Couldn't activate the account.");
}

// The code in an emailed IAM link. Depending on how IAM builds the URL it
// arrives as a query parameter or as the last path segment
// (/activate/<code>), so accept both.
export function linkCode(path: string, search: string, base: string): string {
  const params = new URLSearchParams(search);
  const fromQuery = params.get("code") ?? params.get("token") ?? params.get("activationCode");
  if (fromQuery) return fromQuery;
  const rest = path.slice(base.length).replace(/^\/+|\/+$/g, "");
  return rest ? decodeURIComponent(rest) : "";
}

export async function logout(): Promise<void> {
  // Ask IAM to end the session (clears the httpOnly cookie server-side)
  // before dropping any locally cached bearer token; best-effort so a
  // network failure never blocks the user from leaving a protected page.
  await blocksClient.auth.logout({ refreshToken: getRefreshToken() }).catch(() => undefined);
  clearLocalTokens();
}
