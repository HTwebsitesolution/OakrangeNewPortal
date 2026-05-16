import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Alert } from "@/components/ui/alert";
import { brand } from "@/lib/copy/brand";
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
        eyebrow={brand.admin.dashboardEyebrow}
        title={brand.admin.dashboardTitle}
        description={brand.admin.dashboardLead}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button href="/admin/certificates/upload" variant="primary" className="min-h-11 sm:order-2">
              {brand.admin.uploadPrimary}
            </Button>
            <Button href="/admin/customers/new" variant="secondary" className="min-h-11 sm:order-1">
              Add customer
            </Button>
            <Button href="/admin/audit-logs" variant="secondary" className="min-h-11 sm:order-3">
              Audit logs
            </Button>
          </div>
        }
      />

      {expiringRows.length > 0 ? (
        <Alert variant="warning">
          <p className="font-medium">
            {expiringRows.length} certificate{expiringRows.length === 1 ? "" : "s"} due within 30 days
          </p>
          <p className="mt-1 text-sm">
            Review expiring calibrations and notify customers before certificates lapse.
          </p>
          <Link
            href="/admin/expiring-soon"
            className="mt-2 inline-block text-sm font-semibold text-oak-orange hover:underline"
          >
            View expiring certificates →
          </Link>
        </Alert>
      ) : null}

      <section aria-label="Key metrics">
        <h2 className="sr-only">Key metrics</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard label="Customers" value={ac} href="/admin/customers" accent="orange" />
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
      </section>

      <section className="space-y-4" aria-label="Operational priority">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-oak-muted">
          Operational priority
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard
            title={brand.admin.attentionTitle}
            description="Due within the next 30 days"
            href="/admin/expiring-soon"
            priority={expiringRows.length > 0 ? "attention" : "default"}
          >
            <ActivityList
              empty={brand.admin.attentionEmpty}
              items={expiringRows.map((cert) => {
                const company = Array.isArray(cert.companies)
                  ? cert.companies[0]
                  : cert.companies;
                return {
                  id: cert.id,
                  href: `/admin/certificates/${cert.id}`,
                  title: cert.display_title,
                  meta: `${company?.company_name ?? "—"} · due ${cert.due_date}`,
                };
              })}
            />
          </SectionCard>

          <SectionCard
            title={brand.admin.recentUploadsTitle}
            description="Latest published and draft uploads"
            href="/admin/certificates"
          >
            <ActivityList
              empty="No certificates uploaded yet."
              items={(recentCertificates.data ?? []).map((cert) => {
                const company = Array.isArray(cert.companies)
                  ? cert.companies[0]
                  : cert.companies;
                const site = Array.isArray(cert.sites) ? cert.sites[0] : cert.sites;
                return {
                  id: cert.id,
                  href: `/admin/certificates/${cert.id}`,
                  title: cert.display_title,
                  meta: `${company?.company_name ?? "—"}${site?.site_name ? ` · ${site.site_name}` : ""} · ${cert.status}${!cert.published_at ? " · draft" : ""}`,
                };
              })}
            />
          </SectionCard>
        </div>
      </section>

      <section className="space-y-4" aria-label="Directory">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-oak-muted">Directory</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title={brand.admin.customersTitle} href="/admin/customers">
            <ActivityList
              empty="No customers yet."
              items={(recentCompanies.data ?? []).map((c) => ({
                id: c.id,
                href: `/admin/customers/${c.id}`,
                title: c.company_name,
                meta: c.customer_id_readable,
              }))}
            />
          </SectionCard>

          <SectionCard title={brand.admin.usersTitle} href="/admin/users">
            <ActivityList
              empty="No users yet."
              items={(recentProfiles.data ?? []).map((p) => ({
                id: p.id,
                href: `/admin/users/${p.id}`,
                title: p.email,
                meta: `${p.role}${!p.is_active ? " · inactive" : ""}`,
              }))}
            />
          </SectionCard>
        </div>
      </section>
    </div>
  );
}

function ActivityList({
  items,
  empty,
}: {
  items: Array<{ id: string; href: string; title: string; meta: string }>;
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-oak-muted">{empty}</p>;
  }

  return (
    <ul className="space-y-3 text-sm">
      {items.map((item) => (
        <li key={item.id} className="border-b border-oak-border/60 pb-3 last:border-0 last:pb-0">
          <Link href={item.href} className="font-medium text-oak-navy hover:text-oak-orange">
            {item.title}
          </Link>
          <p className="mt-0.5 text-xs text-oak-muted">{item.meta}</p>
        </li>
      ))}
    </ul>
  );
}

