import Link from "next/link";
import { notFound } from "next/navigation";
import { CertificateListFiltersForm } from "@/components/admin/certificate-list-filters";
import { CertificateTable } from "@/components/admin/certificate-table";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import {
  listAdminCertificates,
  readCertificateListFilters,
} from "@/lib/certificates/queries";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function SiteCertificatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; siteId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id: companyId, siteId } = await params;
  if (!UUID_RE.test(companyId) || !UUID_RE.test(siteId)) notFound();

  const { supabase } = await requireAdminSupabase();
  const { data: site } = await supabase
    .from("sites")
    .select("id, company_id, site_name, status, companies(company_name)")
    .eq("id", siteId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!site) notFound();

  const filters = readCertificateListFilters(await searchParams);
  const { rows, error } = await listAdminCertificates(supabase, {
    ...filters,
    companyId,
    siteId,
  });

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/admin/customers/${companyId}/sites/${siteId}`}
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
          >
            ← Site detail
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {site.site_name} certificates
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Admin-only certificate history for this site.
          </p>
        </div>
        <Link
          href={`/admin/customers/${companyId}/sites/${siteId}/certificates/upload`}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Upload certificate
        </Link>
      </div>

      {site.status === "inactive" ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          This site is inactive. Existing records remain visible, but new uploads are blocked.
        </p>
      ) : null}

      <CertificateListFiltersForm
        actionPath={`/admin/customers/${companyId}/sites/${siteId}/certificates`}
        resetPath={`/admin/customers/${companyId}/sites/${siteId}/certificates`}
        filters={filters}
        showCustomerSearch={false}
        showSiteSearch={false}
      />

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <CertificateTable
        rows={rows}
        emptyMessage="No certificates have been uploaded for this site yet."
      />
    </div>
  );
}
