import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "../../components/ui/button";
import { Input, Label } from "../../components/ui/input";
import { requestPasswordReset } from "../../lib/blocks/auth";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Alert } from "../../shared/ui/Alert";
import { AuthLayout } from "./AuthLayout";

export function ForgotPasswordPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const send = useMutation({ mutationFn: () => requestPasswordReset(email) });
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  function submit(event: FormEvent) {
    event.preventDefault();
    if (valid) send.mutate();
  }

  return (
    <AuthLayout>
      {send.isSuccess ? (
        <motion.div className="auth-card" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
          <span className="grid h-14 w-14 place-items-center rounded-full bg-accent"><MailCheck size={26} /></span>
          <h2>{t("signup.sent")}</h2>
          <p>{t("forgot.sentHint").replace("{email}", email.trim())}</p>
          <Button variant="outline" onClick={() => onNavigate("/login")}>{t("auth.back")}</Button>
        </motion.div>
      ) : (
        <form className="auth-card" onSubmit={submit}>
          <h2>{t("forgot.title")}</h2>
          <p>{t("forgot.subtitle")}</p>
          <div className="grid gap-1.5">
            <Label htmlFor="forgot-email">{t("signup.email")}</Label>
            <Input id="forgot-email" type="email" autoComplete="email" autoFocus required value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          {send.isError ? <Alert tone="error">{(send.error as Error).message}</Alert> : null}
          <Button type="submit" size="lg" disabled={!valid || send.isPending}>{t("forgot.submit")}</Button>
          <p className="text-sm">
            <button type="button" className="link-button" onClick={() => onNavigate("/login")}>{t("auth.back")}</button>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
