import Link from "next/link";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import { one } from "@/lib/admin/embed";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function AdminUsersPage({ searchParams }: Props) {
  const { supabase } = await requireAdminSupabase();
  const { q: rawQ } = await searchParams;
  const q = rawQ?.trim().toLowerCase() ?? "";

  const { data: rows, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active, company_id, companies(company_name)")
    .order("email")
    .limit(500);

  if (error) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="mt-2 text-sm text-red-600">{error.message}</p>
      </div>
    );
  }

  const filtered = (rows ?? []).filter((r) => {
    if (!q) return true;
    const co = one(r.companies) as { company_name: string } | null;
    const blob = `${r.email} ${r.full_name} ${r.role} ${co?.company_name ?? ""}`.toLowerCase();
    return blob.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Users</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Search by name, email, role, or company. Creating a user provisions Supabase Auth (service
            role required).
          </p>
        </div>
        <Link
          href="/admin/users/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          New user
        </Link>
      </div>
      <form method="get" className="flex max-w-md gap-2">
        <input
          name="q"
          defaultValue={rawQ}
          placeholder="Search…"
          className="min-w-0 flex-1 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
        />
        <button type="submit" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600">
          Search
        </button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-100 text-xs font-medium uppercase text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filtered.map((r) => {
              const co = one(r.companies) as { company_name: string } | null;
              return (
                <tr key={r.id} className="bg-white dark:bg-zinc-950">
                  <td className="px-3 py-2">
                    <Link href={`/admin/users/${r.id}`} className="font-medium text-zinc-900 underline dark:text-zinc-50">
                      {r.email}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-zinc-600">{r.full_name || "—"}</td>
                  <td className="px-3 py-2 text-zinc-600">{r.role}</td>
                  <td className="px-3 py-2 text-zinc-600">{co?.company_name ?? "—"}</td>
                  <td className="px-3 py-2">{r.is_active ? "Yes" : "No"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 ? <p className="p-4 text-sm text-zinc-500">No users match.</p> : null}
      </div>
    </div>
  );
}
