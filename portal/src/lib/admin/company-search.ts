import type { SupabaseClient } from "@supabase/supabase-js";

/** Escape user input for SQL `ilike` patterns. */
export function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

const COMPANY_SEARCH_COLUMNS =
  "id, customer_id_readable, company_name, primary_contact_name, status" as const;

function rankCompanies(rows: CompanySearchRow[], q: string): CompanySearchRow[] {
  const qLower = q.toLowerCase();
  return [...rows].sort((a, b) => {
    const aId = a.customerIdReadable.toLowerCase();
    const bId = b.customerIdReadable.toLowerCase();
    const aExact = aId === qLower;
    const bExact = bId === qLower;
    if (aExact !== bExact) return aExact ? -1 : 1;
    const aPrefix = aId.startsWith(qLower);
    const bPrefix = bId.startsWith(qLower);
    if (aPrefix !== bPrefix) return aPrefix ? -1 : 1;
    return a.companyName.localeCompare(b.companyName);
  });
}

/** Search companies by customer number, company name, or primary contact (safe for spaces). */
export async function searchCompanies(
  supabase: SupabaseClient,
  q: string,
  limit = 25
): Promise<{ companies: CompanySearchRow[]; error: string | null }> {
  const pattern = `%${escapeIlikePattern(q)}%`;

  const [byName, byCustomerId, byContact] = await Promise.all([
    supabase
      .from("companies")
      .select(COMPANY_SEARCH_COLUMNS)
      .ilike("company_name", pattern)
      .limit(limit),
    supabase
      .from("companies")
      .select(COMPANY_SEARCH_COLUMNS)
      .ilike("customer_id_readable", pattern)
      .limit(limit),
    supabase
      .from("companies")
      .select(COMPANY_SEARCH_COLUMNS)
      .ilike("primary_contact_name", pattern)
      .limit(limit),
  ]);

  const firstError = byName.error ?? byCustomerId.error ?? byContact.error;
  if (firstError) {
    return { companies: [], error: firstError.message };
  }

  const merged = new Map<string, CompanySearchRow>();
  for (const row of [
    ...(byName.data ?? []),
    ...(byCustomerId.data ?? []),
    ...(byContact.data ?? []),
  ]) {
    merged.set(row.id, mapCompanySearchRow(row));
  }

  return {
    companies: rankCompanies([...merged.values()], q).slice(0, limit),
    error: null,
  };
}

export type CompanySearchRow = {
  id: string;
  companyName: string;
  customerIdReadable: string;
  status: "active" | "inactive";
};

export function mapCompanySearchRow(row: {
  id: string;
  company_name: string;
  customer_id_readable: string;
  primary_contact_name?: string | null;
  status: string;
}): CompanySearchRow {
  return {
    id: row.id,
    companyName: row.company_name,
    customerIdReadable: row.customer_id_readable,
    status: row.status === "inactive" ? "inactive" : "active",
  };
}
