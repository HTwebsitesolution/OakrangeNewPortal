"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabClass = (active: boolean) =>
  [
    "rounded-lg px-3 py-2 text-sm font-medium",
    active
      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
  ].join(" ");

export function CustomerDetailTabs({ companyId }: { companyId: string }) {
  const pathname = usePathname();
  const base = `/admin/customers/${companyId}`;

  const current =
    pathname === `${base}/certificates`
      ? "certificates"
      : pathname === `${base}/audit`
        ? "audit"
        : pathname === `${base}/users` || pathname.startsWith(`${base}/users/`)
          ? "users"
          : pathname === `${base}/sites` ||
          pathname.startsWith(`${base}/sites/`)
          ? "sites"
          : pathname === base || pathname.startsWith(`${base}/edit`)
            ? "overview"
            : "overview";

  return (
    <nav className="mt-4 flex flex-wrap gap-1 border-b border-zinc-200 pb-3 dark:border-zinc-800">
      <Link href={base} className={tabClass(current === "overview")}>
        Overview
      </Link>
      <Link href={`${base}/sites`} className={tabClass(current === "sites")}>
        Sites
      </Link>
      <Link href={`${base}/users`} className={tabClass(current === "users")}>
        Users
      </Link>
      <Link href={`${base}/certificates`} className={tabClass(current === "certificates")}>
        Certificates
      </Link>
      <Link href={`${base}/audit`} className={tabClass(current === "audit")}>
        Audit
      </Link>
    </nav>
  );
}
