import { useCurrentUser, userDisplayName } from "../profile/useCurrentUser";

// The signed-in user's IAM id is what the Data Gateway policies compare
// against memberIds (AUTH UserId), so it is the id stored on every record.
export function useMe(): { id: string; name: string } | undefined {
  const me = useCurrentUser();
  const profile = me.data?.data;
  if (!profile?.itemId) return undefined;
  return { id: profile.itemId, name: userDisplayName(profile) || profile.itemId };
}
