"use client";

import Link from "next/link";
import { useState } from "react";
import { logAuthAudit } from "@/lib/audit/log";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function ChangePasswordForm({
  email,
  profileId,
  userRole,
}: {
  email: string;
  profileId: string;
  userRole: string;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Choose a password different from your current one.");
      return;
    }

    setPending(true);
    const supabase = createBrowserSupabaseClient();

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (verifyError) {
      setPending(false);
      setError("Current password is incorrect.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setPending(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    const { error: auditError } = await logAuthAudit(supabase, {
      userId: profileId,
      userRole,
      action: "password_changed",
    });
    if (auditError) {
      console.warn("Audit log (password changed) failed:", auditError.message);
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess(true);
  }

  return (
    <div className="max-w-md space-y-4">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div>
          <label htmlFor="current-password" className="block text-xs font-medium text-zinc-600">
            Current password <span className="text-red-600">*</span>
          </label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
            disabled={pending}
          />
        </div>
        <div>
          <label htmlFor="new-password" className="block text-xs font-medium text-zinc-600">
            New password <span className="text-red-600">*</span>
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
            disabled={pending}
          />
        </div>
        <div>
          <label htmlFor="confirm-new-password" className="block text-xs font-medium text-zinc-600">
            Confirm new password <span className="text-red-600">*</span>
          </label>
          <input
            id="confirm-new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
            disabled={pending}
          />
        </div>
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="text-sm text-green-700 dark:text-green-400" role="status">
            Your password has been updated.
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
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Forgot your current password?{" "}
        <Link href="/forgot-password" className="underline">
          Request a reset link by email
        </Link>
        .
      </p>
    </div>
  );
}

