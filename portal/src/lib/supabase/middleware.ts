/**
 * Edge middleware: validates Supabase session, loads `profiles` via RLS, and redirects
 * before `/admin` or `/portal` routes run. Layouts re-verify on the Node server (defense in depth).
 */
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { fetchProfileByAuthUserId } from "@/lib/auth/get-profile";
import {
  dashboardPathForRole,
  isPublicPath,
} from "@/lib/auth/paths";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value);
  });
}

/**
 * Refreshes the Supabase session and enforces route access (Phase 3).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const publicRoute = isPublicPath(pathname);
  const certificateApiRoute =
    pathname.startsWith("/api/admin/certificates") ||
    pathname.startsWith("/api/portal/certificates");

  if (publicRoute) {
    if (
      user &&
      (pathname === "/login" || pathname === "/forgot-password")
    ) {
      const profile = await fetchProfileByAuthUserId(supabase, user.id);
      if (profile?.is_active) {
        const nextParam = safeRedirectPath(
          request.nextUrl.searchParams.get("redirect")
        );
        const dest = nextParam ?? dashboardPathForRole(profile.role);
        const redirectRes = NextResponse.redirect(
          new URL(dest, request.nextUrl.origin)
        );
        copyCookies(supabaseResponse, redirectRes);
        return redirectRes;
      }
    }
    return supabaseResponse;
  }

  // Certificate admin APIs return JSON/redirect responses from their own route handlers.
  // Let them handle auth failures instead of forcing page-style dashboard redirects here.
  if (certificateApiRoute) {
    return supabaseResponse;
  }

  if (!user) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("redirect", pathname);
    const redirectRes = NextResponse.redirect(loginUrl);
    copyCookies(supabaseResponse, redirectRes);
    return redirectRes;
  }

  const profile = await fetchProfileByAuthUserId(supabase, user.id);

  if (!profile) {
    const redirectRes = NextResponse.redirect(
      new URL("/access-pending", request.nextUrl.origin)
    );
    copyCookies(supabaseResponse, redirectRes);
    return redirectRes;
  }

  if (!profile.is_active) {
    const redirectRes = NextResponse.redirect(
      new URL("/account-disabled", request.nextUrl.origin)
    );
    copyCookies(supabaseResponse, redirectRes);
    return redirectRes;
  }

  if (pathname.startsWith("/admin")) {
    if (profile.role !== "oakrange_admin") {
      const redirectRes = NextResponse.redirect(
        new URL("/portal/dashboard", request.nextUrl.origin)
      );
      copyCookies(supabaseResponse, redirectRes);
      return redirectRes;
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/portal")) {
    if (
      profile.role !== "site_manager" &&
      profile.role !== "customer_user"
    ) {
      const redirectRes = NextResponse.redirect(
        new URL("/admin/dashboard", request.nextUrl.origin)
      );
      copyCookies(supabaseResponse, redirectRes);
      return redirectRes;
    }
    return supabaseResponse;
  }

  if (pathname === "/") {
    const redirectRes = NextResponse.redirect(
      new URL(dashboardPathForRole(profile.role), request.nextUrl.origin)
    );
    copyCookies(supabaseResponse, redirectRes);
    return redirectRes;
  }

  const redirectRes = NextResponse.redirect(
    new URL(dashboardPathForRole(profile.role), request.nextUrl.origin)
  );
  copyCookies(supabaseResponse, redirectRes);
  return redirectRes;
}
