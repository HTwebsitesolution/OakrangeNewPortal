import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import { SiteForm } from "@/components/admin/site-form";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function NewSitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: companyId } = await params;
  if (!UUID_RE.test(companyId)) notFound();

  const { supabase } = await requireAdminSupabase();
  const { data: company } = await supabase.from("companies").select("id").eq("id", companyId).maybeSingle();
  if (!company) notFound();

  return (
    <div className="mt-6 space-y-4">
      <Link href={`/admin/customers/${companyId}/sites`} className="text-sm text-zinc-600 hover:underline">
        ← Sites
      </Link>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">New site</h2>
      <SiteForm mode="create" companyId={companyId} cancelHref={`/admin/customers/${companyId}/sites`} />
    </div>
  );
}
