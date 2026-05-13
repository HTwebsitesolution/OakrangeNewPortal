import { requireAdminSupabase } from "@/lib/auth/require-session";
import { notFound } from "next/navigation";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function CustomerOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { supabase } = await requireAdminSupabase();
  const { data: c } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();

  const { count: siteCount } = await supabase
    .from("sites")
    .select("*", { count: "exact", head: true })
    .eq("company_id", id);

  const { count: userCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("company_id", id);

  return (
    <div className="mt-6 space-y-6">
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase text-zinc-500">Primary contact</dt>
          <dd className="text-sm text-zinc-900 dark:text-zinc-100">
            {c.primary_contact_name || "—"}
            {c.primary_contact_email ? (
              <span className="block text-zinc-600">{c.primary_contact_email}</span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-zinc-500">Phone</dt>
          <dd className="text-sm text-zinc-900 dark:text-zinc-100">{c.phone || "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase text-zinc-500">Address</dt>
          <dd className="text-sm text-zinc-900 dark:text-zinc-100">
            {[c.address_line_1, c.address_line_2, c.town_city, c.postcode].filter(Boolean).join(", ") ||
              "—"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase text-zinc-500">Notes</dt>
          <dd className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
            {c.notes || "—"}
          </dd>
        </div>
      </dl>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <p className="text-xs text-zinc-500">Sites</p>
          <p className="text-lg font-semibold tabular-nums">{siteCount ?? 0}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <p className="text-xs text-zinc-500">Users (this company)</p>
          <p className="text-lg font-semibold tabular-nums">{userCount ?? 0}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <p className="text-xs text-zinc-500">Status</p>
          <p className="text-lg font-semibold capitalize">{c.status}</p>
        </div>
      </div>
    </div>
  );
}
