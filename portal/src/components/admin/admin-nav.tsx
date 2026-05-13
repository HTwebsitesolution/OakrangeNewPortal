/**
 * Admin chrome only. This component is rendered after `admin/layout.tsx` runs
 * `requireAdminProfile()` (server session + profile + role). Links are not an access gate.
 */
import Link from "next/link";
import type { SessionProfile } from "@/types/profile";
import { LogoutButton } from "@/components/auth/logout-button";

const links = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/sites", label: "Sites" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/certificates", label: "Certificates" },
  { href: "/admin/expiring-soon", label: "Expiring Soon" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
  { href: "/admin/settings", label: "Settings" },
] as const;

export function AdminNav({ profile }: { profile: SessionProfile }) {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <Link
          href="/admin/dashboard"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Oakrange Admin
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-zinc-500 sm:inline dark:text-zinc-400">
            {profile.email}
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
