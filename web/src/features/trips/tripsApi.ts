import { blocksClient } from "../../lib/blocks/client";

// Every record below carries the trip's memberIds: the Data Gateway policies
// ("UserId IN memberIds", see blocks/data/rules.json) can only compare against
// fields on the row itself, so child records keep their own copy.
type Row = { ItemId: string; CreatedBy?: string; CreatedDate?: string };

export type Trip = Row & {
  name: string;
  destination: string;
  destinationLat?: number | null;
  destinationLng?: number | null;
  address?: string | null;
  startDate?: string;
  endDate?: string;
  memberIds: string[];
  memberNames?: string[];
  inviteCode?: string;
};

export type SuggestionType = "place" | "food" | "activity";
export type Suggestion = Row & { tripId: string; title: string; type: SuggestionType; notes?: string; memberIds: string[] };
export type Vote = Row & { tripId: string; suggestionId: string; value: number; memberIds: string[] };
export type ItineraryDay = Row & { tripId: string; date: string; items: string[]; memberIds: string[] };
export type Expense = Row & {
  tripId: string;
  description: string;
  amount: number;
  currency: string;
  paidBy: string;
  splitBetween: string[];
  memberIds: string[];
};

const SYSTEM_FIELDS = ["CreatedBy", "CreatedDate"];

const trips = blocksClient.data.collection<Trip>("Trip", {
  fields: [...SYSTEM_FIELDS, "name", "destination", "destinationLat", "destinationLng", "address", "startDate", "endDate", "memberIds", "memberNames", "inviteCode"]
});
const suggestions = blocksClient.data.collection<Suggestion>("Suggestion", {
  fields: [...SYSTEM_FIELDS, "tripId", "title", "type", "notes", "memberIds"]
});
const votes = blocksClient.data.collection<Vote>("Vote", {
  fields: [...SYSTEM_FIELDS, "tripId", "suggestionId", "value", "memberIds"]
});
const itineraryDays = blocksClient.data.collection<ItineraryDay>("ItineraryDay", {
  fields: [...SYSTEM_FIELDS, "tripId", "date", "items", "memberIds"]
});
const expenses = blocksClient.data.collection<Expense>("Expense", {
  fields: [...SYSTEM_FIELDS, "tripId", "description", "amount", "currency", "paidBy", "splitBetween", "memberIds"]
});

type Collection<T> = ReturnType<typeof blocksClient.data.collection<T>>;
type Page<T> = { items: T[]; hasNextPage: boolean };

const PAGE_SIZE = 100;

// The gateway answers HTTP 200 even when GraphQL fails, so an `errors` array
// is the real failure signal.
function unwrap<T>(response: unknown, field: string): T {
  const record = response as { data?: Record<string, unknown>; errors?: { message?: string }[] };
  if (record?.errors?.length) throw new Error(record.errors.map((error) => error.message).join("; "));
  const value = record?.data?.[field] ?? (record as Record<string, unknown>)?.[field];
  if (value === undefined) throw new Error(`Unexpected Data Gateway response for ${field}.`);
  return value as T;
}

function ensureAcknowledged(response: unknown, field: string): string | undefined {
  const result = unwrap<{ acknowledged?: boolean; itemId?: string; message?: string }>(response, field);
  if (result.acknowledged === false) throw new Error(result.message || `${field} was not applied.`);
  return result.itemId;
}

async function listAll<T>(collection: Collection<T>, schemaName: string, filter: Record<string, unknown>): Promise<T[]> {
  const items: T[] = [];
  for (let pageNo = 1; ; pageNo++) {
    const page = unwrap<Page<T>>(await collection.list({ filter, pageNo, pageSize: PAGE_SIZE }), `get${schemaName}s`);
    items.push(...page.items);
    if (!page.hasNextPage || page.items.length === 0) return items;
  }
}

function inviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// ---- Trips ----

// No filter needed: the read policy already limits results to trips the
// signed-in user is a member of.
export function listMyTrips(): Promise<Trip[]> {
  return listAll(trips, "Trip", {});
}

export async function getTrip(tripId: string): Promise<Trip | undefined> {
  const page = unwrap<Page<Trip>>(await trips.get(tripId), "getTrips");
  return page.items[0];
}

export type NewTrip = { name: string; destination: string; destinationLat?: number; destinationLng?: number; address?: string; startDate: string; endDate: string };

export async function createTrip(input: NewTrip, me: { id: string; name: string }) {
  return ensureAcknowledged(await trips.create({
    ...input,
    memberIds: [me.id],
    memberNames: [me.name],
    inviteCode: inviteCode()
  }), "insertTrip");
}

// Adds a member to the trip and copies the new member list onto every child
// record, so the read/edit policies on those rows admit them too. Runs as an
// existing member, who is allowed to edit all of them.
export async function addMember(trip: Trip, member: { id: string; name: string }) {
  if (trip.memberIds.includes(member.id)) return;
  const memberIds = [...trip.memberIds, member.id];
  const memberNames = [...alignedNames(trip), member.name];
  ensureAcknowledged(await trips.update(trip.ItemId, { memberIds, memberNames }), "updateTrip");

  type Child = { ItemId: string; memberIds: string[] };
  const children: [Collection<Child>, string][] = [
    [suggestions, "Suggestion"],
    [votes, "Vote"],
    [itineraryDays, "ItineraryDay"],
    [expenses, "Expense"]
  ];
  for (const [collection, schemaName] of children) {
    const rows = await listAll(collection, schemaName, { tripId: trip.ItemId });
    for (const row of rows) {
      ensureAcknowledged(await collection.update(row.ItemId, { memberIds }), `update${schemaName}`);
    }
  }
}

export function alignedNames(trip: Trip): string[] {
  return trip.memberIds.map((_, index) => trip.memberNames?.[index] ?? "");
}

export function memberName(trip: Trip, userId: string): string {
  const index = trip.memberIds.indexOf(userId);
  return (index >= 0 ? trip.memberNames?.[index] : undefined) || `${userId.slice(0, 8)}…`;
}

// ---- Suggestions & votes ----

export function listSuggestions(tripId: string) {
  return listAll(suggestions, "Suggestion", { tripId });
}

export async function addSuggestion(trip: Trip, input: { title: string; type: SuggestionType; notes: string }) {
  return ensureAcknowledged(await suggestions.create({ ...input, tripId: trip.ItemId, memberIds: trip.memberIds }), "insertSuggestion");
}

export async function deleteSuggestion(suggestionId: string) {
  return ensureAcknowledged(await suggestions.delete(suggestionId), "deleteSuggestion");
}

export function listVotes(tripId: string) {
  return listAll(votes, "Vote", { tripId });
}

// One vote per user per suggestion, kept by the app: voting again the same
// way withdraws the vote, voting the other way flips it.
export async function castVote(trip: Trip, suggestionId: string, value: 1 | -1, existing: Vote | undefined) {
  if (existing && existing.value === value) {
    return ensureAcknowledged(await votes.delete(existing.ItemId), "deleteVote");
  }
  if (existing) {
    return ensureAcknowledged(await votes.update(existing.ItemId, { value }), "updateVote");
  }
  return ensureAcknowledged(await votes.create({ tripId: trip.ItemId, suggestionId, value, memberIds: trip.memberIds }), "insertVote");
}

// ---- Itinerary ----

export function listItinerary(tripId: string) {
  return listAll(itineraryDays, "ItineraryDay", { tripId });
}

export async function saveItineraryDay(trip: Trip, date: string, items: string[], existing: ItineraryDay | undefined) {
  if (existing) {
    return ensureAcknowledged(await itineraryDays.update(existing.ItemId, { items }), "updateItineraryDay");
  }
  return ensureAcknowledged(await itineraryDays.create({ tripId: trip.ItemId, date, items, memberIds: trip.memberIds }), "insertItineraryDay");
}

// ---- Expenses ----

export function listExpenses(tripId: string) {
  return listAll(expenses, "Expense", { tripId });
}

export async function addExpense(trip: Trip, input: { description: string; amount: number; currency: string; paidBy: string; splitBetween: string[] }) {
  return ensureAcknowledged(await expenses.create({ ...input, tripId: trip.ItemId, memberIds: trip.memberIds }), "insertExpense");
}

export async function deleteExpense(expenseId: string) {
  return ensureAcknowledged(await expenses.delete(expenseId), "deleteExpense");
}
