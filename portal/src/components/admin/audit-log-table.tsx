import Link from "next/link";
import { one } from "@/lib/admin/embed";
import { formatAuditEntitySummary, type AuditLogRow } from "@/lib/audit/queries";

function formatActionLabel(action: string): string {
  return action.replaceAll("_", " ");
}

export function AuditLogTable({
  rows,
  emptyMessage,
}: {
  rows: AuditLogRow[];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-200 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-800">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="px-3 py-3 text-left font-medium text-zinc-600">When</th>
            <th className="px-3 py-3 text-left font-medium text-zinc-600">Action</th>
            <th className="px-3 py-3 text-left font-medium text-zinc-600">User</th>
            <th className="px-3 py-3 text-left font-medium text-zinc-600">Company / site</th>
            <th className="px-3 py-3 text-left font-medium text-zinc-600">Entity</th>
            <th className="px-3 py-3 text-left font-medium text-zinc-600">IP</th>
            <th className="px-3 py-3 text-left font-medium text-zinc-600" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
          {rows.map((row) => {
            const profile = one(row.profiles);
            const company = one(row.companies);
            const site = one(row.sites);

            return (
              <tr key={row.id}>
                <td className="px-3 py-3 align-top whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                  {new Date(row.created_at).toLocaleString("en-GB")}
                </td>
                <td className="px-3 py-3 align-top">
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {formatActionLabel(row.action)}
                  </span>
                  <p className="text-xs text-zinc-500">{row.user_role ?? "—"}</p>
                </td>
                <td className="px-3 py-3 align-top text-zinc-700 dark:text-zinc-300">
                  {profile ? (
                    <>
                      <p>{profile.full_name || profile.email}</p>
                      <p className="text-xs text-zinc-500">{profile.email}</p>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-3 align-top text-zinc-700 dark:text-zinc-300">
                  {company ? (
                    <>
                      <p>{company.company_name}</p>
                      <p className="text-xs text-zinc-500">{company.customer_id_readable}</p>
                    </>
                  ) : (
                    "—"
                  )}
                  {site ? <p className="mt-1 text-xs text-zinc-500">{site.site_name}</p> : null}
                </td>
                <td className="px-3 py-3 align-top text-zinc-700 dark:text-zinc-300">
                  <p>{formatAuditEntitySummary(row)}</p>
                  <p className="text-xs text-zinc-500">{row.entity_type}</p>
                </td>
                <td className="px-3 py-3 align-top text-xs text-zinc-500">
                  {row.ip_address ?? "—"}
                </td>
                <td className="px-3 py-3 align-top">
                  <Link href={`/admin/audit-logs/${row.id}`} className="text-sm underline">
                    Details
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
