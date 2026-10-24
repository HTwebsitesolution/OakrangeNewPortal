"use server";

import { parseUsername } from "@/lib/admin/validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Same message Supabase returns for a wrong password, so unknown usernames are indistinguishable. */
const INVALID_CREDENTIALS = "Invalid login credentials";

export type UsernameSignInResult = { error: string | null };

/**
 * Signs in with a portal username (e.g. 3450VW, Leeds5574). The account email is resolved
 * server-side and never returned to the browser; session cookies are set on the response.
 */
export async function signInWithUsernameAction(
  usernameInput: string,
  password: string
): Promise<UsernameSignInResult> {
  const username = parseUsername(usernameInput);
  if (!username || !password) {
    return { error: INVALID_CREDENTIALS };
  }

  const service = createServiceRoleClient();
  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("auth_user_id")
    .ilike("username", username)
    .maybeSingle();
  if (profileError || !profile) {
    return { error: INVALID_CREDENTIALS };
  }

  const { data: authUser, error: authError } = await service.auth.admin.getUserById(
    profile.auth_user_id
  );
  const email = authUser?.user?.email;
  if (authError || !email) {
    return { error: INVALID_CREDENTIALS };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error ? error.message : null };
}
