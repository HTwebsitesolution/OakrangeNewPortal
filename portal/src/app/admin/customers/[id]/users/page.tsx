import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import { one } from "@/lib/admin/embed";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function CustomerUsersTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: companyId } = await params;
  if (!UUID_RE.test(companyId)) notFound();

  const { supabase } = await requireAdminSupabase();
  const { data: company } = await supabase.from("companies").select("id").eq("id", companyId).maybeSingle();
  if (!company) notFound();

  const { data: direct } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .eq("company_id", companyId)
    .order("email");

  const { data: accessRows } = await supabase
    .from("user_site_access")
    .select("user_id, profiles(id, email, full_name, role, is_active)")
    .eq("company_id", companyId);

  const merged = new Map<
    string,
    { id: string; email: string; full_name: string; role: string; is_active: boolean; note: string }
  >();

  for (const p of direct ?? []) {
    merged.set(p.id, {
      ...p,
      note: "Primary company on profile",
    });
  }

  for (const row of accessRows ?? []) {
    const p = one(row.profiles) as {
      id: string;
      email: string;
      full_name: string;
      role: string;
      is_active: boolean;
    } | null;
    if (!p?.id) continue;
    const prev = merged.get(p.id);
    if (!prev) {
      merged.set(p.id, { ...p, note: "Access grant only" });
    } else if (prev.note !== "Primary company on profile") {
      merged.set(p.id, { ...p, note: "Profile + access" });
    }
  }

  const list = [...merged.values()].sort((a, b) => a.email.localeCompare(b.email));

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Users</h2>
        <Link
          href={`/admin/users/new?companyId=${companyId}`}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
        >
          Invite / create user
        </Link>
      </div>
      <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {list.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-3 text-sm dark:bg-zinc-950">
            <div>
              <Link href={`/admin/users/${u.id}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
                {u.email}
              </Link>
              <p className="text-xs text-zinc-500">
                {u.full_name} · {u.role}
                {!u.is_active ? " · inactive" : ""} · {u.note}
              </p>
            </div>
            <Link href={`/admin/users/${u.id}/edit`} className="text-xs underline">
              Edit
            </Link>
          </li>
        ))}
      </ul>
      {list.length === 0 ? (
        <p className="text-sm text-zinc-500">No users linked to this company yet.</p>
      ) : null}
    </div>
  );
}
