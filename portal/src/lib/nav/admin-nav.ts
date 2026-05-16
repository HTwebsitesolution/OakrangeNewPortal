import type { SidebarNavItem } from "@/lib/nav/types";

export const ADMIN_NAV_ITEMS: SidebarNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", match: "exact" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/sites", label: "Sites" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/certificates", label: "Certificates" },
  { href: "/admin/expiring-soon", label: "Expiring Soon" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
  { href: "/admin/settings", label: "Settings", match: "exact" },
];
