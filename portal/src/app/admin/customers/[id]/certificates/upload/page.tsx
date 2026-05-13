import { notFound } from "next/navigation";
import { CertificateUploadForm } from "@/components/admin/certificate-upload-form";
import { requireAdminSupabase } from "@/lib/auth/require-session";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function CustomerCertificateUploadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { supabase } = await requireAdminSupabase();
  const [{ data: company }, { data: sites, error: sitesError }] =
    await Promise.all([
      supabase
        .from("companies")
        .select("id, customer_id_readable, company_name, status")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("sites")
        .select("id, company_id, site_name, status")
        .eq("company_id", id)
        .order("site_name"),
    ]);

  if (!company || sitesError) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Upload certificate for {company.company_name}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Customer-scoped upload with optional site targeting.
        </p>
      </div>

      <CertificateUploadForm
        apiPath="/api/admin/certificates/upload"
        backHref={`/admin/customers/${id}/certificates`}
        cancelHref={`/admin/customers/${id}/certificates`}
        companies={[
          {
            id: company.id,
            companyName: company.company_name,
            customerIdReadable: company.customer_id_readable,
            status: company.status,
          },
        ]}
        sites={(sites ?? []).map((site) => ({
          id: site.id,
          companyId: site.company_id,
          siteName: site.site_name,
          status: site.status,
        }))}
        defaultCompanyId={company.id}
        lockCompany
        helperText="Choose a site only when the certificate is specific to a single site. Leave it blank for a company-level document."
      />
    </div>
  );
}
