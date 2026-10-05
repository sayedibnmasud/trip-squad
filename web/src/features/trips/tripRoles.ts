// Per-trip roles (docs/superpowers/specs/2026-10-05-trip-roles-design.md).
// The owner is the trip's CreatedBy; editorIds always includes the owner;
// contributors are members who are neither editors nor viewers.
//
// These checks decide what the UI offers. The Data Gateway rules enforce the
// same table for edits and deletes (see scripts/build-data-rules.mjs).

export type TripRole = "owner" | "editor" | "contributor" | "viewer" | "none";
export type Ability = "editTrip" | "manageMembers" | "editItinerary" | "contribute" | "moderate";
export type AssignableRole = Exclude<TripRole, "owner" | "none">;

type RoleFields = {
  CreatedBy?: string;
  memberIds: string[];
  memberNames?: string[];
  editorIds?: string[] | null;
  viewerIds?: string[] | null;
};

const ABILITIES: Record<TripRole, Ability[]> = {
  owner: ["editTrip", "manageMembers", "editItinerary", "contribute", "moderate"],
  editor: ["editItinerary", "contribute", "moderate"],
  contributor: ["contribute"],
  viewer: [],
  none: []
};

export function roleOf(trip: RoleFields, userId: string | undefined): TripRole {
  if (!userId || !trip.memberIds.includes(userId)) return "none";
  if (trip.CreatedBy === userId) return "owner";
  if (trip.editorIds?.includes(userId)) return "editor";
  if (trip.viewerIds?.includes(userId)) return "viewer";
  return "contributor";
}

export function can(role: TripRole, ability: Ability): boolean {
  return ABILITIES[role].includes(ability);
}

// Whether `userId` may edit or delete a suggestion or expense: its author, or
// anyone who can moderate.
export function canChange(role: TripRole, row: { CreatedBy?: string }, userId: string | undefined): boolean {
  return can(role, "moderate") || (Boolean(userId) && row.CreatedBy === userId && can(role, "contribute"));
}

function editorsWithOwner(trip: RoleFields): string[] {
  const editors = trip.editorIds ?? [];
  return trip.CreatedBy && !editors.includes(trip.CreatedBy) ? [trip.CreatedBy, ...editors] : editors;
}

// New role lists for the trip after giving `userId` a role.
export function withRole(trip: RoleFields, userId: string, role: AssignableRole): { editorIds: string[]; viewerIds: string[] } {
  if (userId === trip.CreatedBy) throw new Error("The owner's role can't be changed.");
  const editorIds = editorsWithOwner(trip).filter((id) => id !== userId);
  const viewerIds = (trip.viewerIds ?? []).filter((id) => id !== userId);
  if (role === "editor") editorIds.push(userId);
  if (role === "viewer") viewerIds.push(userId);
  return { editorIds, viewerIds };
}

// New membership lists for the trip after removing `userId`.
export function withoutMember(trip: RoleFields, userId: string) {
  if (userId === trip.CreatedBy) throw new Error("The owner can't be removed from their own trip.");
  const keep = trip.memberIds.map((id, index) => ({ id, name: trip.memberNames?.[index] ?? "" })).filter((member) => member.id !== userId);
  return {
    memberIds: keep.map((member) => member.id),
    memberNames: keep.map((member) => member.name),
    editorIds: editorsWithOwner(trip).filter((id) => id !== userId),
    viewerIds: (trip.viewerIds ?? []).filter((id) => id !== userId)
  };
}

// The fields every child record copies from its trip, for the Gateway rules.
export function membershipUpdate(trip: RoleFields): { memberIds: string[]; editorIds: string[]; tripOwnerId: string } {
  return { memberIds: trip.memberIds, editorIds: editorsWithOwner(trip), tripOwnerId: trip.CreatedBy ?? "" };
}
