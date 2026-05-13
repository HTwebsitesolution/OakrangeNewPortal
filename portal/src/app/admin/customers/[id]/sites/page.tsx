import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSupabase } from "@/lib/auth/require-session";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function CustomerSitesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: companyId } = await params;
  if (!UUID_RE.test(companyId)) notFound();

  const { supabase } = await requireAdminSupabase();
  const { data: company } = await supabase
    .from("companies")
    .select("id, company_name")
    .eq("id", companyId)
    .maybeSingle();
  if (!company) notFound();

  const { data: sites } = await supabase
    .from("sites")
    .select("id, site_name, status, town_city, postcode")
    .eq("company_id", companyId)
    .order("site_name");

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Sites</h2>
        <Link
          href={`/admin/customers/${companyId}/sites/new`}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          New site
        </Link>
      </div>
      <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {(sites ?? []).map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-3 dark:bg-zinc-950">
            <div>
              <Link
                href={`/admin/customers/${companyId}/sites/${s.id}`}
                className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
              >
                {s.site_name}
              </Link>
              <p className="text-xs text-zinc-500">
                {s.status}
                {s.town_city || s.postcode
                  ? ` · ${[s.town_city, s.postcode].filter(Boolean).join(" ")}`
                  : ""}
              </p>
            </div>
            <Link
              href={`/admin/customers/${companyId}/sites/${s.id}/edit`}
              className="text-sm text-zinc-700 underline dark:text-zinc-300"
            >
              Edit
            </Link>
          </li>
        ))}
      </ul>
      {(sites ?? []).length === 0 ? (
        <p className="text-sm text-zinc-500">No sites yet. Create the first site for this customer.</p>
      ) : null}
    </div>
  );
}
