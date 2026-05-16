import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { cardClass } from "@/lib/ui/classes";

export default function AccessPendingPage() {
  return (
    <AuthLayout>
      <div className={`${cardClass} space-y-4 p-8 text-center`}>
        <h1 className="text-2xl font-semibold tracking-tight text-oak-navy">Access not ready</h1>
        <p className="text-sm text-oak-muted">
          Your account exists, but no portal profile is linked yet. Oakrange must finish setting
          up your user before you can sign in.
        </p>
        <Button href="/login" variant="primary">
          Back to sign in
        </Button>
      </div>
    </AuthLayout>
  );
}
