import Link from "next/link";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import { UserCreateForm } from "@/components/admin/user-create-form";

type Props = { searchParams: Promise<{ companyId?: string }> };

export default async function AdminNewUserPage({ searchParams }: Props) {
  const { supabase } = await requireAdminSupabase();
  const sp = await searchParams;
  const defaultCompanyId = sp.companyId ?? null;

  const { data: companies } = await supabase
    .from("companies")
    .select("id, company_name")
    .eq("status", "active")
    .order("company_name");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
          ← Users
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">New user</h1>
      </div>
      <UserCreateForm companies={companies ?? []} defaultCompanyId={defaultCompanyId} />
    </div>
  );
}
