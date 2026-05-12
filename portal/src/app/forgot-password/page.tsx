import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { isSupabaseConfigured } from "@/lib/env";

export default function ForgotPasswordPage() {
  const configured = isSupabaseConfigured();

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Reset password
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Enter your email address and we will send you a link to choose a new
          password.
        </p>
        <div className="mt-8">
          <ForgotPasswordForm supabaseConfigured={configured} />
        </div>
        <p className="mt-8 text-center text-sm text-zinc-500">
          <Link href="/login" className="underline underline-offset-2">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
