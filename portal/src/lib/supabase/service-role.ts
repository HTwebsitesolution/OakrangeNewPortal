import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for server-only operations that bypass RLS (e.g. Auth Admin API).
 * Call only after verifying the current user is an active `oakrange_admin` in application code.
 */
export function createServiceRoleClient() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY for admin provisioning."
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
