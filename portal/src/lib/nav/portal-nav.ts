import type { SidebarNavItem } from "@/lib/nav/types";

export const PORTAL_NAV_ITEMS: SidebarNavItem[] = [
  { href: "/portal/dashboard", label: "Dashboard", match: "exact" },
  { href: "/portal/certificates", label: "Certificates" },
  { href: "/portal/sites", label: "Sites" },
  { href: "/portal/support", label: "Support", match: "exact" },
  { href: "/portal/account", label: "Account", match: "exact" },
];
