import Link from "next/link";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import { one } from "@/lib/admin/embed";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function AdminAllSitesPage({ searchParams }: Props) {
  const { supabase } = await requireAdminSupabase();
  const { q: rawQ } = await searchParams;
  const q = rawQ?.trim().toLowerCase() ?? "";

  const { data: sites, error } = await supabase
    .from("sites")
    .select("id, site_name, status, town_city, postcode, company_id, companies(company_name, customer_id_readable)")
    .order("site_name")
    .limit(400);

  if (error) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Sites</h1>
        <p className="mt-2 text-sm text-red-600">{error.message}</p>
      </div>
    );
  }

  const list = (sites ?? []).filter((s) => {
    if (!q) return true;
    const co = one(s.companies) as {
      company_name: string;
      customer_id_readable: string;
    } | null;
    const blob = `${s.site_name} ${co?.company_name ?? ""} ${co?.customer_id_readable ?? ""}`.toLowerCase();
    return blob.includes(q);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">All sites</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Manage individual sites from each{" "}
          <Link href="/admin/customers" className="underline">
            customer
          </Link>
          . Use this list to search across customers.
        </p>
      </div>
      <form method="get" className="flex max-w-md gap-2">
        <input
          name="q"
          defaultValue={rawQ}
          placeholder="Filter by site or customer…"
          className="min-w-0 flex-1 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
        <button type="submit" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600">
          Filter
        </button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-100 text-xs font-medium uppercase text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2">Site</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {list.map((s) => {
              const co = one(s.companies) as {
                company_name: string;
                customer_id_readable: string;
              } | null;
              return (
                <tr key={s.id} className="bg-white dark:bg-zinc-950">
                  <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-50">{s.site_name}</td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {co?.company_name ?? "—"}
                    {co?.customer_id_readable ? (
                      <span className="ml-2 font-mono text-xs">{co.customer_id_readable}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{s.status}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/customers/${s.company_id}/sites/${s.id}`}
                      className="text-zinc-900 underline dark:text-zinc-100"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 ? <p className="p-4 text-sm text-zinc-500">No sites match.</p> : null}
      </div>
    </div>
  );
}
