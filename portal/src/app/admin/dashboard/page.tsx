import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { cardClass } from "@/lib/ui/classes";
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
      <PageHeader
        title="Admin dashboard"
        description="Operational overview — customers, certificates, users, and activity."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button href="/admin/customers/new" variant="secondary">
              Add customer
            </Button>
            <Button href="/admin/certificates/upload" variant="primary">
              Upload certificate
            </Button>
            <Button href="/admin/audit-logs" variant="secondary">
              Audit logs
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Customers" value={ac} href="/admin/customers" />
        <MetricCard label="Sites" value={as} href="/admin/sites" />
        <MetricCard label="Users" value={tu} href="/admin/users" />
        <MetricCard label="Certificates" value={tc} href="/admin/certificates" />
        <MetricCard
          label="Expiring soon"
          value={expiringRows.length}
          href="/admin/expiring-soon"
          accent="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Recently created customers" href="/admin/customers">
          <ul className="space-y-2 text-sm">
            {(recentCompanies.data ?? []).map((c) => (
              <li key={c.id} className="flex justify-between gap-2">
                <Link
                  href={`/admin/customers/${c.id}`}
                  className="font-medium text-oak-navy hover:text-oak-orange"
                >
                  {c.company_name}
                </Link>
                <span className="shrink-0 text-xs text-oak-muted">{c.customer_id_readable}</span>
              </li>
            ))}
            {(recentCompanies.data ?? []).length === 0 ? (
              <li className="text-oak-muted">No customers yet.</li>
            ) : null}
          </ul>
        </Panel>

        <Panel title="Recently created users" href="/admin/users">
          <ul className="space-y-2 text-sm">
            {(recentProfiles.data ?? []).map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2">
                <Link
                  href={`/admin/users/${p.id}`}
                  className="font-medium text-oak-navy hover:text-oak-orange"
                >
                  {p.email}
                </Link>
                <span className="text-xs text-oak-muted">
                  {p.role}
                  {!p.is_active ? " · inactive" : ""}
                </span>
              </li>
            ))}
            {(recentProfiles.data ?? []).length === 0 ? (
              <li className="text-oak-muted">No users yet.</li>
            ) : null}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Recent uploads" href="/admin/certificates">
          <ul className="space-y-2 text-sm">
            {(recentCertificates.data ?? []).map((cert) => {
              const company = Array.isArray(cert.companies)
                ? cert.companies[0]
                : cert.companies;
              const site = Array.isArray(cert.sites) ? cert.sites[0] : cert.sites;
              return (
                <li key={cert.id}>
                  <Link
                    href={`/admin/certificates/${cert.id}`}
                    className="font-medium text-oak-navy hover:text-oak-orange"
                  >
                    {cert.display_title}
                  </Link>
                  <p className="text-xs text-oak-muted">
                    {company?.company_name ?? "—"}
                    {site?.site_name ? ` · ${site.site_name}` : ""} · {cert.status}
                    {!cert.published_at ? " · draft" : ""}
                  </p>
                </li>
              );
            })}
            {(recentCertificates.data ?? []).length === 0 ? (
              <li className="text-oak-muted">No certificates uploaded yet.</li>
            ) : null}
          </ul>
        </Panel>

        <Panel title="Certificates needing attention" href="/admin/expiring-soon">
          <ul className="space-y-2 text-sm">
            {expiringRows.map((cert) => {
              const company = Array.isArray(cert.companies)
                ? cert.companies[0]
                : cert.companies;
              return (
                <li key={cert.id}>
                  <Link
                    href={`/admin/certificates/${cert.id}`}
                    className="font-medium text-oak-navy hover:text-oak-orange"
                  >
                    {cert.display_title}
                  </Link>
                  <p className="text-xs text-oak-muted">
                    {company?.company_name ?? "—"} · due {cert.due_date}
                  </p>
                </li>
              );
            })}
            {expiringRows.length === 0 ? (
              <li className="text-oak-muted">No certificates due in the next 30 days.</li>
            ) : null}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${cardClass} p-5`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-oak-navy">{title}</h2>
        <Link href={href} className="text-xs font-medium text-oak-orange hover:underline">
          View all
        </Link>
      </div>
      {children}
    </div>
  );
}
