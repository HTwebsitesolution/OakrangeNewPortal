import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  context: { params: Promise<{ companyId: string }> }
) {
  const { session, response } = await requireAdminRoute();
  if (response) return response;

  const { companyId } = await context.params;
  if (!UUID_RE.test(companyId)) {
    return NextResponse.json({ error: "Invalid company id." }, { status: 400 });
  }

  const { data, error } = await session!.supabase
    .from("sites")
    .select("id, company_id, site_name, status")
    .eq("company_id", companyId)
    .order("site_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    sites: (data ?? []).map((site) => ({
      id: site.id,
      companyId: site.company_id,
      siteName: site.site_name,
      status: site.status === "inactive" ? "inactive" : "active",
    })),
  });
}
