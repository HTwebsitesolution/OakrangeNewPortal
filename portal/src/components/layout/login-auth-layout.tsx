import { LoginHeroPanel } from "@/components/layout/login-hero-panel";

/**
 * Login-only layout with photographic hero panel. Other auth routes keep AuthLayout unchanged.
 */
export function LoginAuthLayout({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <LoginHeroPanel />
      <LoginHeroPanel compact />

      <div className="flex min-h-screen flex-col justify-center bg-oak-bg px-4 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-md">{children}</div>
        {footer ? (
          <div className="mx-auto mt-8 w-full max-w-md text-center text-xs text-oak-muted">
            {footer}
          </div>
        ) : (
          <p className="mx-auto mt-8 w-full max-w-md text-center text-xs text-oak-muted">
            Secured by Oakrange Engineering. All rights reserved.
          </p>
        )}
      </div>
    </div>
  );
}
