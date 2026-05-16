"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OakrangeLogo } from "@/components/brand/oakrange-logo";
import { LogoutButton } from "@/components/auth/logout-button";
import { cn } from "@/lib/ui/cn";
import type { SidebarNavItem } from "@/lib/nav/types";
import type { SessionProfile } from "@/types/profile";

function isActive(pathname: string, href: string, match: "exact" | "prefix" = "prefix") {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({
  items,
  profile,
  homeHref,
  portalLabel,
}: {
  items: SidebarNavItem[];
  profile: SessionProfile;
  homeHref: string;
  portalLabel: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-oak-border bg-oak-navy text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-r">
      <div className="border-b border-white/10 px-5 py-5">
        <OakrangeLogo href={homeHref} variant="light" subtitle={portalLabel} />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map(({ href, label, match }) => {
          const active = isActive(pathname, href, match);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "block rounded-lg px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-oak-orange text-white"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-4 py-4">
        <p className="truncate text-xs text-slate-400">{profile.email}</p>
        {profile.full_name ? (
          <p className="truncate text-sm font-medium text-white">{profile.full_name}</p>
        ) : null}
        <LogoutButton className="mt-3 w-full rounded-lg border border-white/20 px-3 py-2 text-left text-sm font-medium text-white hover:bg-white/10" />
      </div>
    </aside>
  );
}
