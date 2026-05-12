"use client";

import Link from "next/link";
import { useEffect } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function AccountDisabledPage() {
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    void supabase.auth.signOut();
  }, []);

  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Account disabled
      </h1>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        Your portal access has been turned off. If you think this is a mistake,
        please contact Oakrange Engineering. Your session has been cleared on
        this device.
      </p>
      <p className="mt-8">
        <Link
          href="/login"
          className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          Return to sign in
        </Link>
      </p>
    </main>
  );
}
