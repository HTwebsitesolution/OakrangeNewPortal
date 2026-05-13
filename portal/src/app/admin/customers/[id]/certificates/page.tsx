import { notFound } from "next/navigation";
import { requireAdminSupabase } from "@/lib/auth/require-session";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function CustomerCertificatesPlaceholder({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { supabase } = await requireAdminSupabase();
  const { data: company } = await supabase.from("companies").select("id").eq("id", id).maybeSingle();
  if (!company) notFound();

  return (
    <div className="mt-6 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Certificates</h2>
      <p className="mt-2">
        Phase 5 will list calibration certificates for this customer (filtered by site and publish
        state). Upload and signed URLs are out of scope for Phase 4.
      </p>
    </div>
  );
}
