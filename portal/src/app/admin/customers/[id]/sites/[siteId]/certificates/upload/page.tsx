import { notFound } from "next/navigation";
import { CertificateUploadForm } from "@/components/admin/certificate-upload-form";
import { one } from "@/lib/admin/embed";
import { requireAdminSupabase } from "@/lib/auth/require-session";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function SiteCertificateUploadPage({
  params,
}: {
  params: Promise<{ id: string; siteId: string }>;
}) {
  const { id: companyId, siteId } = await params;
  if (!UUID_RE.test(companyId) || !UUID_RE.test(siteId)) notFound();

  const { supabase } = await requireAdminSupabase();
  const { data: site } = await supabase
    .from("sites")
    .select(
      "id, company_id, site_name, status, companies(id, customer_id_readable, company_name, status)"
    )
    .eq("id", siteId)
    .eq("company_id", companyId)
    .maybeSingle();

  const company = site ? one(site.companies) : null;
  if (!site || !company) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Upload certificate for {site.site_name}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Site-scoped upload for {company.company_name}.
        </p>
      </div>

      <CertificateUploadForm
        apiPath="/api/admin/certificates/upload"
        backHref={`/admin/customers/${companyId}/sites/${siteId}/certificates`}
        cancelHref={`/admin/customers/${companyId}/sites/${siteId}/certificates`}
        companies={[
          {
            id: company.id,
            companyName: company.company_name,
            customerIdReadable: company.customer_id_readable,
            status: company.status,
          },
        ]}
        sites={[
          {
            id: site.id,
            companyId: site.company_id,
            siteName: site.site_name,
            status: site.status,
          },
        ]}
        defaultCompanyId={company.id}
        defaultSiteId={site.id}
        lockCompany
        lockSite
        helperText="This flow publishes a site-level certificate and keeps the PDF private behind admin-only signed URLs."
      />
    </div>
  );
}
