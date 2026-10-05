import { describe, expect, it } from "vitest";
import { can, membershipUpdate, roleOf, withRole, withoutMember } from "./tripRoles";

const trip = {
  CreatedBy: "owner",
  memberIds: ["owner", "ed", "con", "view"],
  memberNames: ["Olivia", "Ed", "Con", "Vee"],
  editorIds: ["owner", "ed"],
  viewerIds: ["view"]
};

describe("roleOf", () => {
  it("resolves each member's role", () => {
    expect(roleOf(trip, "owner")).toBe("owner");
    expect(roleOf(trip, "ed")).toBe("editor");
    expect(roleOf(trip, "con")).toBe("contributor");
    expect(roleOf(trip, "view")).toBe("viewer");
    expect(roleOf(trip, "stranger")).toBe("none");
  });

  it("treats the creator of a trip from before roles existed as its owner", () => {
    const legacy = { CreatedBy: "owner", memberIds: ["owner", "friend"] };
    expect(roleOf(legacy, "owner")).toBe("owner");
    expect(roleOf(legacy, "friend")).toBe("contributor");
  });
});

describe("can", () => {
  it("matches the role table", () => {
    const table = {
      owner: { editTrip: true, manageMembers: true, editItinerary: true, contribute: true, moderate: true },
      editor: { editTrip: false, manageMembers: false, editItinerary: true, contribute: true, moderate: true },
      contributor: { editTrip: false, manageMembers: false, editItinerary: false, contribute: true, moderate: false },
      viewer: { editTrip: false, manageMembers: false, editItinerary: false, contribute: false, moderate: false },
      none: { editTrip: false, manageMembers: false, editItinerary: false, contribute: false, moderate: false }
    } as const;
    for (const [role, abilities] of Object.entries(table)) {
      for (const [ability, expected] of Object.entries(abilities)) {
        expect(can(role as keyof typeof table, ability as keyof typeof abilities), `${role} ${ability}`).toBe(expected);
      }
    }
  });
});

describe("role changes", () => {
  it("promotes a contributor to editor", () => {
    expect(withRole(trip, "con", "editor")).toMatchObject({ editorIds: ["owner", "ed", "con"], viewerIds: ["view"] });
  });

  it("moves an editor to viewer", () => {
    expect(withRole(trip, "ed", "viewer")).toMatchObject({ editorIds: ["owner"], viewerIds: ["view", "ed"] });
  });

  it("returns a viewer to contributor", () => {
    expect(withRole(trip, "view", "contributor")).toMatchObject({ editorIds: ["owner", "ed"], viewerIds: [] });
  });

  it("never changes the owner's role", () => {
    expect(() => withRole(trip, "owner", "viewer")).toThrow();
  });

  it("removes a member everywhere, keeping names aligned", () => {
    expect(withoutMember(trip, "ed")).toEqual({
      memberIds: ["owner", "con", "view"],
      memberNames: ["Olivia", "Con", "Vee"],
      editorIds: ["owner"],
      viewerIds: ["view"]
    });
  });

  it("refuses to remove the owner", () => {
    expect(() => withoutMember(trip, "owner")).toThrow();
  });
});

describe("membershipUpdate", () => {
  it("is what every child record needs copied", () => {
    expect(membershipUpdate(trip)).toEqual({ memberIds: trip.memberIds, editorIds: ["owner", "ed"], tripOwnerId: "owner" });
  });

  it("always counts the owner as an editor", () => {
    expect(membershipUpdate({ CreatedBy: "owner", memberIds: ["owner"] }).editorIds).toEqual(["owner"]);
  });
});
