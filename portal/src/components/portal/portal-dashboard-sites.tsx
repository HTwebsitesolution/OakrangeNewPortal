import Link from "next/link";
import { formatCertificateDate } from "@/lib/certificates/format";
import {
  PORTAL_COMPANY_LEVEL_SITE_FILTER,
  type PortalSiteSummary,
} from "@/lib/certificates/portal-queries";

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
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Your sites</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {summaries.map((site) => {
          const siteQuery =
            site.siteId === null
              ? `siteId=${PORTAL_COMPANY_LEVEL_SITE_FILTER}`
              : `siteId=${site.siteId}`;

          return (
            <article
              key={site.siteId ?? "company-level"}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <h3 className="font-medium text-zinc-900 dark:text-zinc-50">{site.siteName}</h3>
              <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>{site.certificateCount} certificates</li>
                <li>{site.expiringSoonCount} expiring soon</li>
                {site.expiredCount > 0 ? <li>{site.expiredCount} expired</li> : null}
                {site.latestIssueDate ? (
                  <li>Latest issue: {formatCertificateDate(site.latestIssueDate)}</li>
                ) : null}
              </ul>
              <Link
                href={`/portal/certificates?${siteQuery}`}
                className="mt-3 inline-block text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
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
