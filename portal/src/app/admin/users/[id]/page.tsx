import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import { one } from "@/lib/admin/embed";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { supabase } = await requireAdminSupabase();
  const { data: p } = await supabase
    .from("profiles")
    .select("*, companies(company_name)")
    .eq("id", id)
    .maybeSingle();

  if (!p) notFound();

  const co = one(p.companies) as { company_name: string } | null;

  const { data: access } = await supabase
    .from("user_site_access")
    .select("id, access_type, company_id, site_id, companies(company_name), sites(site_name)")
    .eq("user_id", id);

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        ← Users
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{p.email}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {p.full_name} · {p.role}
            {!p.is_active ? " · inactive" : ""}
          </p>
          <p className="mt-1 text-sm text-zinc-500">Company on profile: {co?.company_name ?? "—"}</p>
        </div>
        <Link
          href={`/admin/users/${id}/edit`}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
        >
          Edit user
        </Link>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Access grants</h2>
        {p.role === "oakrange_admin" ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Admins do not use explicit access rows.
          </p>
        ) : (access ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No company or site grants. Edit the user to assign access.</p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-200 rounded-lg border border-zinc-200 text-sm dark:divide-zinc-800 dark:border-zinc-800">
            {(access ?? []).map((row) => (
              <li key={row.id} className="bg-white px-3 py-2 dark:bg-zinc-950">
                {row.access_type === "company" ? (
                  <>
                    Company — {one(row.companies)?.company_name}
                  </>
                ) : (
                  <>
                    Site — {one(row.sites)?.site_name}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
