import Link from "next/link";
import { one } from "@/lib/admin/embed";
import { getCertificateDocumentTypeLabel } from "@/lib/certificates/document-types";
import { formatCertificateDate } from "@/lib/certificates/format";
import type { PortalCertificateRow } from "@/lib/certificates/portal-queries";
import { PortalCertificateActions } from "@/components/portal/portal-certificate-actions";
import { PortalExpiryBadge } from "@/components/portal/portal-expiry-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  tableBodyClass,
  tableClass,
  tableHeadClass,
  tableShellClass,
  tableTdClass,
  tableThClass,
} from "@/lib/ui/classes";
import type { CertificateDocumentType } from "@/lib/certificates/types";

export function PortalCertificateTable({
  rows,
  emptyMessage,
}: {
  rows: PortalCertificateRow[];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className={tableShellClass}>
      <table className={tableClass}>
        <thead className={tableHeadClass}>
          <tr>
            <th className={tableThClass}>Certificate</th>
            <th className={tableThClass}>Site</th>
            <th className={tableThClass}>Status</th>
            <th className={tableThClass}>Dates</th>
            <th className={tableThClass}>Actions</th>
          </tr>
        </thead>
        <tbody className={tableBodyClass}>
          {rows.map((row) => {
            const site = one(row.sites);

            return (
              <tr key={row.id} className="hover:bg-slate-50/80">
                <td className={tableTdClass}>
                  <Link
                    href={`/portal/certificates/${row.id}`}
                    className="font-medium text-oak-navy hover:text-oak-orange"
                  >
                    {row.display_title}
                  </Link>
                  <p className="mt-1 text-xs text-oak-muted">
                    {getCertificateDocumentTypeLabel(
                      row.document_type as CertificateDocumentType
                    )}
                  </p>
                </td>
                <td className={tableTdClass}>{site?.site_name ?? "Company-level"}</td>
                <td className={tableTdClass}>
                  <PortalExpiryBadge status="active" dueDate={row.due_date} />
                </td>
                <td className={tableTdClass}>
                  <p>Issue: {formatCertificateDate(row.issue_date)}</p>
                  <p className="text-oak-muted">
                    Due: {row.due_date ? formatCertificateDate(row.due_date) : "No due date"}
                  </p>
                </td>
                <td className={tableTdClass}>
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
