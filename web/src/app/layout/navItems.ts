import { Map, UserRound, Users } from "lucide-react";
import { ADMIN_ROLE } from "../../features/admin/roles";

// `role` hides an item from users without it; the page itself still checks,
// and IAM enforces the underlying calls.
export const navItems = [
  { href: "/", labelKey: "nav.trips", icon: Map },
  { href: "/profile", labelKey: "nav.profile", icon: UserRound },
  { href: "/admin/users", labelKey: "nav.users", icon: Users, role: ADMIN_ROLE }
] as const;
