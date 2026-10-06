import { useEffect, useState } from "react";
import { AppShell } from "../layout/AppShell";
import { RedirectIfAuthenticated, RequireAuth } from "./guards";
import { ErrorPage } from "../../features/auth/ErrorPage";
import { ForgotPasswordPage } from "../../features/auth/ForgotPasswordPage";
import { LoginPage } from "../../features/auth/LoginPage";
import { NotFoundPage } from "../../features/auth/NotFoundPage";
import { SetPasswordPage } from "../../features/auth/SetPasswordPage";
import { SignupPage } from "../../features/auth/SignupPage";
import { ProfilePage } from "../../features/profile/ProfilePage";
import { ApprovePage, JoinPage } from "../../features/trips/JoinPages";
import { MyTripsPage } from "../../features/trips/MyTripsPage";
import { linkCode } from "../../lib/blocks/auth";
import { TripPage } from "../../features/trips/TripPage";
import { lazy, Suspense } from "react";
import type { ReactNode } from "react";

// Dev-only page previews (src/dev); never part of a production build.
const DesignPreview = import.meta.env.DEV ? lazy(() => import("../../dev/DesignPreview").then((module) => ({ default: module.DesignPreview }))) : null;

type RouteContext = { navigate: (path: string) => void; search: string };

const protectedRoutes: Record<string, (context: RouteContext) => ReactNode> = {
  "/": ({ navigate }) => <MyTripsPage onNavigate={navigate} />,
  "/profile": () => <ProfilePage />,
  "/join": ({ navigate, search }) => <JoinPage onNavigate={navigate} search={search} />,
  "/approve": ({ navigate, search }) => <ApprovePage onNavigate={navigate} search={search} />,
  "/error": ({ navigate }) => <ErrorPage onNavigate={navigate} />
};

const TRIP_PATH = /^\/trips\/([A-Za-z0-9-]+)$/;

// Only same-app paths may be a post-login destination, so a crafted
// ?returnTo= can't bounce someone off to another site.
function safeReturnTo(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

function resolveRoute(path: string): ((context: RouteContext) => ReactNode) | undefined {
  const tripMatch = TRIP_PATH.exec(path);
  if (tripMatch?.[1]) {
    const tripId = tripMatch[1];
    return ({ navigate }) => <TripPage key={tripId} tripId={tripId} onNavigate={navigate} />;
  }
  return protectedRoutes[path];
}

export function AppRouter() {
  const [path, setPath] = useState(() => window.location.pathname);
  const [search, setSearch] = useState(() => window.location.search);

  useEffect(() => {
    const onPopState = () => {
      setPath(window.location.pathname);
      setSearch(window.location.search);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function navigate(nextPath: string) {
    const [nextPathname = "/", queryString = ""] = nextPath.split("?");
    window.history.pushState({}, "", nextPath);
    setPath(nextPathname);
    setSearch(queryString ? `?${queryString}` : "");
  }

  if (DesignPreview && path.startsWith("/__preview")) {
    return <Suspense fallback={null}><DesignPreview path={path} /></Suspense>;
  }

  // Emailed links from IAM (account activation, password reset) land on
  // these pages; nothing in sign-in ever leaves the app.
  // IAM's activation path is fixed at oidc/activate/ (the auth config
  // doesn't let it be changed), so that is the path its emails use.
  const activateBase = ["/activate", "/oidc/activate"].find((base) => path === base || path.startsWith(`${base}/`));
  if (activateBase) {
    return <SetPasswordPage mode="activate" code={linkCode(path, search, activateBase)} onNavigate={navigate} />;
  }

  if (path === "/reset-password" || path.startsWith("/reset-password/")) {
    return <SetPasswordPage mode="reset" code={linkCode(path, search, "/reset-password")} onNavigate={navigate} />;
  }

  if (path === "/forgot-password") {
    return (
      <RedirectIfAuthenticated onNavigate={navigate}>
        <ForgotPasswordPage onNavigate={navigate} />
      </RedirectIfAuthenticated>
    );
  }

  if (path === "/signup") {
    return (
      <RedirectIfAuthenticated onNavigate={navigate}>
        <SignupPage onNavigate={navigate} />
      </RedirectIfAuthenticated>
    );
  }

  // /login/callback was the hosted-login return address; sign-up still
  // names it as its redirectUri, so treat it as the login page.
  if (path === "/login" || path === "/login/callback") {
    const returnTo = safeReturnTo(new URLSearchParams(search).get("returnTo"));
    return (
      <RedirectIfAuthenticated to={returnTo} onNavigate={navigate}>
        <LoginPage onNavigate={navigate} />
      </RedirectIfAuthenticated>
    );
  }

  const render = resolveRoute(path);
  if (!render) {
    return <NotFoundPage onNavigate={navigate} />;
  }

  // The query string is part of returnTo so invite and approve links survive
  // the trip through the login page.
  return (
    <RequireAuth currentPath={path + search} onNavigate={navigate}>
      <AppShell activePath={path.startsWith("/trips/") ? "/" : path} onNavigate={navigate}>
        {render({ navigate, search })}
      </AppShell>
    </RequireAuth>
  );
}
