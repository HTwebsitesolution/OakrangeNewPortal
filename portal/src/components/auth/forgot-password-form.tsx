"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function ForgotPasswordForm({
  supabaseConfigured,
}: {
  supabaseConfigured: boolean;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!supabaseConfigured) return;

    setPending(true);
    const supabase = createBrowserSupabaseClient();
    const origin = window.location.origin;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      }
    );
    setPending(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage(
      "If an account exists for this email, you will receive a reset link shortly."
    );
  }

  return (
    <form
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      onSubmit={(e) => void onSubmit(e)}
    >
      {!supabaseConfigured ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Configure Supabase environment variables first.
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <label htmlFor="reset-email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="reset-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          disabled={!supabaseConfigured || pending}
        />
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-green-700 dark:text-green-400" role="status">
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={!supabaseConfigured || pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
