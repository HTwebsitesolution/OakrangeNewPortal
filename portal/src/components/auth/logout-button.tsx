"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { logAuthAudit } from "@/lib/audit/log";
import type { SessionProfile } from "@/types/profile";

type LogoutButtonProps = {
  profile: Pick<SessionProfile, "id" | "role">;
  className?: string;
};

export function LogoutButton({ profile, className }: LogoutButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    const supabase = createBrowserSupabaseClient();
    await logAuthAudit(supabase, {
      userId: profile.id,
      userRole: profile.role,
      action: "logout",
    });
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
    setPending(false);
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={pending}
      className={
        className ??
        "rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
      }
    >
      {pending ? "Signing out…" : "Logout"}
    </button>
  );
}
