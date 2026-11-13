import Link from "next/link";
import { PortalCertificateTable } from "@/components/portal/portal-certificate-table";
import { PortalDashboardSites } from "@/components/portal/portal-dashboard-sites";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { brand } from "@/lib/copy/brand";
import { requirePortalSupabase } from "@/lib/auth/require-session";
import { loadPortalDashboardData } from "@/lib/certificates/portal-queries";
import { cardClass } from "@/lib/ui/classes";

export default async function PortalDashboardPage() {
  const { supabase, profile } = await requirePortalSupabase();
  const { data, error } = await loadPortalDashboardData(supabase, profile.id);

  const welcomeName = profile.full_name || profile.email;
  const multiCompany = data.companies.length > 1;
  const companyLabel = multiCompany
    ? `${data.companies.length} companies: ${data.companies
        .map((c) => `${c.companyName} (${c.customerIdReadable})`)
        .join(", ")}`
    : data.companyName
      ? `${data.companyName}${data.customerIdReadable ? ` (${data.customerIdReadable})` : ""}`
      : null;
  const assignedSitesValue = data.hasDelegatedAccess
    ? data.assignedSiteCount
    : data.hasCompanyWideAccess
      ? "All sites"
      : data.assignedSiteCount;

  return (
    <div className="space-y-8 pb-4">
      <PageHeader
        eyebrow={brand.portal.dashboardEyebrow}
        title={brand.portal.dashboardTitle}
        description={
          <>
            {brand.portal.dashboardLead(welcomeName)}
            {companyLabel ? (
              <span className="mt-1 block text-oak-charcoal">{companyLabel}</span>
            ) : null}
          </>
        }
        actions={
          <Button href="/portal/certificates" variant="primary" className="min-h-11 w-full sm:w-auto">
            View all certificates
          </Button>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      {data.expiringSoonCount > 0 ? (
        <Alert variant="warning">
          <p className="font-medium">
            {data.expiringSoonCount} certificate{data.expiringSoonCount === 1 ? "" : "s"} due within
            30 days
          </p>
          <Link
            href="/portal/certificates"
            className="mt-2 inline-block text-sm font-semibold text-oak-orange hover:underline"
          >
            Review expiring certificates →
          </Link>
        </Alert>
      ) : null}

      <section aria-label="Overview">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Available certificates"
            value={data.totalCertificates}
            href="/portal/certificates"
            accent="orange"
          />
          <MetricCard
            label="Expiring within 30 days"
            value={data.expiringSoonCount}
            href="/portal/certificates"
            accent="warning"
          />
          <MetricCard label="Expired" value={data.expiredCount} accent="danger" />
          <MetricCard label="Assigned sites" value={assignedSitesValue} />
        </div>
      </section>

      <PortalDashboardSites
        summaries={data.siteSummaries}
        showSection={
          data.hasCompanyWideAccess ||
          multiCompany ||
          data.assignedSiteCount > 1 ||
          data.siteSummaries.length > 1
        }
      />

      {data.teamMembers.length > 0 ? (
        <section className="space-y-3" aria-label="Your team">
          <h2 className="text-lg font-semibold tracking-tight text-oak-navy">Your team</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.teamMembers.map((member) => (
              <li key={member.assignmentId} className={`${cardClass} px-4 py-3`}>
                <p className="font-medium text-oak-navy">{member.memberName}</p>
                {member.companyName ? (
                  <p className="text-sm text-oak-muted">
                    {member.companyName}
                    {member.customerIdReadable ? ` (${member.customerIdReadable})` : ""}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3" aria-label="Latest certificates">
        <div className="flex items-end justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-oak-navy">Latest certificates</h2>
          <Link
            href="/portal/certificates"
            className="text-sm font-medium text-oak-orange hover:underline"
          >
            See all
          </Link>
        </div>
        <PortalCertificateTable
          rows={data.latestCertificates}
          emptyMessage={brand.portal.certificatesEmpty}
          showCompany={multiCompany}
        />
      </section>
    </div>
  );
}
