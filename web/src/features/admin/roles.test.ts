import { describe, expect, it } from "vitest";
import { appRoleOf, claimList, rolesOf } from "./roles";
import type { ManagedUser } from "./roles";

// Shape returned by `iam users list` for a freshly invited admin.
const invitedAdmin: ManagedUser = {
  itemId: "68a7b8ea-87b6-45b5-a00a-9c9edbf5c8a9",
  email: "admin@example.com",
  roles: { default: ["tripsquad-admin"] },
  active: false,
  isVerified: false,
  accountState: "PendingVerification"
};

describe("rolesOf", () => {
  it("reads the default organization's roles from the keyed list shape", () => {
    expect(rolesOf(invitedAdmin)).toEqual(["tripsquad-admin"]);
  });

  it("accepts a plain array too", () => {
    expect(rolesOf({ ...invitedAdmin, roles: ["traveler"] })).toEqual(["traveler"]);
  });

  it("returns nothing when roles are missing", () => {
    expect(rolesOf({ ...invitedAdmin, roles: undefined })).toEqual([]);
  });
});

describe("appRoleOf", () => {
  it("finds the app role among other roles", () => {
    expect(appRoleOf({ ...invitedAdmin, roles: { default: ["clouduser", "traveler"] } })).toBe("traveler");
    expect(appRoleOf(invitedAdmin)).toBe("tripsquad-admin");
  });

  it("is undefined for users with no app role", () => {
    expect(appRoleOf({ ...invitedAdmin, roles: { default: ["clouduser"] } })).toBeUndefined();
  });
});

describe("claimList", () => {
  it("reads role-derived permissions from the session claims array", () => {
    const claims = { sub: "u1", roles: ["tripsquad-admin"], permissions: ["blocks-iam::iam::users", "blocks-iam::iam::mutate-users"] };
    expect(claimList(claims, "permissions")).toContain("blocks-iam::iam::users");
    expect(claimList(claims, "roles")).toEqual(["tripsquad-admin"]);
  });

  it("accepts a single string claim and tolerates a missing one", () => {
    expect(claimList({ roles: "traveler" }, "roles")).toEqual(["traveler"]);
    expect(claimList({ sub: "u1" }, "permissions")).toEqual([]);
    expect(claimList(undefined, "permissions")).toEqual([]);
  });
});
