import { notFound } from "next/navigation";
import { requireAdminSupabase } from "@/lib/auth/require-session";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function CustomerAuditPlaceholder({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: companyId } = await params;
  if (!UUID_RE.test(companyId)) notFound();

  const { supabase } = await requireAdminSupabase();
  const { data: company } = await supabase.from("companies").select("id").eq("id", companyId).maybeSingle();
  if (!company) notFound();

  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, created_at, metadata_json, user_role")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(25);

  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Audit trail</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Recent audit rows scoped to this company (Phase 4 actions are logged when successful).
      </p>
      <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 text-sm dark:divide-zinc-800 dark:border-zinc-800">
        {(logs ?? []).map((log) => (
          <li key={log.id} className="bg-white px-3 py-2 dark:bg-zinc-950">
            <span className="font-medium">{log.action}</span>
            <span className="text-zinc-500"> · {log.entity_type}</span>
            <span className="float-right text-xs text-zinc-400">
              {log.created_at ? new Date(log.created_at).toLocaleString() : ""}
            </span>
          </li>
        ))}
      </ul>
      {(logs ?? []).length === 0 ? (
        <p className="text-sm text-zinc-500">No audit entries for this company yet.</p>
      ) : null}
      <p className="text-xs text-zinc-500">
        Internal notes on the customer record use the Notes field on the customer edit form for now.
      </p>
    </div>
  );
}
