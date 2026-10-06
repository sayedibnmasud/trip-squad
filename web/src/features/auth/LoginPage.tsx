import { useMutation } from "@tanstack/react-query";
import { LogIn } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../app/providers/AuthProvider";
import { Button } from "../../components/ui/button";
import { Input, Label } from "../../components/ui/input";
import { LoginError } from "../../lib/blocks/auth";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Alert } from "../../shared/ui/Alert";
import { AuthLayout } from "./AuthLayout";

export function LoginPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { login } = useAuth();
  const { t } = useT();
  const [form, setForm] = useState({ email: "", password: "", rememberMe: true });
  // No navigation on success: once AuthProvider flips to authenticated,
  // RedirectIfAuthenticated sends the person on to returnTo.
  const signIn = useMutation({ mutationFn: () => login(form) });
  const valid = form.email.trim() && form.password;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (valid) signIn.mutate();
  }

  function errorMessage(error: unknown): string {
    if (error instanceof LoginError && error.code === "invalid_credentials") return t("auth.invalidCredentials");
    if (error instanceof LoginError && error.code === "mfa_required") return t("auth.mfaRequired");
    return (error as Error).message || t("auth.failed");
  }

  return (
    <AuthLayout>
      <form className="auth-card" onSubmit={submit}>
        <h2>{t("auth.welcome")}</h2>
        <p>{t("auth.subtitle")}</p>
        <div className="grid gap-1.5">
          <Label htmlFor="login-email">{t("signup.email")}</Label>
          <Input id="login-email" type="email" autoComplete="username" autoFocus required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">{t("auth.password")}</Label>
            <button type="button" className="link-button text-sm" onClick={() => onNavigate("/forgot-password")}>{t("auth.forgot")}</button>
          </div>
          <Input id="login-password" type="password" autoComplete="current-password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={form.rememberMe} onChange={(event) => setForm({ ...form, rememberMe: event.target.checked })} />
          {t("auth.rememberMe")}
        </label>
        {signIn.isError ? <Alert tone="error">{errorMessage(signIn.error)}</Alert> : null}
        <Button type="submit" size="lg" className="auth-submit" disabled={!valid || signIn.isPending}>
          <LogIn size={18} /> {signIn.isPending ? t("auth.signingIn") : t("auth.continue")}
        </Button>
        <p className="text-sm">
          {t("signup.noAccount")} <button type="button" className="link-button" onClick={() => onNavigate("/signup")}>{t("signup.title")}</button>
        </p>
      </form>
    </AuthLayout>
  );
}
