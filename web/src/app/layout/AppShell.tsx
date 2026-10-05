import { Luggage } from "lucide-react";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { navItems } from "./navItems";
import { NotificationsMenu } from "./NotificationsMenu";
import { UserMenu } from "./UserMenu";
import { useMyRoles } from "../../features/admin/usePermission";
import { useT } from "../../lib/i18n/LocalizationProvider";

// Three destinations don't need a sidebar: a top bar keeps the full width for
// the trip content itself.
export function AppShell({ activePath, children, onNavigate }: { activePath: string; children: ReactNode; onNavigate: (path: string) => void }) {
  const { t } = useT();
  const roles = useMyRoles() ?? [];
  const visibleItems = navItems.filter((item) => !("role" in item) || roles.includes(item.role));

  function go(event: React.MouseEvent, href: string) {
    event.preventDefault();
    onNavigate(href);
  }

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="/" onClick={(event) => go(event, "/")}>
          <span className="brand-mark"><Luggage size={17} /></span>
          <span className="brand-name">{t("app.name")}</span>
        </a>
        <nav className="topnav" aria-label="Main">
          {visibleItems.map((item) => (
            <a key={item.href} href={item.href} aria-current={activePath === item.href ? "page" : undefined} className={activePath === item.href ? "active" : ""} onClick={(event) => go(event, item.href)}>
              {t(item.labelKey)}
            </a>
          ))}
        </nav>
        <div className="topbar-spacer" />
        <div className="topbar-actions">
          <LanguageSwitcher />
          <NotificationsMenu />
          <UserMenu onNavigate={onNavigate} />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
