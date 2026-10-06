import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CircleCheck } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "../../components/ui/button";
import { Input, Label } from "../../components/ui/input";
import { activateAccount, resetPassword } from "../../lib/blocks/auth";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Alert } from "../../shared/ui/Alert";
import { AuthLayout } from "./AuthLayout";

// Where the emailed IAM links land: "activate" finishes a new account from
// the sign-up email, "reset" finishes a forgot-password request. Both carry
// a one-time code and end with the person choosing a password here.
export function SetPasswordPage({ code, mode, onNavigate }: { code: string; mode: "activate" | "reset"; onNavigate: (path: string) => void }) {
  const { t } = useT();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const save = useMutation({
    mutationFn: () => (mode === "activate" ? activateAccount(code, form.password) : resetPassword(code, form.password))
  });
  // IAM enforces the real password policy; the length check only saves a
  // round trip for the obvious case. Confirm is UI-only and never sent.
  const mismatch = form.confirm.length > 0 && form.password !== form.confirm;
  const valid = form.password.length >= 8 && form.password === form.confirm;
  const keys = mode === "activate"
    ? { title: "activate.title", subtitle: "activate.subtitle", submit: "activate.submit", done: "activate.done" } as const
    : { title: "reset.title", subtitle: "reset.subtitle", submit: "reset.submit", done: "reset.done" } as const;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (valid) save.mutate();
  }

  return (
    <AuthLayout>
      {!code ? (
        <div className="auth-card">
          <h2>{t(keys.title)}</h2>
          <Alert tone="error">{t("setPassword.badLink")}</Alert>
          <Button variant="outline" onClick={() => onNavigate(mode === "reset" ? "/forgot-password" : "/login")}>
            {mode === "reset" ? t("forgot.title") : t("auth.back")}
          </Button>
        </div>
      ) : save.isSuccess ? (
        <motion.div className="auth-card" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
          <span className="grid h-14 w-14 place-items-center rounded-full bg-accent"><CircleCheck size={26} /></span>
          <h2>{t(keys.done)}</h2>
          <p>{t("setPassword.signInNow")}</p>
          <Button onClick={() => onNavigate("/login")}>{t("auth.continue")}</Button>
        </motion.div>
      ) : (
        <form className="auth-card" onSubmit={submit}>
          <h2>{t(keys.title)}</h2>
          <p>{t(keys.subtitle)}</p>
          <div className="grid gap-1.5">
            <Label htmlFor="set-password">{t("setPassword.new")}</Label>
            <Input id="set-password" type="password" autoComplete="new-password" autoFocus required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            <span className="text-xs text-muted-foreground">{t("setPassword.rule")}</span>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="set-confirm">{t("setPassword.confirm")}</Label>
            <Input id="set-confirm" type="password" autoComplete="new-password" required value={form.confirm} onChange={(event) => setForm({ ...form, confirm: event.target.value })} />
          </div>
          {mismatch ? <Alert tone="warn">{t("setPassword.mismatch")}</Alert> : null}
          {save.isError ? <Alert tone="error">{(save.error as Error).message}</Alert> : null}
          <Button type="submit" size="lg" disabled={!valid || save.isPending}>{t(keys.submit)}</Button>
        </form>
      )}
    </AuthLayout>
  );
}
