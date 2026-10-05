import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Copy, Crown, UserMinus } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Alert } from "../../shared/ui/Alert";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../shared/ui/dropdown-menu";
import { can, roleOf } from "./tripRoles";
import type { AssignableRole, TripRole } from "./tripRoles";
import { memberName, removeMember, setMemberRole } from "./tripsApi";
import type { Trip } from "./tripsApi";

const ASSIGNABLE: AssignableRole[] = ["editor", "contributor", "viewer"];
const ROLE_TONE = { owner: "food", editor: "activity", contributor: "place", viewer: "neutral", none: "neutral" } as const;

export function MembersTab({ me, trip }: { me: { id: string }; trip: Trip }) {
  const { t } = useT();
  const queryClient = useQueryClient();
  const myRole = roleOf(trip, me.id);
  const isOwner = can(myRole, "manageMembers");
  const [removing, setRemoving] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const inviteLink = `${window.location.origin}/join?trip=${encodeURIComponent(trip.ItemId)}&code=${encodeURIComponent(trip.inviteCode ?? "")}`;

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["trip", trip.ItemId] }),
    queryClient.invalidateQueries({ queryKey: ["trips"] })
  ]);

  const changeRole = useMutation({
    mutationFn: ({ role, userId }: { userId: string; role: AssignableRole }) => setMemberRole(trip, userId, role),
    onSuccess: async (result, { role, userId }) => {
      setNotice(`${memberName(trip, userId)}: ${t(`tripRole.${role}`)}${result.skipped ? ` ${t("members.partial")}` : ""}`);
      await refresh();
    }
  });
  const remove = useMutation({
    mutationFn: (userId: string) => removeMember(trip, userId),
    onSuccess: async () => {
      setRemoving(undefined);
      await refresh();
    }
  });

  return (
    <div>
      <div className="panel">
        <div className="panel-title"><span>{t("members.invite")}</span></div>
        <p className="muted">{isOwner ? t("members.inviteHint") : t("members.inviteHintMember")}</p>
        <CopyField value={inviteLink} />
      </div>

      {notice ? <Alert tone="info">{notice}</Alert> : null}
      {[changeRole.error, remove.error].filter(Boolean).map((err, index) => <Alert key={index} tone="error">{(err as Error).message}</Alert>)}

      <ul className="item-list">
        <AnimatePresence initial={false}>
          {trip.memberIds.map((id) => {
            const role = roleOf(trip, id);
            return (
              <motion.li key={id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="panel member-row">
                <span className="avatar avatar-sm">{initials(memberName(trip, id))}</span>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate">{memberName(trip, id)}{id === me.id ? ` (${t("members.you")})` : ""}</strong>
                  <span className="text-sm text-muted-foreground">{t(`tripRole.${role}.hint`)}</span>
                </div>
                {isOwner && role !== "owner" ? (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" disabled={changeRole.isPending}>{t(`tripRole.${role}`)} <ChevronDown size={14} /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[240px]">
                        {ASSIGNABLE.map((option) => (
                          <DropdownMenuItem key={option} onSelect={() => option !== role && changeRole.mutate({ userId: id, role: option })}>
                            <span className="grid flex-1 gap-0.5">
                              <span className="font-semibold">{t(`tripRole.${option}`)}</span>
                              <span className="text-xs text-muted-foreground">{t(`tripRole.${option}.hint`)}</span>
                            </span>
                            {option === role ? <Check size={16} /> : null}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="ghost" size="icon" aria-label={t("members.remove")} onClick={() => setRemoving(id)}><UserMinus size={18} /></Button>
                  </>
                ) : (
                  <RoleBadge role={role} />
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      {removing ? (
        <ConfirmDialog
          title={t("members.remove")}
          message={`${memberName(trip, removing)}: ${t("members.removeConfirm")}`}
          confirmLabel={t("members.remove")}
          busy={remove.isPending}
          onCancel={() => setRemoving(undefined)}
          onConfirm={() => remove.mutate(removing)}
        />
      ) : null}
    </div>
  );
}

export function RoleBadge({ role }: { role: TripRole }) {
  const { t } = useT();
  return <Badge tone={ROLE_TONE[role]}>{role === "owner" ? <Crown size={12} /> : null}{t(`tripRole.${role}`)}</Badge>;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function CopyField({ value }: { value: string }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="copy-field">
      <input readOnly value={value} onFocus={(event) => event.target.select()} />
      <Button type="button" onClick={() => void copy()}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? t("common.copied") : t("common.copy")}</Button>
    </div>
  );
}
