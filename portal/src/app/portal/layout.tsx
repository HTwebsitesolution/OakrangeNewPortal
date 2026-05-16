import "server-only";

import { AppShell } from "@/components/layout/app-shell";
import { requirePortalProfile } from "@/lib/auth/require-session";
import { PORTAL_NAV_ITEMS } from "@/lib/nav/portal-nav";

export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requirePortalProfile();

  return (
    <AppShell
      items={PORTAL_NAV_ITEMS}
      profile={profile}
      homeHref="/portal/dashboard"
      portalLabel="Certificate Portal"
    >
      {children}
    </AppShell>
  );
}
