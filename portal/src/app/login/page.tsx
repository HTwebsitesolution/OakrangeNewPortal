import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/layout/auth-layout";
import { LoginShell } from "@/components/login/login-shell";
import { isSupabaseConfigured } from "@/lib/env";
import { dashboardPathForRole } from "@/lib/auth/paths";
import { readAuthForLoginPage } from "@/lib/auth/require-session";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ redirect?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabaseConfigured = isSupabaseConfigured();
  const sp = await searchParams;

  let user: { id: string } | null = null;
  let profile: Awaited<ReturnType<typeof readAuthForLoginPage>>["profile"] = null;

  if (supabaseConfigured) {
    const session = await readAuthForLoginPage();
    user = session.user;
    profile = session.profile;

    if (user && !profile) {
      redirect("/access-pending");
    }

    if (profile?.is_active) {
      const next = safeRedirectPath(sp.redirect);
      redirect(next ?? dashboardPathForRole(profile.role));
    }
  }

  const accountInactive = Boolean(
    supabaseConfigured && user && profile && !profile.is_active
  );

  return (
    <AuthLayout
      footer={
        <Link href="/forgot-password" className="text-sm font-medium text-oak-orange hover:underline">
          Forgot your password?
        </Link>
      }
    >
      <LoginShell
        supabaseConfigured={supabaseConfigured}
        errorMessage={sp.error}
        accountInactive={accountInactive}
        redirectParam={sp.redirect}
      />
    </AuthLayout>
  );
}
