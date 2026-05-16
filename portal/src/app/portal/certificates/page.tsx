import { PortalCertificateFiltersForm } from "@/components/portal/portal-certificate-filters";
import { PortalCertificateTable } from "@/components/portal/portal-certificate-table";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        title="Certificates"
        description="Published certificates you are authorised to access, newest first."
      />

      <PortalCertificateFiltersForm
        filters={filters}
        siteOptions={options}
        showSiteFilter={showSiteFilter}
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <PortalCertificateTable rows={rows} emptyMessage={emptyMessage} />
    </div>
  );
}
