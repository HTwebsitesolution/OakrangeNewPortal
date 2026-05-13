import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import { SiteForm } from "@/components/admin/site-form";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function EditSitePage({
  params,
}: {
  params: Promise<{ id: string; siteId: string }>;
}) {
  const { id: companyId, siteId } = await params;
  if (!UUID_RE.test(companyId) || !UUID_RE.test(siteId)) notFound();

  const { supabase } = await requireAdminSupabase();
  const { data: site } = await supabase
    .from("sites")
    .select("*")
    .eq("id", siteId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!site) notFound();

  return (
    <div className="mt-6 space-y-4">
      <Link href={`/admin/customers/${companyId}/sites/${siteId}`} className="text-sm text-zinc-600 hover:underline">
        ← {site.site_name}
      </Link>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Edit site</h2>
      <SiteForm
        mode="edit"
        companyId={companyId}
        siteId={siteId}
        cancelHref={`/admin/customers/${companyId}/sites/${siteId}`}
        defaultValues={{
          site_name: site.site_name,
          site_contact_name: site.site_contact_name ?? "",
          site_contact_email: site.site_contact_email ?? "",
          phone: site.phone ?? "",
          address_line_1: site.address_line_1 ?? "",
          address_line_2: site.address_line_2 ?? "",
          town_city: site.town_city ?? "",
          postcode: site.postcode ?? "",
          status: site.status,
          notes: site.notes ?? "",
        }}
      />
    </div>
  );
}
