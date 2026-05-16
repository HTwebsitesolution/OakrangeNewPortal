import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditAction } from "@/lib/audit/log";

export const AUDIT_ACTION_OPTIONS: Array<{ value: AuditAction; label: string }> = [
  { value: "login", label: "User login" },
  { value: "logout", label: "User logout" },
  { value: "account_disabled_block", label: "Account disabled block" },
  { value: "access_pending_redirect", label: "Access pending redirect" },
  { value: "customer_created", label: "Customer created" },
  { value: "customer_updated", label: "Customer updated" },
  { value: "customer_deactivated", label: "Customer deactivated" },
  { value: "customer_reactivated", label: "Customer reactivated" },
  { value: "customer_deleted", label: "Customer deleted" },
  { value: "site_created", label: "Site created" },
  { value: "site_updated", label: "Site updated" },
  { value: "site_deactivated", label: "Site deactivated" },
  { value: "site_reactivated", label: "Site reactivated" },
  { value: "user_created", label: "User created" },
  { value: "user_updated", label: "User updated" },
  { value: "user_deactivated", label: "User deactivated" },
  { value: "user_reactivated", label: "User reactivated" },
  { value: "user_role_changed", label: "User role changed" },
  { value: "password_reset_or_invite_sent", label: "Password reset / invite sent" },
  { value: "access_grant_created", label: "Access grant created" },
  { value: "access_grant_removed", label: "Access grant removed" },
  { value: "access_grant_changed", label: "Access grant changed" },
  { value: "certificate_uploaded", label: "Certificate uploaded" },
  { value: "certificate_published", label: "Certificate published" },
  { value: "certificate_replaced", label: "Certificate replaced" },
  { value: "certificate_voided", label: "Certificate voided" },
  { value: "certificate_archived", label: "Certificate archived" },
  { value: "certificate_viewed_admin", label: "Certificate viewed (admin)" },
  { value: "certificate_downloaded_admin", label: "Certificate downloaded (admin)" },
  { value: "certificate_viewed_customer", label: "Certificate viewed (customer)" },
  { value: "certificate_downloaded_customer", label: "Certificate downloaded (customer)" },
];

export const AUDIT_ENTITY_TYPE_OPTIONS = [
  "auth",
  "company",
  "site",
  "profile",
  "user_site_access",
  "certificate_document",
] as const;

export type AuditLogListFilters = {
  action?: string | null;
  userId?: string | null;
  companyId?: string | null;
  siteId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  search?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  limit?: number;
  page?: number;
  pageSize?: number;
};

export type AuditLogListResult = {
  rows: AuditLogRow[];
  error: string | null;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type AuditLogRow = {
  id: string;
  created_at: string;
  action: string;
  user_role: string | null;
  entity_type: string;
  entity_id: string | null;
  company_id: string | null;
  site_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata_json: Record<string, unknown> | null;
  profiles:
    | { id: string; full_name: string | null; email: string }
    | { id: string; full_name: string | null; email: string }[]
    | null;
  companies:
    | { id: string; company_name: string; customer_id_readable: string }
    | { id: string; company_name: string; customer_id_readable: string }[]
    | null;
  sites:
    | { id: string; site_name: string }
    | { id: string; site_name: string }[]
    | null;
};

const AUDIT_LOG_SELECT = `
  id,
  created_at,
  action,
  user_role,
  entity_type,
  entity_id,
  company_id,
  site_id,
  ip_address,
  user_agent,
  metadata_json,
  profiles(id, full_name, email),
  companies(id, company_name, customer_id_readable),
  sites(id, site_name)
`.replace(/\s+/g, " ");

function normalizeSearch(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed || null;
}

export function readAuditLogListFilters(
  searchParams: { [key: string]: string | string[] | undefined }
): AuditLogListFilters & { page: number; pageSize: number } {
  const read = (key: string) => {
    const value = searchParams[key];
    return typeof value === "string" ? value : null;
  };

  const rawPage = Number.parseInt(read("page") ?? "1", 10);
  const rawSize = Number.parseInt(read("pageSize") ?? "50", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize =
    Number.isFinite(rawSize) && rawSize > 0 ? Math.min(rawSize, 100) : 50;

  return {
    action: normalizeSearch(read("action")),
    userId: normalizeSearch(read("userId")),
    companyId: normalizeSearch(read("companyId")),
    siteId: normalizeSearch(read("siteId")),
    entityType: normalizeSearch(read("entityType")),
    entityId: normalizeSearch(read("entityId")),
    search: normalizeSearch(read("q") ?? read("search")),
    dateFrom: normalizeSearch(read("dateFrom")),
    dateTo: normalizeSearch(read("dateTo")),
    page,
    pageSize,
  };
}

export function formatAuditEntitySummary(row: AuditLogRow): string {
  const meta = row.metadata_json ?? {};
  const displayTitle =
    typeof meta.display_title === "string" ? meta.display_title : null;
  if (displayTitle) return displayTitle;

  const companyName =
    typeof meta.company_name === "string" ? meta.company_name : null;
  const siteName = typeof meta.site_name === "string" ? meta.site_name : null;
  if (companyName && siteName) return `${companyName} — ${siteName}`;
  if (companyName) return companyName;
  if (siteName) return siteName;

  if (typeof meta.email === "string") return meta.email;

  if (row.entity_id) return `${row.entity_type} ${row.entity_id.slice(0, 8)}…`;
  return row.entity_type;
}

export async function listAuditLogs(
  supabase: SupabaseClient,
  filters: AuditLogListFilters = {}
): Promise<AuditLogListResult> {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize =
    filters.pageSize && filters.pageSize > 0
      ? Math.min(filters.pageSize, 100)
      : filters.limit && filters.limit > 0
        ? Math.min(filters.limit, 100)
        : 50;
  const offset = (page - 1) * pageSize;
  const fetchTo = offset + pageSize;

  let query = supabase
    .from("audit_logs")
    .select(AUDIT_LOG_SELECT)
    .order("created_at", { ascending: false });

  if (filters.action) query = query.eq("action", filters.action);
  if (filters.userId) query = query.eq("user_id", filters.userId);
  if (filters.companyId) query = query.eq("company_id", filters.companyId);
  if (filters.siteId) query = query.eq("site_id", filters.siteId);
  if (filters.entityType) query = query.eq("entity_type", filters.entityType);
  if (filters.entityId) query = query.eq("entity_id", filters.entityId);
  if (filters.dateFrom) query = query.gte("created_at", `${filters.dateFrom}T00:00:00.000Z`);
  if (filters.dateTo) query = query.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);

  query = query.range(offset, fetchTo);

  const { data, error } = await query;
  if (error) {
    return { rows: [], error: error.message, page, pageSize, hasMore: false };
  }

  let rows = ((data ?? []) as unknown) as AuditLogRow[];
  const hasMore = rows.length > pageSize;
  if (hasMore) {
    rows = rows.slice(0, pageSize);
  }

  const search = normalizeSearch(filters.search);
  if (search) {
    const pattern = search.toLowerCase();
    rows = rows.filter((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const company = Array.isArray(row.companies) ? row.companies[0] : row.companies;
      const haystack = [
        row.action,
        row.entity_type,
        profile?.email ?? "",
        profile?.full_name ?? "",
        company?.company_name ?? "",
        company?.customer_id_readable ?? "",
        JSON.stringify(row.metadata_json ?? {}),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(pattern);
    });
  }

  return { rows, error: null, page, pageSize, hasMore };
}

export async function getAuditLogById(
  supabase: SupabaseClient,
  id: string
): Promise<{ row: AuditLogRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select(AUDIT_LOG_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) return { row: null, error: error.message };
  return { row: ((data as unknown) as AuditLogRow | null) ?? null, error: null };
}

export async function listCertificateAuditLogs(
  supabase: SupabaseClient,
  certificateId: string,
  limit = 25
): Promise<{ rows: AuditLogRow[]; error: string | null }> {
  return listAuditLogs(supabase, {
    entityType: "certificate_document",
    entityId: certificateId,
    limit,
  });
}

export async function loadAuditFilterOptions(supabase: SupabaseClient): Promise<{
  companies: Array<{ id: string; company_name: string; customer_id_readable: string }>;
  users: Array<{ id: string; full_name: string | null; email: string }>;
  error: string | null;
}> {
  const [companiesRes, usersRes] = await Promise.all([
    supabase
      .from("companies")
      .select("id, company_name, customer_id_readable")
      .order("company_name"),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .neq("role", "oakrange_admin")
      .order("email"),
  ]);

  if (companiesRes.error) {
    return { companies: [], users: [], error: companiesRes.error.message };
  }
  if (usersRes.error) {
    return { companies: [], users: [], error: usersRes.error.message };
  }

  return {
    companies: companiesRes.data ?? [],
    users: usersRes.data ?? [],
    error: null,
  };
}

export function parseAuditAction(
  value: string | null | undefined
): AuditAction | null {
  if (!value) return null;
  return AUDIT_ACTION_OPTIONS.some((item) => item.value === value)
    ? (value as AuditAction)
    : null;
}
