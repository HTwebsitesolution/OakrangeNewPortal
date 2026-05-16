import Link from "next/link";
import { one } from "@/lib/admin/embed";
import { getCertificateDocumentTypeLabel } from "@/lib/certificates/document-types";
import { formatCertificateDate } from "@/lib/certificates/format";
import type { PortalCertificateRow } from "@/lib/certificates/portal-queries";
import { PortalCertificateActions } from "@/components/portal/portal-certificate-actions";
import { PortalExpiryBadge } from "@/components/portal/portal-expiry-badge";
import type { CertificateDocumentType } from "@/lib/certificates/types";

export function PortalCertificateTable({
  rows,
  emptyMessage,
}: {
  rows: PortalCertificateRow[];
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
            <th className="px-3 py-3 text-left font-medium text-zinc-600">Certificate</th>
            <th className="px-3 py-3 text-left font-medium text-zinc-600">Site</th>
            <th className="px-3 py-3 text-left font-medium text-zinc-600">Status</th>
            <th className="px-3 py-3 text-left font-medium text-zinc-600">Dates</th>
            <th className="px-3 py-3 text-left font-medium text-zinc-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
          {rows.map((row) => {
            const site = one(row.sites);

            return (
              <tr key={row.id}>
                <td className="px-3 py-3 align-top">
                  <Link
                    href={`/portal/certificates/${row.id}`}
                    className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                  >
                    {row.display_title}
                  </Link>
                  <p className="mt-1 text-xs text-zinc-500">
                    {getCertificateDocumentTypeLabel(
                      row.document_type as CertificateDocumentType
                    )}
                  </p>
                </td>
                <td className="px-3 py-3 align-top text-zinc-700 dark:text-zinc-300">
                  {site?.site_name ?? "Company-level"}
                </td>
                <td className="px-3 py-3 align-top">
                  <PortalExpiryBadge status="active" dueDate={row.due_date} />
                </td>
                <td className="px-3 py-3 align-top text-zinc-700 dark:text-zinc-300">
                  <p>Issue: {formatCertificateDate(row.issue_date)}</p>
                  <p>
                    Due:{" "}
                    {row.due_date ? formatCertificateDate(row.due_date) : "No due date"}
                  </p>
                </td>
                <td className="px-3 py-3 align-top">
                  <PortalCertificateActions certificateId={row.id} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}



