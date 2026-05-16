import Link from "next/link";
import { formatCertificateDate } from "@/lib/certificates/format";
import { requirePortalSupabase } from "@/lib/auth/require-session";
import {
  loadPortalDashboardData,
  PORTAL_COMPANY_LEVEL_SITE_FILTER,
} from "@/lib/certificates/portal-queries";

export default async function PortalSitesPage() {
  const { supabase, profile } = await requirePortalSupabase();
  const { data, error } = await loadPortalDashboardData(supabase, profile.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Your sites</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Assigned sites and certificate summary. Select a site to filter your certificate list.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {data.siteSummaries.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-800">
          No site assignments are available for your account.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.siteSummaries.map((site) => {
            const siteQuery =
              site.siteId === null
                ? `siteId=${PORTAL_COMPANY_LEVEL_SITE_FILTER}`
                : `siteId=${site.siteId}`;

            return (
              <article
                key={site.siteId ?? "company-level"}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <h2 className="font-medium text-zinc-900 dark:text-zinc-50">{site.siteName}</h2>
                <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                  <li>{site.certificateCount} certificates</li>
                  <li>{site.expiredCount} expired</li>
                  <li>{site.expiringSoonCount} expiring within 30 days</li>
                  {site.latestIssueDate ? (
                    <li>Latest issue: {formatCertificateDate(site.latestIssueDate)}</li>
                  ) : null}
                </ul>
                <Link
                  href={`/portal/certificates?${siteQuery}`}
                  className="mt-3 inline-block text-sm font-medium underline"
                >
                  View certificates
                </Link>
              </article>
            );
          })}
        </div>
      )}

      {data.hasCompanyWideAccess ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          You have company-wide access, including all company sites and company-level documents.
        </p>
      ) : null}
    </div>
  );
}
