import { useAuth } from "../../app/providers/AuthProvider";
import { useCurrentUser } from "../profile/useCurrentUser";
import { ADMIN_ROLE, claimList } from "./roles";

// The signed-in user's roles, from the session claims and the IAM profile.
// Roles are the reliable signal in the browser: role-granted permissions are
// resolved server-side and never appear in the token or in iam.me().
// `undefined` means neither source has loaded yet.
export function useMyRoles(): string[] | undefined {
  const { claims, status } = useAuth();
  const me = useCurrentUser();
  if (status === "loading" || (me.isLoading && !claims)) return undefined;
  return [...new Set([...claimList(claims, "roles"), ...(me.data?.data?.roles ?? [])])];
}

// UI gating only -- IAM still enforces every call with the role's permissions
// (view users, manage users, resend activation).
export function useUserAdminPermissions() {
  const roles = useMyRoles();
  const isAdmin = roles?.includes(ADMIN_ROLE);
  return { canView: isAdmin, canManage: isAdmin === true, canResend: isAdmin === true };
}
