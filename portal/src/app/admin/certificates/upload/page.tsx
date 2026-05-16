import { notFound } from "next/navigation";
import { CertificateUploadForm } from "@/components/admin/certificate-upload-form";
import { PageHeader } from "@/components/ui/page-header";
import { brand } from "@/lib/copy/brand";
import { requireAdminSupabase } from "@/lib/auth/require-session";

export default async function AdminCertificateUploadPage() {
  const { supabase } = await requireAdminSupabase();
  const [{ data: companies, error: companiesError }, { data: sites, error: sitesError }] =
    await Promise.all([
      supabase
        .from("companies")
        .select("id, customer_id_readable, company_name, status")
        .order("customer_id_readable"),
      supabase
        .from("sites")
        .select("id, company_id, site_name, status")
        .order("site_name"),
    ]);

  if (companiesError || sitesError) {
    notFound();
  }

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
        companies={(companies ?? []).map((company) => ({
          id: company.id,
          companyName: company.company_name,
          customerIdReadable: company.customer_id_readable,
          status: company.status,
        }))}
        sites={(sites ?? []).map((site) => ({
          id: site.id,
          companyId: site.company_id,
          siteName: site.site_name,
          status: site.status,
        }))}
        helperText={brand.admin.uploadHelper}
      />
    </div>
  );
}
