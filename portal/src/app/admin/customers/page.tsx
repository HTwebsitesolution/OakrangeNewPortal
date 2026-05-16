import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import {
  inputClass,
  tableBodyClass,
  tableClass,
  tableHeadClass,
  tableShellClass,
  tableTdClass,
  tableThClass,
} from "@/lib/ui/classes";

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
        <PageHeader title="Customers" />
        <p className="mt-2 text-sm text-oak-danger">{error.message}</p>
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
      <PageHeader
        title="Customers"
        description="Search by customer ID, company name, contact, email, or postcode."
        actions={<Button href="/admin/customers/new">New customer</Button>}
      />

      <form method="get" className="flex max-w-md gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search…"
          className={inputClass.replace("mt-1 ", "")}
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <div className={tableShellClass}>
        <table className={tableClass}>
          <thead className={tableHeadClass}>
            <tr>
              <th className={tableThClass}>Customer ID</th>
              <th className={tableThClass}>Company</th>
              <th className={tableThClass}>Contact</th>
              <th className={tableThClass}>Postcode</th>
              <th className={tableThClass}>Status</th>
            </tr>
          </thead>
          <tbody className={tableBodyClass}>
            {filteredCompanies.map((c) => (
              <tr key={c.id}>
                <td className={`${tableTdClass} font-mono text-xs`}>
                  <Link
                    href={`/admin/customers/${c.id}`}
                    className="font-medium text-oak-navy hover:text-oak-orange"
                  >
                    {c.customer_id_readable}
                  </Link>
                </td>
                <td className={tableTdClass}>
                  <Link
                    href={`/admin/customers/${c.id}`}
                    className="font-medium text-oak-navy hover:text-oak-orange"
                  >
                    {c.company_name}
                  </Link>
                </td>
                <td className={`${tableTdClass} text-oak-muted`}>
                  {c.primary_contact_name || "—"}
                  {c.primary_contact_email ? (
                    <span className="block text-xs">{c.primary_contact_email}</span>
                  ) : null}
                </td>
                <td className={`${tableTdClass} text-oak-muted`}>{c.postcode || "—"}</td>
                <td className={tableTdClass}>
                  <span
                    className={
                      c.status === "active" ? "font-medium text-oak-success" : "text-oak-muted"
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
          <p className="p-4 text-sm text-oak-muted">No customers match your search.</p>
        ) : null}
      </div>
    </div>
  );
}

