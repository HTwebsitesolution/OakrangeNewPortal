import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { one } from "@/lib/admin/embed";
import { getCertificateDocumentTypeLabel } from "@/lib/certificates/document-types";
import { formatCertificateDate } from "@/lib/certificates/format";
import { requirePortalSupabase } from "@/lib/auth/require-session";
import { getPortalCertificateById } from "@/lib/certificates/portal-queries";
import { PortalExpiryBadge } from "@/components/portal/portal-expiry-badge";
import type { CertificateDocumentType } from "@/lib/certificates/types";

export default async function PortalCertificateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requirePortalSupabase();
  const { certificate, error } = await getPortalCertificateById(supabase, id);

  if (error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        Could not load this certificate.
      </p>
    );
  }

  if (!certificate) {
    notFound();
  }

  const company = one(certificate.companies);
  const site = one(certificate.sites);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/portal/certificates"
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          Back to certificates
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {certificate.display_title}
        </h1>
      </div>

      <dl className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-2">
        <DetailItem label="Customer" value={company?.company_name ?? "—"} />
        <DetailItem label="Site" value={site?.site_name ?? "Company-level"} />
        <DetailItem
          label="Document type"
          value={getCertificateDocumentTypeLabel(
            certificate.document_type as CertificateDocumentType
          )}
        />
        <DetailItem
          label="Issue / calibration date"
          value={formatCertificateDate(certificate.issue_date)}
        />
        <DetailItem
          label="Due date"
          value={
            certificate.due_date
              ? formatCertificateDate(certificate.due_date)
              : "No due date"
          }
        />
        <DetailItem
          label="Status"
          value={<PortalExpiryBadge status="active" dueDate={certificate.due_date} />}
        />
      </dl>

      <div className="flex flex-wrap gap-3">
        <a
          href={`/api/portal/certificates/${certificate.id}/signed-url?intent=view`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          View PDF
        </a>
        <a
          href={`/api/portal/certificates/${certificate.id}/signed-url?intent=download`}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
        >
          Download PDF
        </a>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 text-zinc-900 dark:text-zinc-100">{value}</dd>
    </div>
  );
}
