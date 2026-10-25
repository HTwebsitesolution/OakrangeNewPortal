"use server";

import { createClient } from "@supabase/supabase-js";
import { parseUsername } from "@/lib/admin/validation";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Same message Supabase returns for a wrong password, so unknown usernames are indistinguishable. */
const INVALID_CREDENTIALS = "Invalid login credentials";

export type UsernameSignInResult =
  | { error: string; session: null }
  | { error: null; session: { access_token: string; refresh_token: string } };

/**
 * Signs in with a portal username (e.g. 3450VW, Leeds5574). The account email is resolved
 * server-side and never returned to the browser. The session tokens are returned for the
 * browser client to store via `setSession`: setting cookies inside a server action makes
 * Next.js re-render `/login`, whose signed-in redirect blanks the page mid-login.
 */
export async function signInWithUsernameAction(
  usernameInput: string,
  password: string
): Promise<UsernameSignInResult> {
  const username = parseUsername(usernameInput);
  if (!username || !password) {
    return { error: INVALID_CREDENTIALS, session: null };
  }

  const service = createServiceRoleClient();
  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("auth_user_id")
    .ilike("username", username)
    .maybeSingle();
  if (profileError || !profile) {
    return { error: INVALID_CREDENTIALS, session: null };
  }

  const { data: authUser, error: authError } = await service.auth.admin.getUserById(
    profile.auth_user_id
  );
  const email = authUser?.user?.email;
  if (authError || !email) {
    return { error: INVALID_CREDENTIALS, session: null };
  }

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return { error: error?.message ?? INVALID_CREDENTIALS, session: null };
  }

  return {
    error: null,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  };
}
