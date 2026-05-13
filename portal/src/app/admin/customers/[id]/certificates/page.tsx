import { notFound } from "next/navigation";
import Link from "next/link";
import { CertificateListFiltersForm } from "@/components/admin/certificate-list-filters";
import { CertificateTable } from "@/components/admin/certificate-table";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import {
  listAdminCertificates,
  readCertificateListFilters,
} from "@/lib/certificates/queries";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function CustomerCertificatesPlaceholder({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { supabase } = await requireAdminSupabase();
  const { data: company } = await supabase
    .from("companies")
    .select("id, company_name, customer_id_readable, status")
    .eq("id", id)
    .maybeSingle();
  if (!company) notFound();

  const filters = readCertificateListFilters(await searchParams);
  const { rows, error } = await listAdminCertificates(supabase, {
    ...filters,
    companyId: id,
  });

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Certificates
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage company-level and site-level certificates for {company.company_name}.
          </p>
        </div>
        <Link
          href={`/admin/customers/${id}/certificates/upload`}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Upload certificate
        </Link>
      </div>

      {company.status === "inactive" ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          This customer is inactive. Existing records remain visible, but new uploads are blocked.
        </p>
      ) : null}

      <CertificateListFiltersForm
        actionPath={`/admin/customers/${id}/certificates`}
        resetPath={`/admin/customers/${id}/certificates`}
        filters={filters}
        showCustomerSearch={false}
      />

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <CertificateTable
        rows={rows}
        emptyMessage="No certificates have been uploaded for this customer yet."
      />
    </div>
  );
}
