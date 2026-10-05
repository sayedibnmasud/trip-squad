# Per-trip roles — design

Date: 2026-10-05 · Status: approved in conversation, pending spec review

## Goal

Replace Trip Squad's app-wide roles (Traveler / Trip Squad Admin) with roles that exist **per trip**, the way a social app treats a group: whoever creates a trip owns it and decides what everyone else in it may do. Anyone can sign up on their own; there is no app administrator.

Success looks like:

- A new person can create an account from the login page without an admin.
- The creator of a trip is its owner and can set each member's role.
- What a role allows is enforced by the Blocks Data Gateway wherever the platform allows it, not only hidden in the UI.
- The two existing accounts keep working, with no admin powers left.
- The work is committed, pushed, and deployed to the dev environment.

## Roles

| Role | Who | Can do |
|---|---|---|
| Owner | The trip's creator. Exactly one. | Everything: trip details, roles, adding/removing members, approving join requests, deleting the trip; plus all Editor rights. |
| Editor | Chosen by the owner | Edit the itinerary (add, change, delete days and their plans); moderate suggestions and expenses (edit/delete anyone's); plus all Contributor rights. |
| Contributor | Default for new members | Suggest places, vote, log expenses; edit/delete their own suggestions, votes and expenses. |
| Viewer | Chosen by the owner | See everything; change nothing. |

Trip details (name, dates, destination, address) are **owner-only**, a deliberate narrowing from the first draft: the Gateway protects whole records, so letting Editors edit the Trip record would also let them rewrite roles via the API.

## Data model

The owner is the trip's platform-managed `CreatedBy` (set by Blocks on insert, never editable), so no `ownerId` field is needed and ownership cannot be tampered with. Trip gains:

| Field | Type | Meaning |
|---|---|---|
| `editorIds` | String[] | Owner **plus** editors (the owner is always included, so one rule covers both) |
| `viewerIds` | String[] | Viewers |

`memberIds` stays as "everyone in the trip". Contributors are members not in `editorIds` or `viewerIds`. `memberNames` stays index-aligned with `memberIds`.

Suggestion, Vote, ItineraryDay and Expense each gain copies of the fields their rules need (the Gateway can only compare against fields on the row itself):

| Field | Type | Meaning |
|---|---|---|
| `editorIds` | String[] | Copy of the trip's `editorIds` |
| `tripOwnerId` | String | Copy of the trip's `CreatedBy` |

They keep `memberIds`. Whenever membership or roles change, the owner's client rewrites these copies on every child record (as `addMember` already does for `memberIds`).

## Access rules (Data Gateway)

Read is Custom on every schema; Create stays "any signed-in user" (the Gateway cannot check fields on insert); Edit and Delete are Custom:

| Schema | Read | Edit / Delete |
|---|---|---|
| Trip | `UserId IN memberIds` | `UserId = CreatedBy` |
| ItineraryDay | `UserId IN memberIds` | `UserId IN editorIds` |
| Suggestion | `UserId IN memberIds` | `UserId = CreatedBy` OR `UserId IN editorIds` |
| Expense | `UserId IN memberIds` | `UserId = CreatedBy` OR `UserId IN editorIds` |
| Vote | `UserId IN memberIds` | `UserId = CreatedBy` OR `UserId = tripOwnerId` |

Each row is one policy per operation, with an OR group where it has two rules (separate policies would not combine correctly; see the Data Gateway's `EvaluatePolicies`). The owner-on-votes rule exists so the owner can rewrite copied fields during membership changes.

The admin "read and delete any trip" rule is removed.

**Known limitation:** creation is not role-checked by the platform. A Viewer, or a signed-in non-member, could create records in a trip by calling the API directly. Non-members still cannot read the trip, and the UI only offers creation to Contributors and above. This is the platform gap already reported to SELISE (report `fc6884c9…`); a server-side workflow is the eventual fix.

## App changes

- **Roles helper** (pure, unit-tested): `roleOf(trip, userId)` → `owner | editor | contributor | viewer | none`, plus capability checks (`canEditTrip`, `canEditItinerary`, `canContribute`, `canModerate(row)`).
- **Create trip**: sets `editorIds = [me]`, `viewerIds = []` (the owner is `CreatedBy`). A trip without `editorIds` (created before this change) treats its creator as owner and editor.
- **Members tab**: lists members with their role; the owner gets a per-member role menu (Editor / Contributor / Viewer) and Remove. Changing a role or removing someone rewrites the trip and the child copies.
- **Join flow**: anyone in the trip can share the invite link; only the **owner** can approve a request (the approve page says so to non-owners).
- **Gating in tabs**: the itinerary editor and "Arrange days" show for Editors and the owner; suggest/vote/expense forms show for Contributors and above; delete/edit buttons follow `canModerate`. Viewers see read-only views.
- **Trip details**: the owner gets "Edit trip" (name, dates, destination, address) and "Delete trip" (removes the trip and its child records).
- **Removed**: the Users screen and its nav item, admin role gating, and the admin read/delete rule.

## Accounts

- Self sign-up on (`iam signup-settings`): email/password sign-up enabled, default role for new users = the `traveler` role, renamed to **Member** (it has no special meaning; IAM cannot leave a user with zero roles).
- Both existing accounts are set to `[traveler]` only. The admin account loses `tripsquad-admin`.
- The `tripsquad-admin` role is left defined but unassigned, with its permissions removed. The CLI has no role delete.
- The login page links to sign-up if the hosted login page doesn't already offer it once sign-up is enabled. To be verified.

## Existing trips

The existing trips are test data and will be deleted, not migrated. Because ownership is `CreatedBy`, they keep working under the new rules: their creator is their owner, and can delete them with **Delete trip**. Their child records lack the copied fields, so only each record's author can still edit it; Delete trip skips child records it isn't allowed to remove rather than failing. The CLI has no record-level data commands, so the deletion itself is done by the user in the app.

## Delivery

1. Commit to `main` (no AI attribution in commit messages, per the repo's `AGENTS.md`) and push to `origin` (`sayedibnmasud/trip-squad`, over SSH).
2. Create and push a `dev` branch. Blocks Release is linked to that repo and deploys `dev` to `https://dbcdsi-eoeuw.slsblx.com`.
3. Deploy with `blocks-release-deployment`, after checking how it expects the repo to be laid out (the app and its `Dockerfile` live in `web/`). Register the deployed callback URL on the OIDC client if Release assigns a different origin.

## Testing

- Unit: the roles helper (every role × every capability), and the propagation payload builder.
- Rules: read each policy back with `blocks data rules policy get` and compare it to the table above.
- Manual, with the two accounts:
  1. A creates a trip and B joins it as a Contributor. B can suggest, vote and log expenses, but cannot edit the itinerary or trip details.
  2. A makes B an Editor. B can now edit the itinerary.
  3. A makes B a Viewer. B sees everything read-only.
  4. A removes B. B can no longer open the trip.
  5. B creates their own trip. A cannot open it.

## Out of scope

Leaving a trip as a non-owner, transferring ownership, server-side creation checks, notifications about role changes.
