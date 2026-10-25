"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { labelClass } from "@/lib/ui/classes";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { signInWithUsernameAction } from "@/actions/auth/sign-in";
import { logAuthAudit } from "@/lib/audit/log";
import { dashboardPathForRole } from "@/lib/auth/paths";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import type { SessionProfile } from "@/types/profile";
import { brand } from "@/lib/copy/brand";
import { LoginSupportInfo } from "@/components/login/login-page-chrome";
import { PortalMigrationNotice } from "@/components/login/portal-migration-notice";

const login = brand.auth.login;

/** Login-only form panel — not shared with admin/portal forms */
const loginFormPanelClass =
  "flex flex-col gap-5 rounded-xl border-2 border-oak-orange/35 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.1)] ring-4 ring-oak-orange/10";

const loginInputClass =
  "mt-1 w-full rounded-lg border-2 border-oak-border bg-slate-50/50 px-3 py-2.5 text-sm text-oak-charcoal outline-none transition placeholder:text-oak-muted focus:border-oak-orange focus:bg-white focus:ring-4 focus:ring-oak-orange/15 disabled:cursor-not-allowed disabled:opacity-60";

type LoginShellProps = {
  supabaseConfigured: boolean;
  errorMessage?: string;
  accountInactive?: boolean;
  redirectParam?: string;
};

export function LoginShell({
  supabaseConfigured,
  errorMessage,
  accountInactive,
  redirectParam,
}: LoginShellProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!supabaseConfigured) return;

    setPending(true);
    const supabase = createBrowserSupabaseClient();

    const trimmedIdentifier = identifier.trim();
    let signErrorMessage: string | null;
    if (trimmedIdentifier.includes("@")) {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedIdentifier,
        password,
      });
      signErrorMessage = error?.message ?? null;
    } else {
      const result = await signInWithUsernameAction(trimmedIdentifier, password);
      if (result.session) {
        const { error } = await supabase.auth.setSession(result.session);
        signErrorMessage = error?.message ?? null;
      } else {
        signErrorMessage = result.error;
      }
    }

    if (signErrorMessage) {
      setFormError(signErrorMessage);
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
      .select("id, auth_user_id, full_name, email, role, admin_level, company_id, is_active")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profileError) {
      setFormError(profileError.message);
      setPending(false);
      return;
    }

    if (!profileRow) {
      router.replace("/access-pending");
      router.refresh();
      setPending(false);
      return;
    }

    const profile = profileRow as SessionProfile;

    if (!profile.is_active) {
      const { error: blockAuditError } = await logAuthAudit(supabase, {
        userId: profile.id,
        userRole: profile.role,
        action: "account_disabled_block",
        metadata: { email: profile.email },
      });
      if (blockAuditError) {
        console.warn("Audit log (account disabled) failed:", blockAuditError.message);
      }
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
    <>
      <PortalMigrationNotice />
      <div className="space-y-6">
      <header className="login-animate-fade-up login-animate-delay-1 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-oak-orange">
          {login.portalEyebrow}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-oak-navy">{login.welcomeTitle}</h2>
        <p className="text-sm leading-relaxed text-oak-muted">{login.welcomeLead}</p>
        <p className="text-sm font-medium text-oak-navy">{login.signInPrompt}</p>
      </header>

      {accountInactive ? (
        <Alert variant="warning" role="alert">
          This account has been deactivated. Please contact Oakrange if you need access. You
          can also visit{" "}
          <Link href="/account-disabled" className="font-medium underline">
            account status
          </Link>{" "}
          to clear your session.
        </Alert>
      ) : null}

      {!supabaseConfigured ? (
        <Alert variant="warning" role="status">
          Supabase is not configured. Copy <code className="rounded bg-white/80 px-1 text-xs">.env.example</code> to{" "}
          <code className="rounded bg-white/80 px-1 text-xs">.env.local</code> and add your project URL and anon key.
        </Alert>
      ) : null}

      {errorMessage ? (
        <Alert variant="error" role="alert">
          {(() => {
            try {
              return decodeURIComponent(errorMessage);
            } catch {
              return errorMessage;
            }
          })()}
        </Alert>
      ) : null}

      {formError ? (
        <Alert variant="error" role="alert">
          {formError}
        </Alert>
      ) : null}

      <form
        className={`${loginFormPanelClass} login-animate-form-panel`}
        onSubmit={(e) => void onSubmit(e)}
      >
        <p className="border-b border-oak-border pb-3 text-sm font-semibold text-oak-navy">
          Sign in to your account
        </p>

        <div>
          <label htmlFor="identifier" className={labelClass}>
            Username or email
          </label>
          <p className="mb-1.5 text-xs text-oak-muted">{login.emailHint}</p>
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className={loginInputClass}
            placeholder="e.g. 3450VW or you@company.com"
            disabled={!supabaseConfigured || pending}
            required
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${loginInputClass} pr-10`}
              placeholder="Enter your password"
              disabled={!supabaseConfigured || pending}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-oak-muted hover:text-oak-orange"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={!supabaseConfigured || pending}
        >
          {pending ? "Signing in…" : "Sign in →"}
        </Button>
      </form>

      <LoginSupportInfo />
    </div>
    </>
  );
}
