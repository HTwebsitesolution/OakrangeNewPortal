"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cardClass, inputClass, labelClass } from "@/lib/ui/classes";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { logAuthAudit } from "@/lib/audit/log";
import { dashboardPathForRole } from "@/lib/auth/paths";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import type { SessionProfile } from "@/types/profile";
import { brand } from "@/lib/copy/brand";
import { LoginSupportInfo } from "@/components/login/login-page-chrome";

const login = brand.auth.login;

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
  const [email, setEmail] = useState("");
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
    <div className="space-y-6">
      <header className="space-y-3">
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
        className={`${cardClass} flex flex-col gap-5 p-6`}
        onSubmit={(e) => void onSubmit(e)}
      >
        <div>
          <label htmlFor="email" className={labelClass}>
            Email <span className="font-normal text-oak-muted">(username)</span>
          </label>
          <p className="mb-1.5 text-xs text-oak-muted">{login.emailHint}</p>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@company.com"
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
              className={`${inputClass} pr-10`}
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
  );
}
