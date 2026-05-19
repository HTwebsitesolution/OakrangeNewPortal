import { CertificateUploadForm } from "@/components/admin/certificate-upload-form";
import { PageHeader } from "@/components/ui/page-header";
import { brand } from "@/lib/copy/brand";
import { requireAdminSupabase } from "@/lib/auth/require-session";

export default async function AdminCertificateUploadPage() {
  await requireAdminSupabase();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={brand.admin.dashboardEyebrow}
        title={brand.admin.uploadPageTitle}
        description={brand.admin.uploadPageLead}
      />

      <CertificateUploadForm
        apiPath="/api/admin/certificates/upload"
        backHref="/admin/certificates"
        cancelHref="/admin/certificates"
        companies={[]}
        sites={[]}
        enableCompanySearch
        helperText={brand.admin.uploadHelper}
      />
    </div>
  );
}
