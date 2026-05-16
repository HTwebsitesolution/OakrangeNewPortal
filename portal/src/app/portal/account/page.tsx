import Link from "next/link";
import { one } from "@/lib/admin/embed";
import { requirePortalSupabase } from "@/lib/auth/require-session";
import { loadPortalAccessGrants } from "@/lib/certificates/portal-queries";

function roleLabel(role: string) {
  if (role === "site_manager") return "Site manager";
  if (role === "customer_user") return "Customer user";
  return role;
}

export default async function PortalAccountPage() {
  const { supabase, profile } = await requirePortalSupabase();
  const { grants, error } = await loadPortalAccessGrants(supabase, profile.id);
  const company = one(grants[0]?.companies);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Account</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Your portal profile and access summary.
        </p>
      </div>

      <dl className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-2">
        <Item label="Name" value={profile.full_name || "—"} />
        <Item label="Email" value={profile.email} />
        <Item label="Role" value={roleLabel(profile.role)} />
        <Item label="Company" value={company?.company_name ?? "—"} />
      </dl>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Access summary</h2>
        {error ? (
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        ) : grants.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No site or company access is configured for your account.
          </p>
        ) : (
          <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            {grants.map((grant) => {
              const site = one(grant.sites);
              const grantCompany = one(grant.companies);
              const label =
                grant.access_type === "company"
                  ? `Company-wide access (${grantCompany?.company_name ?? "company"})`
                  : `Site: ${site?.site_name ?? grant.site_id}`;

              return <li key={grant.id}>{label}</li>;
            })}
          </ul>
        )}
      </section>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        To change your password, use{" "}
        <Link href="/login" className="underline">
          sign out
        </Link>{" "}
        and the password reset option on the login page.
      </p>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 text-zinc-900 dark:text-zinc-100">{value}</dd>
    </div>
  );
}
