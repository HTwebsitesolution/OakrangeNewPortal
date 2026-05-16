import "server-only";

import { AppShell } from "@/components/layout/app-shell";
import { requireAdminProfile } from "@/lib/auth/require-session";
import { ADMIN_NAV_ITEMS } from "@/lib/nav/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireAdminProfile();

  return (
    <AppShell
      items={ADMIN_NAV_ITEMS}
      profile={profile}
      homeHref="/admin/dashboard"
      portalLabel="Admin Portal"
    >
      {children}
    </AppShell>
  );
}
