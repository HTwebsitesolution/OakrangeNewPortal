import { PortalCertificateFiltersForm } from "@/components/portal/portal-certificate-filters";
import { PortalCertificateTable } from "@/components/portal/portal-certificate-table";
import { requirePortalSupabase } from "@/lib/auth/require-session";
import {
  listPortalCertificates,
  loadPortalSiteFilterOptions,
  readPortalCertificateListFilters,
} from "@/lib/certificates/portal-queries";

export default async function PortalCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const filters = readPortalCertificateListFilters(await searchParams);
  const { supabase, profile } = await requirePortalSupabase();
  const [{ rows, error }, { options, showSiteFilter }] = await Promise.all([
    listPortalCertificates(supabase, filters),
    loadPortalSiteFilterOptions(supabase, profile.id),
  ]);

  const emptyMessage =
    filters.search ||
    filters.siteId ||
    filters.documentType ||
    filters.expiry ||
    filters.issueDateFrom ||
    filters.issueDateTo ||
    filters.dueDateFrom ||
    filters.dueDateTo
      ? "No certificates match your search or filters."
      : "No certificates are currently available for your account.";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Certificates</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Published certificates you are authorised to access, newest first.
        </p>
      </div>

      <PortalCertificateFiltersForm
        filters={filters}
        siteOptions={options}
        showSiteFilter={showSiteFilter}
      />

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <PortalCertificateTable rows={rows} emptyMessage={emptyMessage} />
    </div>
  );
}
