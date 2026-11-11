import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import { canEditInternalAdmin } from "@/lib/auth/admin-permissions";
import { one } from "@/lib/admin/embed";
import { loadManagedBy, loadManagerAssignments } from "@/lib/admin/manager-access";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { supabase, profile: actor } = await requireAdminSupabase();
  const { data: p } = await supabase
    .from("profiles")
    .select("*, companies(company_name)")
    .eq("id", id)
    .maybeSingle();

  if (!p) notFound();

  const co = one(p.companies) as { company_name: string } | null;

  const [{ data: access }, managedBy, managerAccess] = await Promise.all([
    supabase
      .from("user_site_access")
      .select("id, access_type, company_id, site_id, companies(company_name, customer_id_readable), sites(site_name)")
      .eq("user_id", id),
    p.role === "customer_user" ? loadManagedBy(supabase, id) : Promise.resolve([]),
    p.role === "site_manager"
      ? loadManagerAssignments(supabase, id)
      : Promise.resolve({ assignments: [], error: null }),
  ]);
  const pendingExpansions = managerAccess.assignments.reduce((n, a) => n + a.pending.length, 0);

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        ← Users
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{p.email}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {p.username ? (
              <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{p.username}</span>
            ) : null}
            {p.username ? " · " : ""}
            {p.role}
            {p.role === "oakrange_admin" && p.admin_level
              ? ` · ${p.admin_level === "super_admin" ? "Super Admin" : "Admin"}`
              : ""}
            {!p.is_active ? " · inactive" : ""}
          </p>
          <p className="mt-1 text-sm text-zinc-500">Business name: {p.full_name || "—"}</p>
          <p className="mt-1 text-sm text-zinc-500">Company on profile: {co?.company_name ?? "—"}</p>
        </div>
        {p.role !== "oakrange_admin" || canEditInternalAdmin(actor) ? (
          <Link
            href={`/admin/users/${id}/edit`}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
          >
            Edit user
          </Link>
        ) : null}
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
                    {one(row.companies)?.customer_id_readable ? ` (${one(row.companies)?.customer_id_readable})` : ""}
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

      {p.role === "customer_user" ? (
        <section>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Managed by</h2>
          {managedBy.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">Not assigned to any manager.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {managedBy.map((m) => (
                <li key={m.assignmentId}>
                  <Link href={`/admin/users/${m.managerId}`} className="hover:underline">
                    {m.managerLabel}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {p.role === "site_manager" ? (
        <section>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Manager access</h2>
          {managerAccess.assignments.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">No customer users assigned.</p>
          ) : (
            <ul className="mt-2 divide-y divide-zinc-200 rounded-lg border border-zinc-200 text-sm dark:divide-zinc-800 dark:border-zinc-800">
              {managerAccess.assignments.map((a) => (
                <li key={a.id} className="bg-white px-3 py-2 dark:bg-zinc-950">
                  <span className="font-medium">{a.user.name || a.user.email}</span>
                  {a.user.companyLabel ? ` · ${a.user.companyLabel}` : ""}
                  <span className="text-zinc-500">
                    {" "}
                    · {a.scopes.length} approved {a.scopes.length === 1 ? "scope" : "scopes"}
                  </span>
                  {!a.user.isActive ? <span className="text-amber-700"> · user deactivated</span> : null}
                </li>
              ))}
            </ul>
          )}
          {pendingExpansions > 0 ? (
            <p className="mt-2 text-sm text-amber-800">
              {pendingExpansions} pending expansion{pendingExpansions === 1 ? "" : "s"} awaiting approval.
            </p>
          ) : null}
          <Link
            href={`/admin/users/${id}/edit#manager-access`}
            className="mt-2 inline-block text-sm font-medium hover:underline"
          >
            Manage assignments →
          </Link>
        </section>
      ) : null}
    </div>
  );
}
