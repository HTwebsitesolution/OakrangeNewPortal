import { NextResponse, type NextRequest } from "next/server";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/route-handler";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const nextRaw = requestUrl.searchParams.get("next");
  const next = safeRedirectPath(nextRaw) ?? "/reset-password";

  const resetErrorUrl = new URL("/reset-password", requestUrl.origin);
  resetErrorUrl.searchParams.set(
    "error",
    "This reset link is invalid or has expired. Request a new link and open it in the same browser where you requested it."
  );

  if (requestUrl.searchParams.has("error")) {
    return NextResponse.redirect(resetErrorUrl);
  }

  if (!code && !tokenHash) {
    // Dashboard-generated recovery links can carry tokens in the URL fragment.
    // Only the browser can read that fragment; preserve it through this redirect.
    return NextResponse.redirect(new URL("/reset-password", requestUrl.origin));
  }

  const supabase = await createRouteHandlerSupabaseClient();
  const { error } = tokenHash && requestUrl.searchParams.get("type") === "recovery"
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { error: new Error("Invalid recovery link") };

  if (error) {
    return NextResponse.redirect(resetErrorUrl);
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
