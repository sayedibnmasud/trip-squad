import { Map, UserRound } from "lucide-react";

// Roles are per trip (see features/trips/tripRoles.ts), so every signed-in
// user sees the same navigation.
export const navItems = [
  { href: "/", labelKey: "nav.trips", icon: Map },
  { href: "/profile", labelKey: "nav.profile", icon: UserRound }
] as const;
