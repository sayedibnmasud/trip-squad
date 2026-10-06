import { Luggage } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "../../lib/i18n/LocalizationProvider";

// The split screen every signed-out page shares: brand art on the left, the
// page's own card on the right.
export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useT();

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
      <div className="auth-panel">{children}</div>
    </div>
  );
}
