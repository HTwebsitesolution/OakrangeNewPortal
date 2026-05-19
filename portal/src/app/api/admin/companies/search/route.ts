import { NextResponse } from "next/server";
import { mapCompanySearchRow, searchCompanies } from "@/lib/admin/company-search";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MIN_QUERY_LENGTH = 2;

export async function GET(request: Request) {
  const { session, response } = await requireAdminRoute();
  if (response) return response;
  const { supabase } = session!;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();

  if (id) {
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid company id." }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("companies")
      .select("id, customer_id_readable, company_name, status")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      companies: data ? [mapCompanySearchRow(data)] : [],
    });
  }

  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ companies: [] });
  }

  const { companies, error } = await searchCompanies(supabase, q);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ companies });
}
