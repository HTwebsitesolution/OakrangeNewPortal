import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionProfile } from "@/types/profile";

const PROFILE_COLUMNS =
  "id, auth_user_id, full_name, email, role, company_id, is_active" as const;

export async function fetchProfileByAuthUserId(
  supabase: SupabaseClient,
  authUserId: string
): Promise<SessionProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error || !data) return null;

  return data as SessionProfile;
}
