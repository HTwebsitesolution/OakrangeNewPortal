import Link from "next/link";
import { notFound } from "next/navigation";
import { AuditMetadataPanel } from "@/components/admin/audit-metadata-panel";
import { one } from "@/lib/admin/embed";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import { formatAuditEntitySummary, getAuditLogById } from "@/lib/audit/queries";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AdminAuditLogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { supabase } = await requireAdminSupabase();
  const { row, error } = await getAuditLogById(supabase, id);
  if (error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
        {error}
      </p>
    );
  }
  if (!row) notFound();

  const profile = one(row.profiles);
  const company = one(row.companies);
  const site = one(row.sites);

  return (
    <div className="space-y-6">
      <Link href="/admin/audit-logs" className="text-sm text-zinc-600 underline dark:text-zinc-400">
        ← Audit logs
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {row.action.replaceAll("_", " ")}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {new Date(row.created_at).toLocaleString("en-GB")}
        </p>
      </div>

      <dl className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-2">
        <Item label="Actor" value={profile ? `${profile.full_name || profile.email} (${profile.email})` : "—"} />
        <Item label="Role" value={row.user_role ?? "—"} />
        <Item label="Entity type" value={row.entity_type} />
        <Item label="Entity summary" value={formatAuditEntitySummary(row)} />
        <Item label="Entity ID" value={row.entity_id ?? "—"} />
        <Item
          label="Company"
          value={
            company ? `${company.customer_id_readable} — ${company.company_name}` : "—"
          }
        />
        <Item label="Site" value={site?.site_name ?? "—"} />
        <Item label="IP address" value={row.ip_address ?? "—"} />
        <Item label="User agent" value={row.user_agent ?? "—"} />
      </dl>

      <section>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Metadata</h2>
        <div className="mt-2">
          <AuditMetadataPanel metadata={row.metadata_json} />
        </div>
      </section>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 break-words text-zinc-900 dark:text-zinc-100">{value}</dd>
    </div>
  );
}
