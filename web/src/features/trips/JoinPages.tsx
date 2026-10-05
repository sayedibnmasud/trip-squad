import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { ActionButton } from "../../shared/ui/ActionButton";
import { Alert } from "../../shared/ui/Alert";
import { PageHeader } from "../../shared/ui/PageHeader";
import { CopyField } from "./MembersTab";
import { addMember, getTrip } from "./tripsApi";
import { useMe } from "./useMe";

// Joining is a two-link handshake that stays inside the row-level policies:
// a non-member cannot read or edit a trip, so the invitee sends a request
// link back, and an existing member (who can edit) adds them.

export function JoinPage({ onNavigate, search }: { onNavigate: (path: string) => void; search: string }) {
  const { t } = useT();
  const me = useMe();
  const params = new URLSearchParams(search);
  const tripId = params.get("trip") ?? "";
  const code = params.get("code") ?? "";
  // Succeeds only if the read policy already admits this user.
  const membership = useQuery({ enabled: Boolean(tripId), queryKey: ["trip", tripId], queryFn: () => getTrip(tripId) });

  if (!tripId || !code) return <Alert tone="error">{t("join.invalid")}</Alert>;

  const requestLink = me
    ? `${window.location.origin}/approve?${new URLSearchParams({ trip: tripId, code, user: me.id, name: me.name })}`
    : "";

  return (
    <section>
      <PageHeader title={t("join.title")} subtitle="" />
      {membership.data ? (
        <div className="panel">
          <p>{t("join.already")}</p>
          <div><ActionButton onClick={() => onNavigate(`/trips/${tripId}`)}>{t("join.open")}</ActionButton></div>
        </div>
      ) : (
        <div className="panel">
          <p className="muted">{t("join.hint")}</p>
          {requestLink ? <CopyField value={requestLink} /> : <p className="muted">{t("common.loading")}</p>}
        </div>
      )}
    </section>
  );
}

export function ApprovePage({ onNavigate, search }: { onNavigate: (path: string) => void; search: string }) {
  const { t } = useT();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(search);
  const tripId = params.get("trip") ?? "";
  const code = params.get("code") ?? "";
  const user = params.get("user") ?? "";
  const name = params.get("name") || user;
  const trip = useQuery({ enabled: Boolean(tripId), queryKey: ["trip", tripId], queryFn: () => getTrip(tripId) });

  const approve = useMutation({
    mutationFn: () => addMember(trip.data!, { id: user, name }),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] }),
      queryClient.invalidateQueries({ queryKey: ["trips"] })
    ])
  });

  if (!tripId || !code || !user) return <Alert tone="error">{t("join.invalid")}</Alert>;
  if (trip.isLoading) return <p className="muted">{t("common.loading")}</p>;
  if (!trip.data) return <Alert tone="error">{t("trip.notFound")}</Alert>;

  const codeMatches = trip.data.inviteCode === code;
  const alreadyMember = trip.data.memberIds.includes(user);

  return (
    <section>
      <PageHeader title={t("approve.title")} subtitle={trip.data.name} />
      <div className="panel">
        <p><strong>{name}</strong></p>
        {!codeMatches ? <Alert tone="error">{t("approve.badCode")}</Alert> : null}
        {alreadyMember || approve.isSuccess ? <Alert tone="info">{t("approve.done")}</Alert> : null}
        {approve.isError ? <Alert tone="error">{(approve.error as Error).message}</Alert> : null}
        <div className="form-actions">
          {alreadyMember || approve.isSuccess ? (
            <ActionButton onClick={() => onNavigate(`/trips/${tripId}`)}>{t("join.open")}</ActionButton>
          ) : (
            <ActionButton icon={<UserPlus size={16} />} disabled={!codeMatches || approve.isPending} onClick={() => approve.mutate()}>{t("approve.confirm")}</ActionButton>
          )}
        </div>
      </div>
    </section>
  );
}
