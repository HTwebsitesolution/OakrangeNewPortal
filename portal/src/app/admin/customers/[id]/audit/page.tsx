import Link from "next/link";
import { notFound } from "next/navigation";
import { AuditLogTable } from "@/components/admin/audit-log-table";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import { listAuditLogs } from "@/lib/audit/queries";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function CustomerAuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: companyId } = await params;
  if (!UUID_RE.test(companyId)) notFound();

  const { supabase } = await requireAdminSupabase();
  const { data: company } = await supabase
    .from("companies")
    .select("id, company_name, customer_id_readable")
    .eq("id", companyId)
    .maybeSingle();
  if (!company) notFound();

  const { rows, error } = await listAuditLogs(supabase, {
    companyId,
    limit: 50,
  });

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Audit trail</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Recent activity for {company.company_name} ({company.customer_id_readable}).
          </p>
        </div>
        <Link
          href={`/admin/audit-logs?companyId=${companyId}`}
          className="text-sm font-medium underline"
        >
          Open in full audit log
        </Link>
      </div>

      {error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : (
        <AuditLogTable rows={rows} emptyMessage="No audit entries for this company yet." />
      )}
    </div>
  );
}
