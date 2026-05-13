import Link from "next/link";
import { requireAdminSupabase } from "@/lib/auth/require-session";

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdminSupabase();

  const [
    activeCustomers,
    activeSites,
    totalUsers,
    totalCerts,
    recentCompanies,
    recentProfiles,
  ] = await Promise.all([
    supabase
      .from("companies")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase.from("sites").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("certificate_documents").select("*", { count: "exact", head: true }),
    supabase
      .from("companies")
      .select("id, company_name, customer_id_readable, created_at, status")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at, is_active")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const ac = activeCustomers.count ?? 0;
  const as = activeSites.count ?? 0;
  const tu = totalUsers.count ?? 0;
  const tc = totalCerts.count ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Admin dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Overview of customers, sites, and users. Certificate uploads are Phase 5.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active customers" value={ac} href="/admin/customers" />
        <StatCard label="Active sites" value={as} href="/admin/sites" />
        <StatCard label="Users" value={tu} href="/admin/users" />
        <StatCard label="Certificate documents" value={tc} href="/admin/certificates" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Recently created customers
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(recentCompanies.data ?? []).map((c) => (
              <li key={c.id} className="flex justify-between gap-2">
                <Link href={`/admin/customers/${c.id}`} className="font-medium text-zinc-800 hover:underline dark:text-zinc-100">
                  {c.company_name}
                </Link>
                <span className="shrink-0 text-xs text-zinc-500">{c.customer_id_readable}</span>
              </li>
            ))}
            {(recentCompanies.data ?? []).length === 0 ? (
              <li className="text-zinc-500">No customers yet.</li>
            ) : null}
          </ul>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Recently created users
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(recentProfiles.data ?? []).map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2">
                <Link href={`/admin/users/${p.id}`} className="font-medium text-zinc-800 hover:underline dark:text-zinc-100">
                  {p.email}
                </Link>
                <span className="text-xs text-zinc-500">
                  {p.role}
                  {!p.is_active ? " · inactive" : ""}
                </span>
              </li>
            ))}
            {(recentProfiles.data ?? []).length === 0 ? (
              <li className="text-zinc-500">No users yet.</li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Expiring soon</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Phase 5 will list certificates approaching <code className="text-xs">due_date</code>. No
            data-driven list in Phase 4.
          </p>
          <Link
            href="/admin/expiring-soon"
            className="mt-3 inline-block text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
          >
            Open placeholder page
          </Link>
        </div>
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Recent uploads</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Phase 5 will show latest certificate uploads. Total documents in database:{" "}
            <strong>{tc}</strong>.
          </p>
          <Link
            href="/admin/certificates"
            className="mt-3 inline-block text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
          >
            Certificates (placeholder)
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
    </Link>
  );
}
