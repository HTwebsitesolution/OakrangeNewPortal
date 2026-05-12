import "server-only";

import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginShell } from "@/components/login/login-shell";
import { isSupabaseConfigured } from "@/lib/env";
import { dashboardPathForRole } from "@/lib/auth/paths";
import { readAuthForLoginPage } from "@/lib/auth/require-session";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";

type LoginPageProps = {
  searchParams: Promise<{ redirect?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabaseConfigured = isSupabaseConfigured();
  const sp = await searchParams;

  let user: { id: string } | null = null;
  let profile: Awaited<ReturnType<typeof readAuthForLoginPage>>["profile"] =
    null;

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
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Suspense
        fallback={
          <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-zinc-500">
            Loading…
          </div>
        }
      >
        <LoginShell
          supabaseConfigured={supabaseConfigured}
          errorMessage={sp.error}
          accountInactive={accountInactive}
        />
      </Suspense>
      <p className="mx-auto max-w-md px-4 pb-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/forgot-password" className="underline underline-offset-2">
          Forgot your password?
        </Link>
      </p>
    </main>
  );
}
