import Link from "next/link";
import { one } from "@/lib/admin/embed";
import { getCertificateDocumentTypeLabel } from "@/lib/certificates/document-types";
import { formatCertificateDate } from "@/lib/certificates/format";
import type { PortalCertificateRow } from "@/lib/certificates/portal-queries";
import { brand } from "@/lib/copy/brand";
import { PortalExpiryBadge } from "@/components/portal/portal-expiry-badge";
import { cardClass } from "@/lib/ui/classes";
import type { CertificateDocumentType } from "@/lib/certificates/types";

export function PortalCertificateMobileCards({ rows }: { rows: PortalCertificateRow[] }) {
  return (
    <ul className="space-y-3 md:hidden">
      {rows.map((row) => {
        const site = one(row.sites);
        return (
          <li key={row.id} className={`${cardClass} p-4`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/portal/certificates/${row.id}`}
                  className="font-semibold text-oak-navy hover:text-oak-orange"
                >
                  {row.display_title}
                </Link>
                <p className="mt-1 text-xs text-oak-muted">
                  {getCertificateDocumentTypeLabel(
                    row.document_type as CertificateDocumentType
                  )}
                  {site?.site_name ? ` · ${site.site_name}` : " · Company-level"}
                </p>
              </div>
              <PortalExpiryBadge status="active" dueDate={row.due_date} />
            </div>
            <p className="mt-2 text-xs text-oak-muted">
              Issued {formatCertificateDate(row.issue_date)}
              {row.due_date
                ? ` · Due ${formatCertificateDate(row.due_date)}`
                : " · No due date"}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                href={`/api/portal/certificates/${row.id}/signed-url?intent=view`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-oak-border bg-white px-3 py-2.5 text-center text-sm font-medium text-oak-charcoal"
              >
                {brand.portal.mobileViewPdf}
              </Link>
              <Link
                href={`/api/portal/certificates/${row.id}/signed-url?intent=download`}
                className="inline-flex items-center justify-center rounded-lg bg-oak-orange px-3 py-2.5 text-center text-sm font-medium text-white"
              >
                {brand.portal.mobileDownload}
              </Link>
            </div>
            <Link
              href={`/portal/certificates/${row.id}`}
              className="mt-2 block text-center text-xs font-medium text-oak-orange"
            >
              View details
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
