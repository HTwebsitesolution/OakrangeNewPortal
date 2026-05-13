import { notFound } from "next/navigation";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import { CustomerForm } from "@/components/admin/customer-form";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { supabase } = await requireAdminSupabase();
  const { data: c } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();

  return (
    <div className="mt-6 space-y-6">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Edit customer</h2>
      <CustomerForm
        mode="edit"
        companyId={c.id}
        customerIdReadable={c.customer_id_readable}
        defaultValues={{
          company_name: c.company_name,
          primary_contact_name: c.primary_contact_name ?? "",
          primary_contact_email: c.primary_contact_email ?? "",
          phone: c.phone ?? "",
          address_line_1: c.address_line_1 ?? "",
          address_line_2: c.address_line_2 ?? "",
          town_city: c.town_city ?? "",
          postcode: c.postcode ?? "",
          status: c.status,
          notes: c.notes ?? "",
        }}
      />
    </div>
  );
}
