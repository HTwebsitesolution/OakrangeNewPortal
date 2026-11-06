"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    let cancelled = false;
    async function checkLink() {
      try {
        const query = new URLSearchParams(window.location.search);
        const fragment = new URLSearchParams(window.location.hash.slice(1));
        if (query.has("error") || fragment.has("error")) {
          throw new Error("This reset link is invalid or has expired. Request a new reset link.");
        }
        const accessToken = fragment.get("access_token");
        const refreshToken = fragment.get("refresh_token");
        if (fragment.get("type") === "recovery" && accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          window.history.replaceState(null, "", window.location.pathname);
          if (error) throw error;
        }
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!session) throw new Error("This reset link is invalid or has expired. Request a new link and open it in the same browser where you requested it.");
        if (!cancelled) setReady(true);
      } catch (error) {
        if (!cancelled) setError(error instanceof Error ? error.message : "Unable to verify your reset link. Please request a new one.");
      } finally {
        if (!cancelled) setChecked(true);
      }
    }
    void checkLink();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    const supabase = createBrowserSupabaseClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setPending(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    // End the recovery session so the login route does not send the user to a dashboard.
    const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
    if (signOutError) {
      setError("Password updated. Please sign out and sign in again with your new password.");
      return;
    }
    router.replace("/login?error=Password%20updated.%20Please%20sign%20in.");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Choose a new password
        </h1>
        {!ready ? (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            {checked ? error : "Checking your reset link…"}
          </p>
        ) : (
          <form
            className="mt-8 flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
            onSubmit={(e) => void onSubmit(e)}
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="new-password" className="text-sm font-medium">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                minLength={8}
                required
                disabled={pending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="confirm-password" className="text-sm font-medium">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                minLength={8}
                required
                disabled={pending}
              />
            </div>
            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {pending ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
        {checked && !ready ? (
          <p className="mt-4 text-sm">
            <Link href="/forgot-password" className="underline">Request a new reset link</Link>
          </p>
        ) : null}
        <p className="mt-8 text-center text-sm text-zinc-500">
          <Link href="/login" className="underline underline-offset-2">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
