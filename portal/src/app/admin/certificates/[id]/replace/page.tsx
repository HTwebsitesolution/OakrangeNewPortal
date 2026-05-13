import { notFound } from "next/navigation";
import { CertificateUploadForm } from "@/components/admin/certificate-upload-form";
import { one } from "@/lib/admin/embed";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import { loadCertificateForAdmin } from "@/lib/certificates/service";
import type { CertificateDocumentType } from "@/lib/certificates/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ReplaceCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { supabase } = await requireAdminSupabase();
  const { certificate, error } = await loadCertificateForAdmin(supabase, id);
  if (error || !certificate) notFound();

  const company = one(certificate.companies);
  const site = one(certificate.sites);
  if (!company) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Replace certificate
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Publish a replacement PDF for the existing certificate while keeping the historical row and
          file.
        </p>
      </div>

      <CertificateUploadForm
        apiPath={`/api/admin/certificates/${certificate.id}/replace`}
        backHref={`/admin/certificates/${certificate.id}`}
        cancelHref={`/admin/certificates/${certificate.id}`}
        companies={[
          {
            id: company.id,
            companyName: company.company_name,
            customerIdReadable: company.customer_id_readable,
            status: company.status,
          },
        ]}
        sites={
          site
            ? [
                {
                  id: site.id,
                  companyId: company.id,
                  siteName: site.site_name,
                  status: site.status,
                },
              ]
            : []
        }
        defaultCompanyId={company.id}
        defaultSiteId={site?.id ?? null}
        defaultDocumentType={certificate.document_type as CertificateDocumentType}
        defaultIssueDate={certificate.issue_date}
        defaultDueDate={certificate.due_date}
        defaultNotes={certificate.notes}
        defaultTags={certificate.search_tags ?? []}
        lockCompany
        lockSite
        lockDocumentType
        submitLabel="Publish replacement certificate"
        helperText="The existing certificate will be marked as replaced after the new document has been published."
      />
    </div>
  );
}
