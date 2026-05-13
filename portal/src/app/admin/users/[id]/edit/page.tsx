import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import { UserEditForm } from "@/components/admin/user-edit-form";
import { AccessGrantsPanel, type AccessRow } from "@/components/admin/access-grants-panel";
import { one } from "@/lib/admin/embed";
import type { UserRole } from "@/types/profile";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AdminUserEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { supabase } = await requireAdminSupabase();

  const { data: p } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!p) notFound();

  const [{ data: companies }, { data: sites }, { data: accessRows }] = await Promise.all([
    supabase.from("companies").select("id, company_name").order("company_name"),
    supabase.from("sites").select("id, company_id, site_name").order("site_name").limit(500),
    supabase
      .from("user_site_access")
      .select("id, access_type, company_id, site_id, companies(company_name), sites(site_name)")
      .eq("user_id", id),
  ]);

  const accessTyped: AccessRow[] = (accessRows ?? []).map((r) => ({
    id: r.id,
    access_type: r.access_type as "company" | "site",
    company_id: r.company_id,
    site_id: r.site_id,
    companies: one(r.companies) as { company_name: string } | null,
    sites: one(r.sites) as { site_name: string } | null,
  }));

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/admin/users/${id}`} className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
          ← User
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Edit user</h1>
      </div>

      <UserEditForm
        profileId={p.id}
        defaultEmail={p.email}
        defaultFullName={p.full_name}
        defaultRole={p.role as UserRole}
        defaultCompanyId={p.company_id}
        defaultIsActive={p.is_active}
        companies={companies ?? []}
      />

      <section className="border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Site & company access</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Grants control certificate visibility for customer roles (see RLS). Changing profile company
          clears existing grants — re-apply if needed.
        </p>
        <div className="mt-4">
          <AccessGrantsPanel
            targetProfileId={p.id}
            targetRole={p.role as UserRole}
            companies={companies ?? []}
            sites={sites ?? []}
            accessRows={accessTyped}
          />
        </div>
      </section>
    </div>
  );
}
