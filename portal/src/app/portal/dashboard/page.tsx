import Link from "next/link";
import { PortalCertificateTable } from "@/components/portal/portal-certificate-table";
import { PortalDashboardSites } from "@/components/portal/portal-dashboard-sites";
import { requirePortalSupabase } from "@/lib/auth/require-session";
import { loadPortalDashboardData } from "@/lib/certificates/portal-queries";

export default async function PortalDashboardPage() {
  const { supabase, profile } = await requirePortalSupabase();
  const { data, error } = await loadPortalDashboardData(supabase, profile.id);

  const welcomeName = profile.full_name || profile.email;
  const companyLabel = data.companyName
    ? `${data.companyName}${data.customerIdReadable ? ` (${data.customerIdReadable})` : ""}`
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Welcome back, {welcomeName}
          {companyLabel ? ` — ${companyLabel}` : ""}.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Available certificates" value={data.totalCertificates} />
        <StatCard label="Expired" value={data.expiredCount} />
        <StatCard label="Expiring within 30 days" value={data.expiringSoonCount} />
        <StatCard
          label="Assigned sites"
          value={data.hasCompanyWideAccess ? "All company sites" : data.assignedSiteCount}
        />
      </div>

      <PortalDashboardSites
        summaries={data.siteSummaries}
        showSection={
          data.hasCompanyWideAccess || data.assignedSiteCount > 1 || data.siteSummaries.length > 1
        }
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Latest certificates
          </h2>
          <Link
            href="/portal/certificates"
            className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
          >
            View all certificates
          </Link>
        </div>

        <PortalCertificateTable
          rows={data.latestCertificates}
          emptyMessage="No certificates are currently available for your account."
        />
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}
