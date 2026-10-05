import { Copy, UserRound } from "lucide-react";
import { useState } from "react";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { ActionButton } from "../../shared/ui/ActionButton";
import { memberName } from "./tripsApi";
import type { Trip } from "./tripsApi";

export function MembersTab({ trip }: { trip: Trip }) {
  const { t } = useT();
  const inviteLink = `${window.location.origin}/join?trip=${encodeURIComponent(trip.ItemId)}&code=${encodeURIComponent(trip.inviteCode ?? "")}`;

  return (
    <div>
      <div className="panel">
        <div className="panel-title"><span>{t("members.invite")}</span></div>
        <p className="muted">{t("members.inviteHint")}</p>
        <CopyField value={inviteLink} />
      </div>
      <ul className="item-list">
        {trip.memberIds.map((id) => (
          <li key={id} className="panel member-row"><UserRound size={16} /> {memberName(trip, id)}</li>
        ))}
      </ul>
    </div>
  );
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
      <ActionButton type="button" icon={<Copy size={16} />} onClick={() => void copy()}>{copied ? t("common.copied") : t("common.copy")}</ActionButton>
    </div>
  );
}
