import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MailPlus, Search, ShieldAlert, UserPlus } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { ActionButton } from "../../shared/ui/ActionButton";
import { Alert } from "../../shared/ui/Alert";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { DataTable } from "../../shared/ui/DataTable";
import type { Column } from "../../shared/ui/DataTable";
import { EmptyState } from "../../shared/ui/EmptyState";
import { FormField } from "../../shared/ui/FormField";
import { Modal } from "../../shared/ui/Modal";
import { PageHeader } from "../../shared/ui/PageHeader";
import { StatusPill } from "../../shared/ui/StatusPill";
import { useMe } from "../trips/useMe";
import { useUserAdminPermissions } from "./usePermission";
import {
  activateUser,
  appRoleOf,
  APP_ROLES,
  deactivateUser,
  displayName,
  emailAvailable,
  inviteUser,
  listUsers,
  resendActivation,
  setAppRole
} from "./usersApi";
import type { AppRole, ManagedUser } from "./usersApi";

const PAGE_SIZE = 20;

// A pending change is only sent after the admin confirms this exact action.
type Pending =
  | { kind: "role"; user: ManagedUser; role: AppRole }
  | { kind: "deactivate"; user: ManagedUser }
  | { kind: "activate"; user: ManagedUser }
  | { kind: "resend"; user: ManagedUser };

export function UsersPage() {
  const { t } = useT();
  const me = useMe();
  const { canManage, canResend, canView } = useUserAdminPermissions();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [inviting, setInviting] = useState(false);
  const [pending, setPending] = useState<Pending | undefined>();
  const [notice, setNotice] = useState<string | undefined>();

  const users = useQuery({
    enabled: canView === true,
    queryKey: ["admin", "users", page, appliedSearch],
    queryFn: () => listUsers({ page, pageSize: PAGE_SIZE, search: appliedSearch })
  });

  const apply = useMutation({
    mutationFn: async (change: Pending) => {
      if (change.kind === "role") await setAppRole(change.user, change.role);
      if (change.kind === "deactivate") await deactivateUser(change.user);
      if (change.kind === "activate") await activateUser(change.user, "Reactivated from the Trip Squad users screen");
      if (change.kind === "resend") await resendActivation(change.user);
      return change;
    },
    onSuccess: async (change) => {
      setPending(undefined);
      setNotice(change.kind === "resend" ? t("users.resent") : t("users.saved"));
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    }
  });

  if (canView === undefined) return <p className="muted">{t("common.loading")}</p>;
  if (!canView) {
    return <EmptyState icon={<ShieldAlert size={28} />} title={t("users.forbidden")} description={t("users.forbiddenHint")} />;
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setPage(0);
    setAppliedSearch(search);
  }

  const columns: Column<ManagedUser>[] = [
    {
      key: "name",
      header: t("users.name"),
      render: (user) => (
        <div className="user-cell">
          <strong>{displayName(user)}</strong>
          <span className="muted">{user.email}</span>
        </div>
      )
    },
    {
      key: "role",
      header: t("users.role"),
      render: (user) => {
        const current = appRoleOf(user);
        const isSelf = user.itemId === me?.id;
        return (
          <label className="form-field compact">
            <span className="sr-only">{t("users.role")}</span>
            <select
              value={current ?? ""}
              disabled={!canManage || isSelf || apply.isPending}
              title={isSelf ? t("users.selfLocked") : undefined}
              onChange={(event) => setPending({ kind: "role", user, role: event.target.value as AppRole })}
            >
              {current ? null : <option value="">{t("users.noRole")}</option>}
              {APP_ROLES.map((slug) => <option key={slug} value={slug}>{t(`role.${slug}`)}</option>)}
            </select>
          </label>
        );
      }
    },
    {
      key: "status",
      header: t("users.status"),
      render: (user) => <StatusPill tone={statusTone(user)}>{statusLabel(user, t)}</StatusPill>
    },
    {
      key: "lastLogin",
      header: t("users.lastLogin"),
      render: (user) => <span className="muted">{user.lastLoggedInTime ? new Date(user.lastLoggedInTime).toLocaleString() : t("users.never")}</span>
    },
    {
      key: "actions",
      header: "",
      render: (user) => {
        const isSelf = user.itemId === me?.id;
        return (
          <div className="row-actions">
            {canResend && user.accountState === "PendingVerification" ? (
              <button className="link-button" disabled={apply.isPending} onClick={() => setPending({ kind: "resend", user })}>
                <MailPlus size={14} /> {t("users.resend")}
              </button>
            ) : null}
            {canManage && !isSelf ? (
              user.accountState === "Deactivated" || user.accountState === "Suspended" ? (
                <button className="link-button" disabled={apply.isPending} onClick={() => setPending({ kind: "activate", user })}>{t("users.activate")}</button>
              ) : (
                <button className="link-button danger-link" disabled={apply.isPending} onClick={() => setPending({ kind: "deactivate", user })}>{t("users.deactivate")}</button>
              )
            ) : null}
          </div>
        );
      }
    }
  ];

  const totalPages = Math.max(1, Math.ceil((users.data?.totalCount ?? 0) / PAGE_SIZE));

  return (
    <section>
      <PageHeader
        title={t("users.title")}
        subtitle={t("users.subtitle")}
        actions={canManage ? <ActionButton icon={<UserPlus size={16} />} onClick={() => setInviting(true)}>{t("users.invite")}</ActionButton> : null}
      />

      <form className="toolbar" onSubmit={submitSearch}>
        <label className="search-box">
          <Search size={16} />
          <input placeholder={t("users.search")} value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
      </form>

      {notice ? <Alert tone="info">{notice}</Alert> : null}
      {users.isError ? <Alert tone="error">{(users.error as Error).message}</Alert> : null}

      {users.isLoading ? <p className="muted">{t("common.loading")}</p> : users.data?.users.length ? (
        <>
          <DataTable columns={columns} rows={users.data.users} />
          <div className="pagination">
            <span className="pagination-count">{users.data.totalCount} {t("users.total")}</span>
            <div className="pagination-controls">
              <button className="icon-button" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</button>
              <span>{page + 1} / {totalPages}</span>
              <button className="icon-button" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>›</button>
            </div>
          </div>
        </>
      ) : users.isSuccess ? (
        <EmptyState title={t("users.empty")} description={appliedSearch ? t("users.emptySearch") : t("users.emptyHint")} />
      ) : null}

      {inviting ? <InviteModal onClose={() => setInviting(false)} onInvited={(email) => { setInviting(false); setNotice(`${t("users.invited")} ${email}`); }} /> : null}

      {pending ? (
        <ConfirmDialog
          title={confirmTitle(pending, t)}
          message={`${confirmMessage(pending, t)}${apply.isError ? `\n\n${(apply.error as Error).message}` : ""}`}
          confirmLabel={confirmTitle(pending, t)}
          danger={pending.kind === "deactivate"}
          busy={apply.isPending}
          onCancel={() => { apply.reset(); setPending(undefined); }}
          onConfirm={() => apply.mutate(pending)}
        />
      ) : null}
    </section>
  );
}

function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: (email: string) => void }) {
  const { t } = useT();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<{ email: string; firstName: string; lastName: string; role: AppRole }>({ email: "", firstName: "", lastName: "", role: "traveler" });
  const [confirming, setConfirming] = useState(false);

  const invite = useMutation({
    mutationFn: async () => {
      if (!(await emailAvailable(form.email))) throw new Error(t("users.emailTaken"));
      await inviteUser(form);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      onInvited(form.email.trim());
    },
    onError: () => setConfirming(false)
  });

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  function submit(event: FormEvent) {
    event.preventDefault();
    if (valid) setConfirming(true);
  }

  if (confirming) {
    return (
      <ConfirmDialog
        title={t("users.invite")}
        message={`${t("users.inviteConfirm")} ${form.email.trim()} · ${t(`role.${form.role}`)}`}
        confirmLabel={t("users.sendInvite")}
        danger={false}
        busy={invite.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => invite.mutate()}
      />
    );
  }

  return (
    <Modal title={t("users.invite")} onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <FormField label={t("users.email")} required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <FormField label={t("users.firstName")} value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
        <FormField label={t("users.lastName")} value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
        <label className="form-field">
          <span>{t("users.role")}</span>
          <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as AppRole })}>
            {APP_ROLES.map((slug) => <option key={slug} value={slug}>{t(`role.${slug}`)}</option>)}
          </select>
        </label>
        <p className="muted form-note">{t("users.inviteHint")}</p>
        {invite.isError ? <Alert tone="error">{(invite.error as Error).message}</Alert> : null}
        <div className="form-actions">
          <button type="button" className="icon-button" onClick={onClose}>{t("common.cancel")}</button>
          <ActionButton type="submit" disabled={!valid}>{t("users.sendInvite")}</ActionButton>
        </div>
      </form>
    </Modal>
  );
}

type Translate = ReturnType<typeof useT>["t"];

// accountState is IAM's own resolution of active/status/isVerified; an invited
// user is active:false until they activate, so `active` alone is misleading.
function statusTone(user: ManagedUser): "good" | "warn" | "neutral" {
  if (user.accountState === "Active") return "good";
  return user.accountState === "PendingVerification" ? "warn" : "neutral";
}

function statusLabel(user: ManagedUser, t: Translate): string {
  if (user.accountState === "Active") return t("users.status.active");
  if (user.accountState === "PendingVerification") return t("users.status.pending");
  return t("users.status.inactive");
}

function confirmTitle(pending: Pending, t: Translate): string {
  return {
    role: t("users.changeRole"),
    deactivate: t("users.deactivate"),
    activate: t("users.activate"),
    resend: t("users.resend")
  }[pending.kind];
}

function confirmMessage(pending: Pending, t: Translate): string {
  const who = `${displayName(pending.user)} (${pending.user.email})`;
  switch (pending.kind) {
    case "role": {
      const from = appRoleOf(pending.user);
      return `${who}: ${from ? t(`role.${from}`) : t("users.noRole")} → ${t(`role.${pending.role}`)}. ${t("users.roleConfirm")}`;
    }
    case "deactivate":
      return `${who}. ${t("users.deactivateConfirm")}`;
    case "activate":
      return `${who}. ${t("users.activateConfirm")}`;
    case "resend":
      return `${who}. ${t("users.resendConfirm")}`;
  }
}
