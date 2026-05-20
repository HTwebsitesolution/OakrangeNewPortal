import Link from "next/link";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import { isSuperAdmin } from "@/lib/auth/admin-permissions";
import { mapCompanySearchRow } from "@/lib/admin/company-search";
import { creatableRolesForActor } from "@/lib/admin/validation";
import { CompanyUserCreateForm } from "@/components/admin/company-user-create-form";
import { UserCreateForm } from "@/components/admin/user-create-form";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Props = { searchParams: Promise<{ companyId?: string; mode?: string }> };

export default async function AdminNewUserPage({ searchParams }: Props) {
  const { supabase, profile: actor } = await requireAdminSupabase();
  const sp = await searchParams;
  const companyId = sp.companyId && UUID_RE.test(sp.companyId) ? sp.companyId : null;
  const useExisting =
    sp.mode === "existing" || Boolean(companyId);

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
        <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {useExisting ? "Add user to existing company" : "New company and portal user"}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {useExisting
            ? "Link a new login to a company that is already in the system."
            : "Set up the company and first login together — like the legacy WordPress client form."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {useExisting ? (
          <Link
            href="/admin/users/new"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            ← New company + user instead
          </Link>
        ) : (
          <Link
            href="/admin/users/new?mode=existing"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Add user to existing company only →
          </Link>
        )}
        <Link
          href="/admin/customers/new"
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Company only (no login)
        </Link>
      </div>

      {useExisting ? (
        <UserCreateForm
          initialCompany={initialCompany}
          creatableRoles={creatableRolesForActor(actor)}
          actorIsSuperAdmin={isSuperAdmin(actor)}
        />
      ) : (
        <CompanyUserCreateForm />
      )}
    </div>
  );
}
