import { notFound } from "next/navigation";
import { CertificateUploadForm } from "@/components/admin/certificate-upload-form";
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
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Upload certificate
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Publish a company-level or site-level certificate into private storage.
        </p>
      </div>

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
        helperText="Uploads stay private in Supabase Storage and are only exposed through admin-only signed URLs."
      />
    </div>
  );
}
