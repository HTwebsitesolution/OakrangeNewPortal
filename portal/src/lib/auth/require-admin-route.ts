import "server-only";

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchProfileByAuthUserId } from "@/lib/auth/get-profile";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/route-handler";
import type { SessionProfile } from "@/types/profile";

export type AdminRouteSession = {
  supabase: SupabaseClient;
  user: { id: string };
  profile: SessionProfile;
};

export async function requireAdminRoute(): Promise<{
  session: AdminRouteSession | null;
  response: NextResponse | null;
}> {
  const supabase = await createRouteHandlerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }

  const profile = await fetchProfileByAuthUserId(supabase, user.id);
  if (!profile) {
    return {
      session: null,
      response: NextResponse.json({ error: "Access not ready." }, { status: 403 }),
    };
  }

  if (!profile.is_active) {
    return {
      session: null,
      response: NextResponse.json({ error: "Account disabled." }, { status: 403 }),
    };
  }

  if (profile.role !== "oakrange_admin") {
    return {
      session: null,
      response: NextResponse.json({ error: "Admin access required." }, { status: 403 }),
    };
  }

  return {
    session: { supabase, user, profile },
    response: null,
  };
}
