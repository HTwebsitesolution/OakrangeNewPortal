import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AuthLayout } from "@/components/layout/auth-layout";
import { isSupabaseConfigured } from "@/lib/env";

export default function ForgotPasswordPage() {
  const configured = isSupabaseConfigured();

  return (
    <AuthLayout
      footer={
        <Link href="/login" className="text-sm font-medium text-oak-orange hover:underline">
          Back to sign in
        </Link>
      }
    >
      <div className="space-y-6">
        <header>
          <h2 className="text-xl font-semibold tracking-tight text-oak-navy">Reset password</h2>
          <p className="mt-1 text-sm text-oak-muted">
            Enter your email address and we will send you a link to choose a new password.
          </p>
        </header>
        <ForgotPasswordForm supabaseConfigured={configured} />
      </div>
    </AuthLayout>
  );
}
