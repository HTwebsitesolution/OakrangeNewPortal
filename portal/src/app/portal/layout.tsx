import "server-only";

import { requirePortalProfile } from "@/lib/auth/require-session";
import { PortalNav } from "@/components/portal/portal-nav";

export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requirePortalProfile();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <PortalNav profile={profile} />
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
