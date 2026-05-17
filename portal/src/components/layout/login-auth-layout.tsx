import { LoginHeroPanel } from "@/components/layout/login-hero-panel";
import { LoginPageFooter, LoginTopBar } from "@/components/login/login-page-chrome";

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
    <div className="min-h-screen max-lg:flex max-lg:flex-col lg:grid lg:grid-cols-2">
      <LoginHeroPanel />

      <main className="flex min-h-0 flex-1 flex-col bg-oak-bg px-4 py-8 sm:px-8 lg:min-h-screen lg:overflow-y-auto lg:py-10">
        <div className="mx-auto w-full max-w-lg">
          <LoginTopBar />
          {children}
          {footer ? <div className="mt-6 text-center">{footer}</div> : null}
        </div>
        <LoginPageFooter />
      </main>
    </div>
  );
}
