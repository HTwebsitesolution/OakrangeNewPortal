import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import { CustomerDetailTabs } from "@/components/admin/customer-detail-tabs";

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

  return (
    <div className="space-y-2">
      <Link href="/admin/customers" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        ← Customers
      </Link>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {company.company_name}
          </h1>
          <p className="text-sm text-zinc-500">
            {company.customer_id_readable}
            <span className="mx-2">·</span>
            <span>{company.status}</span>
          </p>
        </div>
        <Link
          href={`/admin/customers/${id}/edit`}
          className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          Edit customer
        </Link>
      </div>
      <CustomerDetailTabs companyId={id} />
      {children}
    </div>
  );
}
