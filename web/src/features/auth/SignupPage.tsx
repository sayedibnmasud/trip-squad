import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Luggage, MailCheck } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "../../components/ui/button";
import { Input, Label } from "../../components/ui/input";
import { blocksClient } from "../../lib/blocks/client";
import { blocksConfig } from "../../lib/blocks/config";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Alert } from "../../shared/ui/Alert";

// Self sign-up (iam signup-settings: email/password sign-up on). IAM creates
// the account and emails an activation link; the person sets their password
// there. ClientId/RedirectUri bring them back to this app afterwards.
async function signup(input: { email: string; firstName: string; lastName: string }) {
  const response = (await blocksClient.auth.signup({
    email: input.email.trim(),
    firstName: input.firstName.trim() || undefined,
    lastName: input.lastName.trim() || undefined,
    clientId: blocksConfig.oidcClientId,
    redirectUri: `${window.location.origin}/login/callback`
  })) as { isSuccess?: boolean; errors?: Record<string, string> | null };
  if (response.isSuccess === false || (response.errors && Object.keys(response.errors).length)) {
    throw new Error(Object.values(response.errors ?? {}).join(" ") || "Sign-up failed.");
  }
}

export function SignupPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useT();
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "" });
  const create = useMutation({ mutationFn: () => signup(form) });
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) && form.firstName.trim();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (valid) create.mutate();
  }

  return (
    <div className="auth-screen">
      <div className="auth-art">
        <span className="brand"><span className="brand-mark"><Luggage size={17} /></span>{t("app.name")}</span>
        <div>
          <h1>{t("auth.headline")}</h1>
          <p>{t("auth.pitch")}</p>
        </div>
      </div>
      <div className="auth-panel">
        {create.isSuccess ? (
          <motion.div className="auth-card" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
            <span className="grid h-14 w-14 place-items-center rounded-full bg-accent"><MailCheck size={26} /></span>
            <h2>{t("signup.sent")}</h2>
            <p>{t("signup.sentHint").replace("{email}", form.email.trim())}</p>
            <Button variant="outline" onClick={() => onNavigate("/login")}>{t("auth.back")}</Button>
          </motion.div>
        ) : (
          <form className="auth-card" onSubmit={submit}>
            <h2>{t("signup.title")}</h2>
            <p>{t("signup.subtitle")}</p>
            <div className="grid gap-1.5">
              <Label htmlFor="signup-first">{t("signup.firstName")}</Label>
              <Input id="signup-first" autoComplete="given-name" required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="signup-last">{t("signup.lastName")}</Label>
              <Input id="signup-last" autoComplete="family-name" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="signup-email">{t("signup.email")}</Label>
              <Input id="signup-email" type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </div>
            {create.isError ? <Alert tone="error">{(create.error as Error).message}</Alert> : null}
            <Button type="submit" size="lg" disabled={!valid || create.isPending}>{t("signup.submit")}</Button>
            <p className="text-sm">
              {t("signup.haveAccount")} <button type="button" className="link-button" onClick={() => onNavigate("/login")}>{t("auth.continue")}</button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
