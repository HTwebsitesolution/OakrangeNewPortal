"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { logAuthAudit } from "@/lib/audit/log";
import { dashboardPathForRole } from "@/lib/auth/paths";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import type { SessionProfile } from "@/types/profile";

type LoginShellProps = {
  supabaseConfigured: boolean;
  errorMessage?: string;
  accountInactive?: boolean;
  /** Post-login redirect from `?redirect=` (read on server to avoid client Suspense issues). */
  redirectParam?: string;
};

export function LoginShell({
  supabaseConfigured,
  errorMessage,
  accountInactive,
  redirectParam,
}: LoginShellProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!supabaseConfigured) return;

    setPending(true);
    const supabase = createBrowserSupabaseClient();

    const { error: signError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signError) {
      setFormError(signError.message);
      setPending(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setFormError("Sign-in failed. Please try again.");
      setPending(false);
      return;
    }

    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select("id, auth_user_id, full_name, email, role, company_id, is_active")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profileError) {
      setFormError(profileError.message);
      setPending(false);
      return;
    }

    if (!profileRow) {
      // Keep the valid auth session so middleware/server checks can consistently route to /access-pending.
      router.replace("/access-pending");
      router.refresh();
      setPending(false);
      return;
    }

    const profile = profileRow as SessionProfile;

    if (!profile.is_active) {
      await supabase.auth.signOut();
      router.replace("/account-disabled");
      router.refresh();
      setPending(false);
      return;
    }

    const { error: auditError } = await logAuthAudit(supabase, {
      userId: profile.id,
      userRole: profile.role,
      action: "login",
    });
    if (auditError) {
      console.warn("Audit log (login) failed:", auditError.message);
    }

    const fromQuery = safeRedirectPath(redirectParam);
    const dest = fromQuery ?? dashboardPathForRole(profile.role);

    router.replace(dest);
    router.refresh();
    setPending(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-16 sm:px-0">
      <header className="text-center">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Oakrange Engineering
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Certificate Portal
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to view or manage calibration certificates.
        </p>
      </header>

      {accountInactive ? (
        <p
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
          role="alert"
        >
          This account has been deactivated. Please contact Oakrange if you need
          access. You can also visit{" "}
          <Link href="/account-disabled" className="font-medium underline">
            account status
          </Link>{" "}
          to clear your session.
        </p>
      ) : null}

      {!supabaseConfigured ? (
        <p
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
          role="status"
        >
          Supabase is not configured. Copy{" "}
          <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/50">
            .env.example
          </code>{" "}
          to{" "}
          <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/50">
            .env.local
          </code>{" "}
          and add your project URL and anon key.
        </p>
      ) : null}

      {errorMessage ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100"
          role="alert"
        >
          {(() => {
            try {
              return decodeURIComponent(errorMessage);
            } catch {
              return errorMessage;
            }
          })()}
        </p>
      ) : null}

      {formError ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100"
          role="alert"
        >
          {formError}
        </p>
      ) : null}

      <form
        className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        onSubmit={(e) => void onSubmit(e)}
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="email"
            className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
            placeholder="you@company.com"
            disabled={!supabaseConfigured || pending}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="password"
            className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
            placeholder="••••••••"
            disabled={!supabaseConfigured || pending}
            required
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          disabled={!supabaseConfigured || pending}
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
