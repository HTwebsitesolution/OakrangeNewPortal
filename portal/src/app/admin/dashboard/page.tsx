import Link from "next/link";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import { isCertificateExpiringSoon, startOfUtcDay } from "@/lib/certificates/format";

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdminSupabase();
  const today = startOfUtcDay().toISOString().slice(0, 10);
  const in30Days = new Date(startOfUtcDay());
  in30Days.setUTCDate(in30Days.getUTCDate() + 30);
  const in30Iso = in30Days.toISOString().slice(0, 10);

  const [
    activeCustomers,
    activeSites,
    totalUsers,
    totalCerts,
    recentCompanies,
    recentProfiles,
    recentCertificates,
    expiringSoon,
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
    supabase
      .from("certificate_documents")
      .select(
        "id, display_title, uploaded_at, status, published_at, companies(company_name), sites(site_name)"
      )
      .order("uploaded_at", { ascending: false })
      .limit(5),
    supabase
      .from("certificate_documents")
      .select("id, display_title, due_date, status, companies(company_name)")
      .eq("status", "active")
      .not("published_at", "is", null)
      .not("due_date", "is", null)
      .gte("due_date", today)
      .lte("due_date", in30Iso)
      .order("due_date", { ascending: true })
      .limit(5),
  ]);

  const ac = activeCustomers.count ?? 0;
  const as = activeSites.count ?? 0;
  const tu = totalUsers.count ?? 0;
  const tc = totalCerts.count ?? 0;
  const expiringRows = (expiringSoon.data ?? []).filter((row) =>
    isCertificateExpiringSoon({ status: "active", dueDate: row.due_date })
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Admin dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Manage customers, certificates, users, and review activity. Use{" "}
          <Link href="/admin/customers" className="font-medium underline">
            Customers
          </Link>{" "}
          to search by company name or ID.
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
                <Link
                  href={`/admin/customers/${c.id}`}
                  className="font-medium text-zinc-800 hover:underline dark:text-zinc-100"
                >
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
                <Link
                  href={`/admin/users/${p.id}`}
                  className="font-medium text-zinc-800 hover:underline dark:text-zinc-100"
                >
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
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Recent uploads</h2>
            <Link
              href="/admin/certificates"
              className="text-xs font-medium text-zinc-700 underline dark:text-zinc-300"
            >
              View all
            </Link>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {(recentCertificates.data ?? []).map((cert) => {
              const company = Array.isArray(cert.companies)
                ? cert.companies[0]
                : cert.companies;
              const site = Array.isArray(cert.sites) ? cert.sites[0] : cert.sites;
              return (
                <li key={cert.id}>
                  <Link
                    href={`/admin/certificates/${cert.id}`}
                    className="font-medium text-zinc-800 hover:underline dark:text-zinc-100"
                  >
                    {cert.display_title}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    {company?.company_name ?? "—"}
                    {site?.site_name ? ` · ${site.site_name}` : ""} · {cert.status}
                    {!cert.published_at ? " · draft" : ""}
                  </p>
                </li>
              );
            })}
            {(recentCertificates.data ?? []).length === 0 ? (
              <li className="text-zinc-500">No certificates uploaded yet.</li>
            ) : null}
          </ul>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Expiring soon</h2>
            <Link
              href="/admin/expiring-soon"
              className="text-xs font-medium text-zinc-700 underline dark:text-zinc-300"
            >
              View list
            </Link>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {expiringRows.map((cert) => {
              const company = Array.isArray(cert.companies)
                ? cert.companies[0]
                : cert.companies;
              return (
                <li key={cert.id}>
                  <Link
                    href={`/admin/certificates/${cert.id}`}
                    className="font-medium text-zinc-800 hover:underline dark:text-zinc-100"
                  >
                    {cert.display_title}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    {company?.company_name ?? "—"} · due {cert.due_date}
                  </p>
                </li>
              );
            })}
            {expiringRows.length === 0 ? (
              <li className="text-zinc-500">No certificates due in the next 30 days.</li>
            ) : null}
          </ul>
        </div>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/admin/audit-logs" className="font-medium underline">
          Audit logs
        </Link>{" "}
        record certificate views, downloads, and admin changes.
      </p>
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
