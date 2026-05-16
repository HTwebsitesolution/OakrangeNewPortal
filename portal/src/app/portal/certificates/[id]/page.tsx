import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { one } from "@/lib/admin/embed";
import { getCertificateDocumentTypeLabel } from "@/lib/certificates/document-types";
import { formatCertificateDate } from "@/lib/certificates/format";
import { requirePortalSupabase } from "@/lib/auth/require-session";
import { getPortalCertificateById } from "@/lib/certificates/portal-queries";
import { PortalCertificateStickyBar } from "@/components/portal/portal-certificate-sticky-bar";
import { PortalExpiryBadge } from "@/components/portal/portal-expiry-badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { brand } from "@/lib/copy/brand";
import { cardClass } from "@/lib/ui/classes";
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
      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
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
    <div className="space-y-6 pb-28 lg:pb-6">
      <Link
        href="/portal/certificates"
        className="text-sm font-medium text-oak-muted hover:text-oak-orange"
      >
        ← {brand.portal.detailBack}
      </Link>

      <PageHeader
        title={certificate.display_title}
        description={getCertificateDocumentTypeLabel(
          certificate.document_type as CertificateDocumentType
        )}
      />

      <dl className={`${cardClass} grid gap-4 p-5 text-sm sm:grid-cols-2`}>
        <DetailItem label="Customer" value={company?.company_name ?? "—"} />
        <DetailItem label="Site" value={site?.site_name ?? "Company-level"} />
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

      <div className="hidden flex-wrap gap-3 lg:flex">
        <Button
          href={`/api/portal/certificates/${certificate.id}/signed-url?intent=view`}
          variant="secondary"
          target="_blank"
          rel="noopener noreferrer"
        >
          {brand.portal.mobileViewPdf}
        </Button>
        <Button
          href={`/api/portal/certificates/${certificate.id}/signed-url?intent=download`}
          variant="primary"
        >
          {brand.portal.mobileDownload}
        </Button>
      </div>

      <PortalCertificateStickyBar certificateId={certificate.id} />
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
      <dt className="text-xs font-semibold uppercase tracking-wide text-oak-muted">{label}</dt>
      <dd className="mt-1 text-oak-charcoal">{value}</dd>
    </div>
  );
}
