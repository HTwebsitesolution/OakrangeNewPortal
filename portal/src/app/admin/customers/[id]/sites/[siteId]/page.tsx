import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import { one } from "@/lib/admin/embed";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string; siteId: string }>;
}) {
  const { id: companyId, siteId } = await params;
  if (!UUID_RE.test(companyId) || !UUID_RE.test(siteId)) notFound();

  const { supabase } = await requireAdminSupabase();
  const { data: site } = await supabase
    .from("sites")
    .select("*")
    .eq("id", siteId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!site) notFound();

  const { data: siteRows } = await supabase
    .from("user_site_access")
    .select("id, access_type, site_id, user_id, profiles(id, email, full_name, role)")
    .eq("company_id", companyId)
    .or(`site_id.eq.${siteId},access_type.eq.company`);

  const usersMap = new Map<
    string,
    { id: string; email: string; full_name: string; role: string; via: string }
  >();

  for (const row of siteRows ?? []) {
    const p = one(row.profiles) as {
      id: string;
      email: string;
      full_name: string;
      role: string;
    } | null;
    if (!p?.id) continue;
    const via =
      row.access_type === "company" ? "Company-wide access" : "Site access";
    const prev = usersMap.get(p.id);
    if (!prev) usersMap.set(p.id, { ...p, via });
    else if (prev.via !== via) usersMap.set(p.id, { ...p, via: `${prev.via}; ${via}` });
  }

  const users = [...usersMap.values()];

  const { count: certificateCount } = await supabase
    .from("certificate_documents")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("site_id", siteId);

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/admin/customers/${companyId}/sites`} className="text-sm text-zinc-600 hover:underline">
          ← Sites
        </Link>
        <Link
          href={`/admin/customers/${companyId}/sites/${siteId}/edit`}
          className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          Edit site
        </Link>
      </div>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{site.site_name}</h2>

      <dl className="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <dt className="text-xs uppercase text-zinc-500">Status</dt>
          <dd className="font-medium">{site.status}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-zinc-500">Site contact</dt>
          <dd>
            {site.site_contact_name || "—"}
            {site.site_contact_email ? (
              <span className="block text-zinc-600">{site.site_contact_email}</span>
            ) : null}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase text-zinc-500">Address</dt>
          <dd>
            {[site.address_line_1, site.address_line_2, site.town_city, site.postcode]
              .filter(Boolean)
              .join(", ") || "—"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase text-zinc-500">Notes</dt>
          <dd className="whitespace-pre-wrap">{site.notes || "—"}</dd>
        </div>
      </dl>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Certificates
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {certificateCount ?? 0} certificate{certificateCount === 1 ? "" : "s"} linked to this
              site.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/admin/customers/${companyId}/sites/${siteId}/certificates`}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
            >
              View certificates
            </Link>
            <Link
              href={`/admin/customers/${companyId}/sites/${siteId}/certificates/upload`}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Upload certificate
            </Link>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Users with access</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Includes explicit site grants and company-wide grants for this customer (company-wide can
          see all sites per RLS).
        </p>
        <ul className="mt-2 divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap justify-between gap-2 bg-white px-3 py-2 text-sm dark:bg-zinc-950">
              <div>
                <Link href={`/admin/users/${u.id}`} className="font-medium hover:underline">
                  {u.email}
                </Link>
                <span className="ml-2 text-xs text-zinc-500">{u.role}</span>
              </div>
              <span className="text-xs text-zinc-500">{u.via}</span>
            </li>
          ))}
        </ul>
        {users.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No access grants reference this site yet.</p>
        ) : null}
      </section>
    </div>
  );
}
