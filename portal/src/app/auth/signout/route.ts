import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/route-handler";
import { fetchProfileByAuthUserId } from "@/lib/auth/get-profile";
import { logAuthAudit } from "@/lib/audit/log";

export const dynamic = "force-dynamic";

/**
 * Server-side sign-out so SSR auth cookies are cleared (browser-only signOut is not enough).
 * Invoked via `<form method="POST" action="/auth/signout">` from LogoutButton.
 */
export async function POST(request: NextRequest) {
  const supabase = await createRouteHandlerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const profile = await fetchProfileByAuthUserId(supabase, user.id);
    if (profile) {
      const { error } = await logAuthAudit(supabase, {
        userId: profile.id,
        userRole: profile.role,
        action: "logout",
      });
      if (error) {
        console.warn("Audit log (logout) failed:", error.message);
      }
    }
  }

  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) {
    console.warn("signOut failed:", signOutError.message);
  }

  revalidatePath("/", "layout");

  const login = new URL("/login", request.url);
  return NextResponse.redirect(login, { status: 302 });
}
