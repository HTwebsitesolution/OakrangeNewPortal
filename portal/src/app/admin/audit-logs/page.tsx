import { AuditLogFiltersForm } from "@/components/admin/audit-log-filters";
import { AuditLogTable } from "@/components/admin/audit-log-table";
import { ListPagination } from "@/components/ui/list-pagination";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import { listAuditLogs, loadAuditFilterOptions, readAuditLogListFilters } from "@/lib/audit/queries";

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const filters = readAuditLogListFilters(resolvedParams);
  const { supabase } = await requireAdminSupabase();
  const paginationParams = new URLSearchParams();
  for (const [key, value] of Object.entries(resolvedParams)) {
    if (typeof value === "string" && value) paginationParams.set(key, value);
  }

  const [{ rows, error, page, hasMore }, { companies, users, error: optionsError }] =
    await Promise.all([listAuditLogs(supabase, filters), loadAuditFilterOptions(supabase)]);

  const emptyMessage =
    filters.search ||
    filters.action ||
    filters.userId ||
    filters.companyId ||
    filters.entityType ||
    filters.entityId ||
    filters.dateFrom ||
    filters.dateTo
      ? "No audit events match your filters."
      : "No audit events have been recorded yet.";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Audit logs</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Append-only activity trail for authentication, certificates, customers, sites, users, and
          access changes. Newest events first.
        </p>
      </div>

      <AuditLogFiltersForm filters={filters} companies={companies} users={users} />

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}
      {optionsError ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Filter options could not be loaded: {optionsError}
        </p>
      ) : null}

      <AuditLogTable rows={rows} emptyMessage={emptyMessage} />

      <ListPagination
        basePath="/admin/audit-logs"
        searchParams={paginationParams}
        page={page}
        hasMore={hasMore}
        rowCount={rows.length}
      />
    </div>
  );
}
