import Link from "next/link";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import { isSuperAdmin } from "@/lib/auth/admin-permissions";
import { mapCompanySearchRow } from "@/lib/admin/company-search";
import { creatableRolesForActor } from "@/lib/admin/validation";
import { UserCreateForm } from "@/components/admin/user-create-form";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Props = { searchParams: Promise<{ companyId?: string }> };

export default async function AdminNewUserPage({ searchParams }: Props) {
  const { supabase, profile: actor } = await requireAdminSupabase();
  const sp = await searchParams;
  const companyId = sp.companyId && UUID_RE.test(sp.companyId) ? sp.companyId : null;

  let initialCompany = null;
  if (companyId) {
    const { data } = await supabase
      .from("companies")
      .select("id, customer_id_readable, company_name, status")
      .eq("id", companyId)
      .maybeSingle();
    if (data) initialCompany = mapCompanySearchRow(data);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
          ← Users
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">New user</h1>
      </div>
      <UserCreateForm
        initialCompany={initialCompany}
        creatableRoles={creatableRolesForActor(actor)}
        actorIsSuperAdmin={isSuperAdmin(actor)}
      />
    </div>
  );
}
