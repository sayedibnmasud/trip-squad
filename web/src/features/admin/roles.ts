// Pure helpers for IAM user records -- no client import, so they are testable
// outside a browser.

// Role slugs defined for this app (blocks iam roles list). Users hold exactly
// one of them; any other role a user has (e.g. platform roles) is left alone.
export const APP_ROLES = ["traveler", "tripsquad-admin"] as const;
export type AppRole = (typeof APP_ROLES)[number];

// IAM permissions the tripsquad-admin role holds. The screen is gated on the
// read permission; IAM enforces every call regardless of what the UI shows.
export const VIEW_USERS_PERMISSION = "blocks-iam::iam::users";
export const MANAGE_USERS_PERMISSION = "blocks-iam::iam::mutate-users";
export const RESEND_ACTIVATION_PERMISSION = "blocks-iam::auth::resend-activation";

export type ManagedUser = {
  itemId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  active?: boolean;
  isVerified?: boolean;
  // The list endpoint returns roles keyed by organization ({ default: [...] });
  // read them through rolesOf().
  roles?: string[] | Record<string, string[]>;
  lastLoggedInTime?: string | null;
  accountState?: "Active" | "PendingVerification" | "Suspended" | "Deactivated";
};

const DEFAULT_ORGANIZATION = "default";

export function rolesOf(user: ManagedUser): string[] {
  if (Array.isArray(user.roles)) return user.roles;
  return user.roles?.[DEFAULT_ORGANIZATION] ?? [];
}

export function appRoleOf(user: ManagedUser): AppRole | undefined {
  const roles = rolesOf(user);
  return APP_ROLES.find((slug) => roles.includes(slug));
}

export function displayName(user: ManagedUser): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;
}

// Reads the `permissions` / `roles` claims of the session
// (blocksClient.auth.userInfo()). Note: the token carries roles and only
// directly assigned permissions -- the gateway resolves role-granted
// permissions server-side, so the browser can't see them. Gate UI on roles.
export function claimList(claims: Record<string, unknown> | undefined, name: "permissions" | "roles"): string[] {
  const value = claims?.[name];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return typeof value === "string" && value ? [value] : [];
}

// What each app role may do in the UI. Mirrors the IAM permissions assigned to
// the role (blocks iam roles assign-permissions), which IAM enforces.
export const ADMIN_ROLE: AppRole = "tripsquad-admin";
