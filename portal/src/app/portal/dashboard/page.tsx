import Link from "next/link";
import { PortalCertificateTable } from "@/components/portal/portal-certificate-table";
import { PortalDashboardSites } from "@/components/portal/portal-dashboard-sites";
import { Alert } from "@/components/ui/alert";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        title="Dashboard"
        description={
          <>
            Welcome back, <span className="font-medium text-oak-charcoal">{welcomeName}</span>
            {companyLabel ? ` — ${companyLabel}` : ""}. Your latest certificates are below.
          </>
        }
        actions={
          <Link
            href="/portal/certificates"
            className="text-sm font-medium text-oak-orange hover:underline"
          >
            View all certificates
          </Link>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Available certificates" value={data.totalCertificates} accent="default" />
        <MetricCard label="Expired" value={data.expiredCount} accent="danger" />
        <MetricCard
          label="Expiring within 30 days"
          value={data.expiringSoonCount}
          accent="warning"
        />
        <MetricCard
          label="Assigned sites"
          value={data.hasCompanyWideAccess ? "All company sites" : data.assignedSiteCount}
          accent="default"
        />
      </div>

      <PortalDashboardSites
        summaries={data.siteSummaries}
        showSection={
          data.hasCompanyWideAccess || data.assignedSiteCount > 1 || data.siteSummaries.length > 1
        }
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight text-oak-navy">Latest certificates</h2>
        <PortalCertificateTable
          rows={data.latestCertificates}
          emptyMessage="No certificates are currently available for your account."
        />
      </section>
    </div>
  );
}
