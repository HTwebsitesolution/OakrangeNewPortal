"use client";

import { MobileNavStrip } from "@/components/layout/mobile-nav-strip";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import type { SidebarNavItem } from "@/lib/nav/types";
import type { SessionProfile } from "@/types/profile";

export function AppShell({
  items,
  profile,
  homeHref,
  portalLabel,
  children,
}: {
  items: SidebarNavItem[];
  profile: SessionProfile;
  homeHref: string;
  portalLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-oak-bg lg:pl-64">
      <SidebarNav
        items={items}
        profile={profile}
        homeHref={homeHref}
        portalLabel={portalLabel}
      />
      <div className="lg:hidden">
        <div className="border-b border-oak-border bg-oak-navy px-4 py-3 text-center text-sm font-medium text-white">
          {portalLabel}
        </div>
        <MobileNavStrip items={items} />
      </div>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
    </div>
  );
}
