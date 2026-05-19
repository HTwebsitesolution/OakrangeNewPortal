import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { isSuperAdmin } from "@/lib/auth/admin-permissions";
import { requireAdminSupabase } from "@/lib/auth/require-session";

function adminLevelLabel(profile: {
  role: string;
  admin_level: string | null;
}): string | null {
  if (profile.role !== "oakrange_admin" || !profile.admin_level) return null;
  return profile.admin_level === "super_admin" ? "Super Admin" : "Admin";
}

export default async function AdminSettingsPage() {
  const { profile } = await requireAdminSupabase();
  const level = adminLevelLabel(profile);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Settings</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Your account details and password.
        </p>
      </div>

      <dl className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-2">
        <Item label="Name" value={profile.full_name || "—"} />
        <Item label="Email" value={profile.email} />
        <Item label="Role" value={profile.role} />
        {level ? <Item label="Admin level" value={level} /> : null}
      </dl>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Change password</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Enter your current password, then choose a new one you will remember.
          {isSuperAdmin(profile)
            ? " As Super Admin you can also manage other users from the Users area."
            : null}
        </p>
        <ChangePasswordForm
          email={profile.email}
          profileId={profile.id}
          userRole={profile.role}
        />
      </section>
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
