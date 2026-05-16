import Link from "next/link";
import { formatCertificateDate } from "@/lib/certificates/format";
import { brand } from "@/lib/copy/brand";
import {
  PORTAL_COMPANY_LEVEL_SITE_FILTER,
  type PortalSiteSummary,
} from "@/lib/certificates/portal-queries";
import { cardClass } from "@/lib/ui/classes";

export function PortalDashboardSites({
  summaries,
  showSection,
}: {
  summaries: PortalSiteSummary[];
  showSection: boolean;
}) {
  if (!showSection || summaries.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3" aria-label={brand.portal.sitesTitle}>
      <h2 className="text-lg font-semibold tracking-tight text-oak-navy">{brand.portal.sitesTitle}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {summaries.map((site) => {
          const siteQuery =
            site.siteId === null
              ? `siteId=${PORTAL_COMPANY_LEVEL_SITE_FILTER}`
              : `siteId=${site.siteId}`;

          return (
            <article key={site.siteId ?? "company-level"} className={`${cardClass} p-4`}>
              <h3 className="font-semibold text-oak-navy">{site.siteName}</h3>
              <ul className="mt-2 space-y-1 text-sm text-oak-muted">
                <li>{site.certificateCount} certificates</li>
                <li>{site.expiringSoonCount} expiring soon</li>
                {site.expiredCount > 0 ? <li>{site.expiredCount} expired</li> : null}
                {site.latestIssueDate ? (
                  <li>Latest issue: {formatCertificateDate(site.latestIssueDate)}</li>
                ) : null}
              </ul>
              <Link
                href={`/portal/certificates?${siteQuery}`}
                className="mt-3 inline-block text-sm font-semibold text-oak-orange hover:underline"
              >
                View certificates
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
