# web

Blocks starter app: React 18 + Vite + TypeScript, with its own email/password login pages backed by Blocks IAM and a project-scoped profile page as the landing page.

Every Blocks API call in this app goes through [`@seliseblocks/client`](https://www.npmjs.com/package/@seliseblocks/client) via a single `createBlocksClient()` instance in `src/lib/blocks/client.ts` — there is no hand-written `fetch()` wrapper for Blocks endpoints anywhere in this app. Each SDK module is exercised in context rather than in one dedicated demo panel: `auth` on the login, sign-up, activation and password-reset pages, `iam` on the Profile page and user menu, and `localization` in `LocalizationProvider`. Add more pages under `src/features/` as your app needs them.

## Setup

```bash
npm install
npm run dev
```

`.env` already has working defaults for this project.

## Login

Nobody ever sees a Blocks-hosted page. Every account screen is part of this app and talks to Blocks IAM through the SDK:

- `/login` signs in with email and password (`blocksClient.auth.login()`).
- `/signup` creates the account (`auth.signup()`); IAM emails an activation link.
- `/oidc/activate/…` (also `/activate`) is where that link lands; the person chooses a password (`auth.activate()`).
- `/forgot-password` asks IAM to email a reset link (`auth.recover()`), which lands on `/reset-password` (`auth.resetPassword()`).

For the emailed links to reach this app instead of IAM's own pages, the project's auth config (`blocks auth config get`) must point `accountActionBaseUrl` at the deployed app domain, with `recoverAccountPath` `reset-password`. IAM keeps `accountActivationPath` at `oidc/activate/`, so the app also serves the activation page there. Because those links always use the deployed domain, test activation and reset there (or paste the link's path onto `https://localhost:5173`).

The public OIDC client (`VITE_BLOCKS_OIDC_CLIENT_ID`) is still used for refreshing tokens and is sent with sign-up.

## Running locally (no hosts-file changes)

Blocks IAM sets a **Secure** session cookie scoped to the project's cookie domain, so the browser has to see the app and the API as one HTTPS site. Local dev does that with Vite's dev-server proxy: the app runs on `https://localhost:5173`, and every Blocks API call goes to `https://localhost:5173/blocks-api/…`, which Vite forwards to `VITE_BLOCKS_API_URL` (see `vite.config.ts`). Cookies come back as localhost cookies. The project's real domain is never remapped, so it always reaches the deployed app.

1. `.env` needs `VITE_BLOCKS_DEV_HOST=localhost`, `VITE_BLOCKS_DEV_PORT=5173` and `VITE_BLOCKS_DEV_PROXY=true` (see `.env.example`).
2. `npm run cert` once, and trust `.cert/dev-cert.pem` in your OS store (the script prints the command). The cert's SAN includes `localhost`.
3. `npm run dev`, then open `https://localhost:5173`.

Keep port 5173 (`strictPort` is on): it is the origin registered on the OIDC client.

The proxy is dev-only. Production builds call the API directly, and `.env.<environment>` (e.g. `.env.dev`) holds the deployed settings.

`.cert/` is gitignored, so each developer generates and trusts their own cert.

## Blocks Release deployment

The scaffold includes `Dockerfile` and `nginx.conf` for Blocks Release. The Release service must pass Docker build arg `ci_build=<environment>` plus the public `VITE_BLOCKS_*` build args documented in the Dockerfile. The generated `package.json` also provides `build:dev`, `build:test`, `build:stg`, `build:iat`, `build:uat`, `build:preprod`, `build:prodshadow`, and `build:prod` scripts for local checks.

During each environment build, `scripts/write-release-env.mjs` writes `dist/env.<environment>` from client-safe Docker build args or local `.env` files. Root `.env` remains gitignored and must not be committed.

## What's included

- `/login`, `/signup`, `/activate`, `/forgot-password`, `/reset-password` — the account pages described above. After signing in, you return to the page you started from.
- `/` and `/profile` — protected; redirect to `/login` when signed out.
- Sidebar + topbar shell matching the `@seliseblocks/blocks-kit` look (icon-only rail on narrow screens, avatar dropdown, notifications menu, active-item accent bar).
- `blocks/localization/*.en.json` local i18n seed files for AI or human edits. Sync them through `blocks localization validate` and `blocks localization push`; the runtime app reads Localization service data through `blocksClient.localization`.

IAM can set the session as a **Secure, httpOnly** cookie, which this app never reads. "Signed in" is determined by calling `blocksClient.auth.userInfo()` (`GET /iam/v4/auth/me`), which the browser's cookie authenticates automatically; this is different from `blocksClient.iam.me()`, the full IAM profile call used on the Profile page. Logging out calls `blocksClient.auth.logout()` so IAM ends the session server-side. If IAM also returns tokens in the login response body, the access token is cached in `sessionStorage` and refreshed with `blocksClient.auth.oidc.refreshToken()`.
