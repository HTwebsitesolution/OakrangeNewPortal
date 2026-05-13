import Link from "next/link";
import { requireAdminSupabase } from "@/lib/auth/require-session";

type Props = { searchParams: Promise<{ q?: string }> };

function normalizeSearchValue(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export default async function AdminCustomersPage({ searchParams }: Props) {
  const { supabase } = await requireAdminSupabase();
  const { q: rawQ } = await searchParams;
  const q = rawQ?.trim() ?? "";

  const query = supabase
    .from("companies")
    .select(
      "id, customer_id_readable, company_name, primary_contact_name, primary_contact_email, postcode, status, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: companies, error } = await query;

  if (error) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Customers</h1>
        <p className="mt-2 text-sm text-red-600">{error.message}</p>
      </div>
    );
  }

  const normalizedQ = normalizeSearchValue(q);
  const filteredCompanies = (companies ?? []).filter((company) => {
    if (!normalizedQ) return true;

    const searchable = normalizeSearchValue(
      [
        company.customer_id_readable,
        company.company_name,
        company.primary_contact_name,
        company.primary_contact_email,
        company.postcode,
      ]
        .filter(Boolean)
        .join(" ")
    );

    return searchable.includes(normalizedQ);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Customers</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Search by customer ID, company name, contact, email, or postcode.
          </p>
        </div>
        <Link
          href="/admin/customers/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          New customer
        </Link>
      </div>

      <form method="get" className="flex max-w-md gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search…"
          className="min-w-0 flex-1 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
        <button
          type="submit"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
        >
          Search
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-100 text-xs font-medium uppercase text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2">Customer ID</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Contact</th>
              <th className="px-3 py-2">Postcode</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredCompanies.map((c) => (
              <tr key={c.id} className="bg-white dark:bg-zinc-950">
                <td className="px-3 py-2 font-mono text-xs">
                  <Link href={`/admin/customers/${c.id}`} className="text-zinc-900 underline dark:text-zinc-100">
                    {c.customer_id_readable}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/admin/customers/${c.id}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
                    {c.company_name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                  {c.primary_contact_name || "—"}
                  {c.primary_contact_email ? (
                    <span className="block text-xs">{c.primary_contact_email}</span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-zinc-600">{c.postcode || "—"}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      c.status === "active"
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-zinc-500"
                    }
                  >
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredCompanies.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500">No customers match your search.</p>
        ) : null}
      </div>
    </div>
  );
}
