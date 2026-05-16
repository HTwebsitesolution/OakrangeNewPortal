"use client";

import { useEffect } from "react";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { cardClass } from "@/lib/ui/classes";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function AccountDisabledPage() {
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    void supabase.auth.signOut();
  }, []);

  return (
    <AuthLayout>
      <div className={`${cardClass} space-y-4 p-8 text-center`}>
        <h1 className="text-2xl font-semibold tracking-tight text-oak-navy">Account disabled</h1>
        <p className="text-sm text-oak-muted">
          Your portal access has been turned off. If you think this is a mistake, please contact
          Oakrange Engineering. Your session has been cleared on this device.
        </p>
        <Button href="/login" variant="primary">
          Return to sign in
        </Button>
      </div>
    </AuthLayout>
  );
}
