import { blocksClient } from "../../lib/blocks/client";
import { blocksConfig } from "../../lib/blocks/config";
import { APP_ROLES, rolesOf } from "./roles";
import type { AppRole, ManagedUser } from "./roles";

export { APP_ROLES, MANAGE_USERS_PERMISSION, RESEND_ACTIVATION_PERMISSION, VIEW_USERS_PERMISSION, appRoleOf, displayName, rolesOf } from "./roles";
export type { AppRole, ManagedUser } from "./roles";

export type UserPage = { users: ManagedUser[]; totalCount: number };

// IAM answers 200 with isSuccess:false / errors for rejected commands.
function ensureSuccess(response: unknown, action: string): void {
  const record = response as { isSuccess?: boolean; errors?: unknown; message?: string } | undefined;
  const errors = record?.errors;
  const hasErrors = Array.isArray(errors) ? errors.length > 0 : errors && typeof errors === "object" ? Object.keys(errors).length > 0 : Boolean(errors);
  if (record?.isSuccess === false || hasErrors) {
    const detail = hasErrors ? JSON.stringify(errors) : record?.message;
    throw new Error(`${action} failed${detail ? `: ${detail}` : "."}`);
  }
}

// The users list is a POST-read with zero-based `page` (not pageNo).
export async function listUsers({ page, pageSize, search }: { page: number; pageSize: number; search: string }): Promise<UserPage> {
  const term = search.trim();
  const response = await blocksClient.iam.users.list({
    page,
    pageSize,
    sort: { property: "CreatedDate", isDescending: true },
    filter: term ? (term.includes("@") ? { email: term } : { name: term }) : {}
  });
  ensureSuccess(response, "Loading users");
  return { users: (response.data ?? []) as ManagedUser[], totalCount: response.totalCount ?? 0 };
}

export async function emailAvailable(email: string): Promise<boolean> {
  const response = await blocksClient.iam.users.emailAvailable({ email: email.trim() });
  return Boolean(response.isAvailable ?? response.IsAvailable);
}

// No password: the person sets their own through the activation email.
// ClientId/RedirectUri let that email link back to this app.
export async function inviteUser(input: { email: string; firstName: string; lastName: string; role: AppRole }) {
  ensureSuccess(await blocksClient.iam.users.create({
    email: input.email.trim(),
    firstName: input.firstName.trim() || undefined,
    lastName: input.lastName.trim() || undefined,
    roles: [input.role],
    clientId: blocksConfig.oidcClientId,
    redirectUri: `${window.location.origin}/login/callback`
  }), "Inviting user");
}

// /users/access replaces the whole role list, so keep any non-app roles.
export async function setAppRole(user: ManagedUser, role: AppRole) {
  const keep = rolesOf(user).filter((slug) => !(APP_ROLES as readonly string[]).includes(slug));
  ensureSuccess(await blocksClient.iam.users.updateAccess({ userId: user.itemId, roles: [...keep, role] }), "Changing role");
}

export async function deactivateUser(user: ManagedUser) {
  ensureSuccess(await blocksClient.iam.users.deactivate({ userId: user.itemId }), "Deactivating user");
}

export async function activateUser(user: ManagedUser, reason: string) {
  ensureSuccess(await blocksClient.iam.users.activate({ userId: user.itemId, reason }), "Reactivating user");
}

export async function resendActivation(user: ManagedUser) {
  ensureSuccess(await blocksClient.auth.resendActivation({ userId: user.itemId }), "Resending activation");
}
