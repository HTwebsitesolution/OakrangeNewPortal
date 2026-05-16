import { CertificateListFiltersForm } from "@/components/admin/certificate-list-filters";
import { CertificateTable } from "@/components/admin/certificate-table";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ListPagination } from "@/components/ui/list-pagination";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import {
  listAdminCertificates,
  readCertificateListFilters,
} from "@/lib/certificates/queries";

export default async function AdminCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const filters = readCertificateListFilters(resolvedParams);
  const { supabase } = await requireAdminSupabase();
  const { rows, error, page, hasMore } = await listAdminCertificates(supabase, filters);
  const paginationParams = new URLSearchParams();
  for (const [key, value] of Object.entries(resolvedParams)) {
    if (typeof value === "string" && value) paginationParams.set(key, value);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificates"
        description="Upload, publish, and manage certificate documents with secure PDF access."
        actions={
          <Button href="/admin/certificates/upload" variant="primary">
            Upload certificate
          </Button>
        }
      />

      <CertificateListFiltersForm
        actionPath="/admin/certificates"
        resetPath="/admin/certificates"
        filters={filters}
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <CertificateTable
        rows={rows}
        emptyMessage="No certificates match the current filters."
      />

      <ListPagination
        basePath="/admin/certificates"
        searchParams={paginationParams}
        page={page}
        hasMore={hasMore}
        rowCount={rows.length}
      />
    </div>
  );
}
