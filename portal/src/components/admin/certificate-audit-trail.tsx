import Link from "next/link";
import { one } from "@/lib/admin/embed";
import { formatAuditEntitySummary, type AuditLogRow } from "@/lib/audit/queries";

export function CertificateAuditTrail({
  rows,
  certificateId,
}: {
  rows: AuditLogRow[];
  certificateId: string;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Activity on this certificate
        </h2>
        <Link
          href={`/admin/audit-logs?entityType=certificate_document&entityId=${certificateId}`}
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          View all in audit logs
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">No audit events recorded for this certificate yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
          {rows.map((row) => {
            const profile = one(row.profiles);
            return (
              <li key={row.id} className="py-2 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {row.action.replaceAll("_", " ")}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(row.created_at).toLocaleString("en-GB")}
                  </span>
                </div>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                  {profile?.full_name || profile?.email || "Unknown user"}
                  {profile?.email ? ` (${profile.email})` : ""}
                  <span className="text-zinc-400"> · {row.user_role}</span>
                </p>
                <p className="mt-1 text-xs text-zinc-500">{formatAuditEntitySummary(row)}</p>
                <Link href={`/admin/audit-logs/${row.id}`} className="mt-1 inline-block text-xs underline">
                  Audit details
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
