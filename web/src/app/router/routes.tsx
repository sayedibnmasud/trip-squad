import { useEffect, useState } from "react";
import { AppShell } from "../layout/AppShell";
import { RedirectIfAuthenticated, RequireAuth } from "./guards";
import { CallbackPage } from "../../features/auth/CallbackPage";
import { ErrorPage } from "../../features/auth/ErrorPage";
import { LoginPage } from "../../features/auth/LoginPage";
import { NotFoundPage } from "../../features/auth/NotFoundPage";
import { SignupPage } from "../../features/auth/SignupPage";
import { ProfilePage } from "../../features/profile/ProfilePage";
import { ApprovePage, JoinPage } from "../../features/trips/JoinPages";
import { MyTripsPage } from "../../features/trips/MyTripsPage";
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

  if (path === "/login/callback") {
    return <CallbackPage onNavigate={navigate} />;
  }

  if (path === "/signup") {
    return (
      <RedirectIfAuthenticated onNavigate={navigate}>
        <SignupPage onNavigate={navigate} />
      </RedirectIfAuthenticated>
    );
  }

  if (path === "/login") {
    const returnTo = new URLSearchParams(search).get("returnTo") || undefined;
    return (
      <RedirectIfAuthenticated onNavigate={navigate}>
        <LoginPage returnTo={returnTo} onNavigate={navigate} />
      </RedirectIfAuthenticated>
    );
  }

  const render = resolveRoute(path);
  if (!render) {
    return <NotFoundPage onNavigate={navigate} />;
  }

  // The query string is part of returnTo so invite and approve links survive
  // the round trip through hosted login.
  return (
    <RequireAuth currentPath={path + search} onNavigate={navigate}>
      <AppShell activePath={path.startsWith("/trips/") ? "/" : path} onNavigate={navigate}>
        {render({ navigate, search })}
      </AppShell>
    </RequireAuth>
  );
}
