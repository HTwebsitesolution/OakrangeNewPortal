import "server-only";

/**
 * Server-only session gates for protected route groups. Every `/admin` and `/portal` page
 * is wrapped by a layout that calls these before rendering children. Do not rely on nav UI
 * or client-only role checks for access control.
 */
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchProfileByAuthUserId } from "@/lib/auth/get-profile";
import type { SessionProfile } from "@/types/profile";

export async function readAuthForLoginPage(): Promise<{
  user: { id: string } | null;
  profile: SessionProfile | null;
}> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const profile = await fetchProfileByAuthUserId(supabase, user.id);
  return { user, profile };
}

async function loadSessionWithClient(): Promise<{
  supabase: SupabaseClient;
  user: { id: string };
  profile: SessionProfile;
} | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await fetchProfileByAuthUserId(supabase, user.id);
  if (!profile) {
    redirect("/access-pending");
  }

  if (!profile.is_active) {
    redirect("/account-disabled");
  }

  return { supabase, user, profile };
}

export async function requireAdminProfile(): Promise<{
  profile: SessionProfile;
}> {
  const session = await loadSessionWithClient();
  if (!session) {
    redirect("/login?redirect=/admin/dashboard");
  }

  if (session.profile.role !== "oakrange_admin") {
    redirect("/unauthorized");
  }

  return { profile: session.profile };
}

/** Same as `requireAdminProfile` but returns the Supabase server client for RLS-bound mutations. */
export async function requireAdminSupabase(): Promise<{
  supabase: SupabaseClient;
  profile: SessionProfile;
}> {
  const session = await loadSessionWithClient();
  if (!session) {
    redirect("/login?redirect=/admin/dashboard");
  }

  if (session.profile.role !== "oakrange_admin") {
    redirect("/unauthorized");
  }

  return { supabase: session.supabase, profile: session.profile };
}

export async function requirePortalProfile(): Promise<{
  profile: SessionProfile;
}> {
  const session = await loadSessionWithClient();
  if (!session) {
    redirect("/login?redirect=/portal/dashboard");
  }

  if (
    session.profile.role !== "site_manager" &&
    session.profile.role !== "customer_user"
  ) {
    redirect("/unauthorized");
  }

  return { profile: session.profile };
}