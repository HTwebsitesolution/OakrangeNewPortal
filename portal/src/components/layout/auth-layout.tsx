import { OakrangeLogo } from "@/components/brand/oakrange-logo";

export function AuthLayout({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-oak-navy px-10 py-12 text-white lg:flex">
        <OakrangeLogo variant="light" subtitle="Secure Certificate Portal" />
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight">Secure Certificate Portal</h1>
          <p className="text-sm leading-relaxed text-slate-300">
            Access calibration certificates and compliance documents securely through Oakrange
            Engineering&apos;s customer portal.
          </p>
        </div>
        <p className="text-xs text-slate-400">
          Oakrange Engineering Ltd
          <br />
          Calibration you can prove. Instantly.
        </p>
      </div>

      <div className="flex min-h-screen flex-col justify-center bg-oak-bg px-4 py-10 sm:px-8">
        <div className="mb-8 lg:hidden">
          <OakrangeLogo subtitle="Secure Certificate Portal" />
        </div>
        <div className="mx-auto w-full max-w-md">{children}</div>
        {footer ? (
          <div className="mx-auto mt-6 w-full max-w-md text-center">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
