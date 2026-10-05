import { LogIn, Luggage } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../app/providers/AuthProvider";
import { isLoginConfigured } from "../../lib/blocks/config";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Alert } from "../../shared/ui/Alert";

export function LoginPage({ onNavigate, returnTo }: { onNavigate?: (path: string) => void; returnTo?: string }) {
  const { login } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const { t } = useT();
  const configured = isLoginConfigured();

  async function handleLogin() {
    setError(undefined);
    setPending(true);
    try {
      await login(returnTo);
    } catch (caught) {
      setError((caught as Error).message);
      setPending(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-art">
        <span className="brand"><span className="brand-mark"><Luggage size={17} /></span>{t("app.name")}</span>
        <div>
          <h1>{t("auth.headline")}</h1>
          <p>{t("auth.pitch")}</p>
        </div>
        {/* A dashed route between pins: the one decorative element on the page. */}
        <svg className="auth-route" viewBox="0 0 520 300" fill="none" aria-hidden="true">
          <path d="M20 270 C 140 250, 120 150, 230 150 S 360 60, 480 40" stroke="currentColor" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" />
          <circle cx="20" cy="270" r="9" fill="currentColor" />
          <circle cx="230" cy="150" r="7" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M480 14c-11 0-20 9-20 20 0 15 20 34 20 34s20-19 20-34c0-11-9-20-20-20z" fill="currentColor" />
        </svg>
      </div>
      <div className="auth-panel">
        <div className="auth-card">
          <h2>{t("auth.welcome")}</h2>
          <p>{t("auth.subtitle")}</p>
          {!configured ? (
            <Alert tone="warn">
              {t("auth.notConfigured")} <code>{window.location.origin}/login/callback</code>
            </Alert>
          ) : null}
          {error ? <Alert tone="error">{error}</Alert> : null}
          <button className="primary-button auth-submit" disabled={!configured || pending} onClick={handleLogin}>
            <LogIn size={18} /> {pending ? t("auth.redirecting") : t("auth.continue")}
          </button>
          {onNavigate ? (
            <p className="text-sm">
              {t("signup.noAccount")} <button type="button" className="link-button" onClick={() => onNavigate("/signup")}>{t("signup.title")}</button>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
