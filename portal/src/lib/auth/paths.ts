/**
 * Path prefixes that do not require an authenticated session.
 * (Still run session refresh when applicable.)
 */
export const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/account-disabled",
  "/access-pending",
  "/unauthorized",
] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function dashboardPathForRole(role: string): string {
  if (role === "oakrange_admin") return "/admin/dashboard";
  return "/portal/dashboard";
}
