import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerDeleteForm } from "@/components/admin/customer-delete-form";
import { CustomerDetailTabs } from "@/components/admin/customer-detail-tabs";
import { Button } from "@/components/ui/button";
import { requireAdminSupabase } from "@/lib/auth/require-session";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function CustomerDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { supabase } = await requireAdminSupabase();
  const { data: company, error } = await supabase
    .from("companies")
    .select(
      "id, customer_id_readable, company_name, status, primary_contact_email, town_city, postcode"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !company) notFound();

  const [
    { count: siteCount },
    { count: certificateCount },
    { count: userCount },
  ] = await Promise.all([
    supabase.from("sites").select("*", { count: "exact", head: true }).eq("company_id", id),
    supabase
      .from("certificate_documents")
      .select("*", { count: "exact", head: true })
      .eq("company_id", id),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("company_id", id),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/customers"
        className="text-sm font-medium text-oak-muted hover:text-oak-orange"
      >
        ← Customers
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-oak-navy">
            {company.company_name}
          </h1>
          <p className="mt-1 text-sm text-oak-muted">
            {company.customer_id_readable}
            <span className="mx-2">·</span>
            <span className="capitalize">{company.status}</span>
          </p>
        </div>
        <Button href={`/admin/customers/${id}/edit`} variant="secondary">
          Edit customer
        </Button>
      </div>
      <CustomerDetailTabs companyId={id} />
      {children}
      <CustomerDeleteForm
        companyId={id}
        companyName={company.company_name}
        customerIdReadable={company.customer_id_readable}
        siteCount={siteCount ?? 0}
        certificateCount={certificateCount ?? 0}
        userCount={userCount ?? 0}
      />
    </div>
  );
}
