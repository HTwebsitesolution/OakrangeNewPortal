import Link from "next/link";
import { CertificateListFiltersForm } from "@/components/admin/certificate-list-filters";
import { CertificateTable } from "@/components/admin/certificate-table";
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
  const filters = readCertificateListFilters(await searchParams);
  const { supabase } = await requireAdminSupabase();
  const { rows, error } = await listAdminCertificates(supabase, filters);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Certificates
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Admin-only certificate uploads, publishing, history, and secure PDF access.
          </p>
        </div>
        <Link
          href="/admin/certificates/upload"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Upload certificate
        </Link>
      </div>

      <CertificateListFiltersForm
        actionPath="/admin/certificates"
        resetPath="/admin/certificates"
        filters={filters}
      />

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <CertificateTable
        rows={rows}
        emptyMessage="No certificates match the current filters."
      />
    </div>
  );
}
