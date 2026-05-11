import { LoginShell } from "@/components/login/login-shell";
import { isSupabaseConfigured } from "@/lib/env";

export default function LoginPage() {
  const supabaseConfigured = isSupabaseConfigured();

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <LoginShell supabaseConfigured={supabaseConfigured} />
    </main>
  );
}
