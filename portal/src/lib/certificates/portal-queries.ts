import type { SupabaseClient } from "@supabase/supabase-js";
import { one } from "@/lib/admin/embed";
import { escapeIlikePattern } from "@/lib/admin/ilike";
import { parseCertificateDocumentType } from "@/lib/certificates/document-types";
import {
  getCertificateExpiryState,
  isCertificateExpiringSoon,
  startOfUtcDay,
} from "@/lib/certificates/format";
import type {
  CertificateDocumentType,
  CertificateExpiryState,
  CertificateStatus,
} from "@/lib/certificates/types";

const PORTAL_CERTIFICATE_SELECT = `
  id,
  company_id,
  site_id,
  document_type,
  display_title,
  download_file_name,
  issue_date,
  due_date,
  uploaded_at,
  published_at,
  status,
  search_tags,
  notes,
  companies(id, company_name, customer_id_readable),
  sites(id, site_name)
`.replace(/\s+/g, " ");

const PORTAL_CERTIFICATE_DETAIL_SELECT = `
  id,
  company_id,
  site_id,
  document_type,
  display_title,
  download_file_name,
  issue_date,
  due_date,
  uploaded_at,
  published_at,
  status,
  companies(id, company_name, customer_id_readable),
  sites(id, site_name)
`.replace(/\s+/g, " ");

export const PORTAL_COMPANY_LEVEL_SITE_FILTER = "company-level";

const PORTAL_SIGNED_URL_SELECT = `
  id,
  company_id,
  site_id,
  storage_path,
  display_title,
  download_file_name,
  status,
  published_at
`.replace(/\s+/g, " ");

export type PortalExpiryFilter = "active" | "expired" | "no_due_date";

export type PortalCertificateListFilters = {
  search?: string | null;
  companyId?: string | null;
  siteId?: string | null;
  documentType?: CertificateDocumentType | null;
  expiry?: PortalExpiryFilter | null;
  issueDateFrom?: string | null;
  issueDateTo?: string | null;
  dueDateFrom?: string | null;
  dueDateTo?: string | null;
  limit?: number | null;
};

export type PortalCertificateRow = {
  id: string;
  company_id: string;
  site_id: string | null;
  document_type: string;
  display_title: string;
  download_file_name: string;
  issue_date: string;
  due_date: string | null;
  uploaded_at: string;
  published_at: string | null;
  status: CertificateStatus;
  search_tags: string[] | null;
  notes: string | null;
  companies:
    | { id: string; company_name: string; customer_id_readable: string }
    | { id: string; company_name: string; customer_id_readable: string }[]
    | null;
  sites:
    | { id: string; site_name: string }
    | { id: string; site_name: string }[]
    | null;
};

export type PortalCertificateDetail = PortalCertificateRow;

export type PortalAccessGrant = {
  id: string;
  access_type: "company" | "site";
  company_id: string;
  site_id: string | null;
  sites:
    | { id: string; site_name: string }
    | { id: string; site_name: string }[]
    | null;
  companies:
    | { id: string; company_name: string; customer_id_readable: string }
    | { id: string; company_name: string; customer_id_readable: string }[]
    | null;
};

export type PortalSiteSummary = {
  companyId: string;
  companyLabel: string | null;
  siteId: string | null;
  siteName: string;
  certificateCount: number;
  expiredCount: number;
  expiringSoonCount: number;
  latestIssueDate: string | null;
};

export type PortalCompanyOption = {
  id: string;
  companyName: string;
  customerIdReadable: string;
};

export type PortalTeamMember = {
  assignmentId: string;
  memberName: string;
  companyName: string | null;
  customerIdReadable: string | null;
};

export type PortalDashboardData = {
  companyName: string | null;
  customerIdReadable: string | null;
  /** Every company this login can see certificates for (direct grants and approved delegation). */
  companies: PortalCompanyOption[];
  totalCertificates: number;
  expiredCount: number;
  expiringSoonCount: number;
  latestCertificates: PortalCertificateRow[];
  siteSummaries: PortalSiteSummary[];
  hasCompanyWideAccess: boolean;
  hasDelegatedAccess: boolean;
  assignedSiteCount: number;
  teamMembers: PortalTeamMember[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMPTY_DASHBOARD: PortalDashboardData = {
  companyName: null,
  customerIdReadable: null,
  companies: [],
  totalCertificates: 0,
  expiredCount: 0,
  expiringSoonCount: 0,
  latestCertificates: [],
  siteSummaries: [],
  hasCompanyWideAccess: false,
  hasDelegatedAccess: false,
  assignedSiteCount: 0,
  teamMembers: [],
};

function normalizeSearch(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed || null;
}

function parseExpiryFilter(
  value: string | null | undefined
): PortalExpiryFilter | null {
  return value === "active" || value === "expired" || value === "no_due_date"
    ? value
    : null;
}

export function readPortalCertificateListFilters(
  searchParams: { [key: string]: string | string[] | undefined }
): PortalCertificateListFilters {
  const read = (key: string) => {
    const value = searchParams[key];
    return typeof value === "string" ? value : null;
  };

  const companyId = normalizeSearch(read("companyId"));

  return {
    search: normalizeSearch(read("q") ?? read("search")),
    companyId: companyId && UUID_RE.test(companyId) ? companyId : null,
    siteId: normalizeSearch(read("siteId")),
    documentType: parseCertificateDocumentType(read("documentType")),
    expiry: parseExpiryFilter(read("status") ?? read("expiry")),
    issueDateFrom: normalizeSearch(read("issueDateFrom")),
    issueDateTo: normalizeSearch(read("issueDateTo")),
    dueDateFrom: normalizeSearch(read("dueDateFrom")),
    dueDateTo: normalizeSearch(read("dueDateTo")),
  };
}

function matchesExpiryFilter(
  row: PortalCertificateRow,
  filter: PortalExpiryFilter | null | undefined
): boolean {
  if (!filter) return true;

  const expiryState = getCertificateExpiryState({
    status: row.status,
    dueDate: row.due_date,
  });

  if (filter === "no_due_date") return expiryState === "no_due_date";
  if (filter === "expired") return expiryState === "expired";
  return expiryState === "active";
}

function matchesSearch(row: PortalCertificateRow, search: string | null): boolean {
  if (!search) return true;

  const pattern = search.toLowerCase();
  const site = one(row.sites);
  const company = one(row.companies);
  const haystack = [
    row.display_title,
    site?.site_name ?? "",
    company?.company_name ?? "",
    row.document_type,
    row.notes ?? "",
    ...(row.search_tags ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(pattern);
}

export async function listPortalCertificates(
  supabase: SupabaseClient,
  filters: PortalCertificateListFilters = {}
): Promise<{ rows: PortalCertificateRow[]; error: string | null }> {
  let query = supabase
    .from("certificate_documents")
    .select(PORTAL_CERTIFICATE_SELECT)
    .eq("status", "active")
    .not("published_at", "is", null)
    .order("issue_date", { ascending: false })
    .order("uploaded_at", { ascending: false });

  if (filters.companyId) {
    query = query.eq("company_id", filters.companyId);
  }

  if (filters.siteId === PORTAL_COMPANY_LEVEL_SITE_FILTER) {
    query = query.is("site_id", null);
  } else if (filters.siteId && UUID_RE.test(filters.siteId)) {
    query = query.eq("site_id", filters.siteId);
  }

  if (filters.documentType) {
    query = query.eq("document_type", filters.documentType);
  }

  if (filters.issueDateFrom) {
    query = query.gte("issue_date", filters.issueDateFrom);
  }
  if (filters.issueDateTo) {
    query = query.lte("issue_date", filters.issueDateTo);
  }
  if (filters.dueDateFrom) {
    query = query.gte("due_date", filters.dueDateFrom);
  }
  if (filters.dueDateTo) {
    query = query.lte("due_date", filters.dueDateTo);
  }

  if (filters.expiry === "no_due_date") {
    query = query.is("due_date", null);
  } else if (filters.expiry === "expired") {
    const today = startOfUtcDay().toISOString().slice(0, 10);
    query = query.lt("due_date", today);
  } else if (filters.expiry === "active") {
    const today = startOfUtcDay().toISOString().slice(0, 10);
    query = query.gte("due_date", today);
  }

  const search = normalizeSearch(filters.search);
  if (search) {
    const escaped = escapeIlikePattern(search);
    query = query.or(
      [
        `display_title.ilike.%${escaped}%`,
        `notes.ilike.%${escaped}%`,
        `document_type.ilike.%${escaped}%`,
      ].join(",")
    );
  }

  const listLimit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 300) : 300;
  query = query.limit(listLimit);

  const { data, error } = await query;

  if (error) {
    return { rows: [], error: error.message };
  }

  let rows = ((data ?? []) as unknown) as PortalCertificateRow[];

  if (filters.search) {
    rows = rows.filter((row) => matchesSearch(row, filters.search ?? null));
  }

  if (filters.expiry) {
    rows = rows.filter((row) => matchesExpiryFilter(row, filters.expiry));
  }

  if (filters.limit && filters.limit > 0) {
    rows = rows.slice(0, filters.limit);
  }

  return { rows, error: null };
}

export async function getPortalCertificateById(
  supabase: SupabaseClient,
  id: string
): Promise<{ certificate: PortalCertificateDetail | null; error: string | null }> {
  const { data, error } = await supabase
    .from("certificate_documents")
    .select(PORTAL_CERTIFICATE_DETAIL_SELECT)
    .eq("id", id)
    .eq("status", "active")
    .not("published_at", "is", null)
    .maybeSingle();

  if (error) {
    return { certificate: null, error: error.message };
  }

  return {
    certificate: (data as PortalCertificateDetail | null) ?? null,
    error: null,
  };
}

export async function getPortalCertificateForSignedUrl(
  supabase: SupabaseClient,
  id: string
): Promise<{
  certificate: {
    id: string;
    company_id: string;
    site_id: string | null;
    storage_path: string;
    display_title: string;
    download_file_name: string;
  } | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("certificate_documents")
    .select(PORTAL_SIGNED_URL_SELECT)
    .eq("id", id)
    .eq("status", "active")
    .not("published_at", "is", null)
    .maybeSingle();

  if (error) {
    return { certificate: null, error: error.message };
  }

  const row = data as {
    id: string;
    company_id: string;
    site_id: string | null;
    storage_path: string | null;
    display_title: string;
    download_file_name: string;
  } | null;

  if (!row?.storage_path) {
    return { certificate: null, error: null };
  }

  return {
    certificate: {
      id: row.id,
      company_id: row.company_id,
      site_id: row.site_id,
      storage_path: row.storage_path,
      display_title: row.display_title,
      download_file_name: row.download_file_name,
    },
    error: null,
  };
}

export async function loadPortalAccessGrants(
  supabase: SupabaseClient,
  profileId: string
): Promise<{ grants: PortalAccessGrant[]; error: string | null }> {
  const { data, error } = await supabase
    .from("user_site_access")
    .select(
      "id, access_type, company_id, site_id, sites(id, site_name), companies(id, company_name, customer_id_readable)"
    )
    .eq("user_id", profileId);

  if (error) {
    return { grants: [], error: error.message };
  }

  return { grants: (data ?? []) as PortalAccessGrant[], error: null };
}

type DelegatedScope = { company_id: string; site_id: string | null };

/** Active approved delegated scopes for the signed-in manager (RLS: own assignments only). */
async function loadDelegatedScopes(supabase: SupabaseClient): Promise<DelegatedScope[]> {
  const { data, error } = await supabase
    .from("manager_assignment_scopes")
    .select("company_id, site_id, manager_user_assignments!inner(is_active)")
    .eq("is_active", true)
    .eq("manager_user_assignments.is_active", true);
  if (error) return [];
  return (data ?? []).map((row) => ({
    company_id: row.company_id as string,
    site_id: (row.site_id as string | null) ?? null,
  }));
}

async function loadTeamMembers(supabase: SupabaseClient): Promise<PortalTeamMember[]> {
  const { data, error } = await supabase.rpc("manager_team_members");
  if (error || !Array.isArray(data)) return [];
  return data.map((row: {
    assignment_id: string;
    member_name: string;
    company_name: string | null;
    customer_id_readable: string | null;
  }) => ({
    assignmentId: row.assignment_id,
    memberName: row.member_name,
    companyName: row.company_name,
    customerIdReadable: row.customer_id_readable,
  }));
}

function collectCompanies(
  rows: PortalCertificateRow[],
  grants: PortalAccessGrant[],
  extra: Array<{ id: string; company_name: string; customer_id_readable: string }> = []
): PortalCompanyOption[] {
  const byId = new Map<string, PortalCompanyOption>();
  const add = (c: { id: string; company_name: string; customer_id_readable: string } | null) => {
    if (c && !byId.has(c.id)) {
      byId.set(c.id, { id: c.id, companyName: c.company_name, customerIdReadable: c.customer_id_readable });
    }
  };
  for (const row of rows) add(one(row.companies));
  for (const grant of grants) add(one(grant.companies));
  for (const c of extra) add(c);
  return [...byId.values()].sort((a, b) => a.companyName.localeCompare(b.companyName));
}

function buildSiteSummaries(rows: PortalCertificateRow[], multiCompany: boolean): PortalSiteSummary[] {
  const summaries = new Map<string, PortalSiteSummary>();

  for (const row of rows) {
    const site = one(row.sites);
    const company = one(row.companies);
    const key = `${row.company_id}:${row.site_id ?? "company-level"}`;
    const siteName = site?.site_name ?? "Company-level documents";
    const existing =
      summaries.get(key) ??
      ({
        companyId: row.company_id,
        companyLabel:
          multiCompany && company
            ? `${company.company_name} (${company.customer_id_readable})`
            : null,
        siteId: row.site_id,
        siteName,
        certificateCount: 0,
        expiredCount: 0,
        expiringSoonCount: 0,
        latestIssueDate: null,
      } satisfies PortalSiteSummary);

    existing.certificateCount += 1;

    const expiryState = getCertificateExpiryState({
      status: row.status,
      dueDate: row.due_date,
    });
    if (expiryState === "expired") {
      existing.expiredCount += 1;
    }
    if (
      isCertificateExpiringSoon({
        status: row.status,
        dueDate: row.due_date,
      })
    ) {
      existing.expiringSoonCount += 1;
    }
    if (
      !existing.latestIssueDate ||
      row.issue_date > existing.latestIssueDate
    ) {
      existing.latestIssueDate = row.issue_date;
    }

    summaries.set(key, existing);
  }

  return [...summaries.values()].sort(
    (a, b) =>
      (a.companyLabel ?? "").localeCompare(b.companyLabel ?? "") ||
      (a.siteId === null ? -1 : b.siteId === null ? 1 : a.siteName.localeCompare(b.siteName))
  );
}

export async function loadPortalDashboardData(
  supabase: SupabaseClient,
  profileId: string
): Promise<{ data: PortalDashboardData; error: string | null }> {
  const { rows, error } = await listPortalCertificates(supabase, {});
  if (error) {
    return { data: EMPTY_DASHBOARD, error };
  }

  const [{ grants, error: grantsError }, delegated, teamMembers] = await Promise.all([
    loadPortalAccessGrants(supabase, profileId),
    loadDelegatedScopes(supabase),
    loadTeamMembers(supabase),
  ]);
  if (grantsError) {
    return { data: EMPTY_DASHBOARD, error: grantsError };
  }

  let delegatedCompanies: Array<{ id: string; company_name: string; customer_id_readable: string }> = [];
  if (delegated.length) {
    const { data } = await supabase
      .from("companies")
      .select("id, company_name, customer_id_readable")
      .in("id", [...new Set(delegated.map((d) => d.company_id))]);
    delegatedCompanies = data ?? [];
  }

  const companies = collectCompanies(rows, grants, delegatedCompanies);
  const single = companies.length === 1 ? companies[0] : null;
  const hasCompanyWideAccess = grants.some(
    (grant) => grant.access_type === "company"
  );
  const assignedSiteCount = new Set([
    ...grants
      .filter((grant) => grant.access_type === "site" && grant.site_id)
      .map((grant) => grant.site_id as string),
    ...delegated.filter((d) => d.site_id).map((d) => d.site_id as string),
  ]).size;

  let expiredCount = 0;
  let expiringSoonCount = 0;

  for (const row of rows) {
    const expiryState = getCertificateExpiryState({
      status: row.status,
      dueDate: row.due_date,
    });
    if (expiryState === "expired") expiredCount += 1;
    if (
      isCertificateExpiringSoon({
        status: row.status,
        dueDate: row.due_date,
      })
    ) {
      expiringSoonCount += 1;
    }
  }

  return {
    data: {
      companyName: single?.companyName ?? null,
      customerIdReadable: single?.customerIdReadable ?? null,
      companies,
      totalCertificates: rows.length,
      expiredCount,
      expiringSoonCount,
      latestCertificates: rows.slice(0, 5),
      siteSummaries: buildSiteSummaries(rows, companies.length > 1),
      hasCompanyWideAccess,
      hasDelegatedAccess: delegated.length > 0,
      assignedSiteCount,
      teamMembers,
    },
    error: null,
  };
}

export function getPortalExpiryStateForRow(row: PortalCertificateRow): CertificateExpiryState {
  return getCertificateExpiryState({
    status: row.status,
    dueDate: row.due_date,
  });
}

export type PortalFilterOptions = {
  options: Array<{ value: string; label: string }>;
  showSiteFilter: boolean;
  companyOptions: Array<{ value: string; label: string }>;
  showCompanyFilter: boolean;
};

/**
 * Site and company filter options, built only from what this login can already read through RLS
 * (visible certificates, own grants, own approved delegated scopes).
 */
export async function loadPortalSiteFilterOptions(
  supabase: SupabaseClient,
  profileId: string
): Promise<PortalFilterOptions> {
  const empty: PortalFilterOptions = { options: [], showSiteFilter: false, companyOptions: [], showCompanyFilter: false };
  const [{ grants, error: grantsError }, { rows }, delegated] = await Promise.all([
    loadPortalAccessGrants(supabase, profileId),
    listPortalCertificates(supabase, {}),
    loadDelegatedScopes(supabase),
  ]);
  if (grantsError) return empty;

  const delegatedSiteIds = [...new Set(delegated.filter((d) => d.site_id).map((d) => d.site_id as string))];
  const [{ data: delegatedSites }, { data: delegatedCompanies }] = await Promise.all([
    delegatedSiteIds.length
      ? supabase.from("sites").select("id, company_id, site_name").in("id", delegatedSiteIds)
      : Promise.resolve({ data: [] as Array<{ id: string; company_id: string; site_name: string }> }),
    delegated.length
      ? supabase
          .from("companies")
          .select("id, company_name, customer_id_readable")
          .in("id", [...new Set(delegated.map((d) => d.company_id))])
      : Promise.resolve({ data: [] as Array<{ id: string; company_name: string; customer_id_readable: string }> }),
  ]);

  const companies = collectCompanies(rows, grants, delegatedCompanies ?? []);
  const multiCompany = companies.length > 1;
  const companyName = new Map(companies.map((c) => [c.id, c.companyName]));

  const sites = new Map<string, string>();
  const addSite = (siteId: string, siteName: string, companyId: string) => {
    const owner = companyName.get(companyId);
    sites.set(siteId, multiCompany && owner ? `${siteName} — ${owner}` : siteName);
  };
  let hasCompanyLevel = false;
  for (const row of rows) {
    const site = one(row.sites);
    if (!row.site_id) hasCompanyLevel = true;
    else if (site) addSite(row.site_id, site.site_name, row.company_id);
  }
  for (const grant of grants) {
    const site = one(grant.sites);
    if (grant.access_type === "site" && grant.site_id && site) addSite(grant.site_id, site.site_name, grant.company_id);
  }
  for (const site of delegatedSites ?? []) addSite(site.id, site.site_name, site.company_id);

  const options = [...sites.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
  if (hasCompanyLevel) {
    options.unshift({ value: PORTAL_COMPANY_LEVEL_SITE_FILTER, label: "Company-level documents" });
  }

  return {
    options,
    showSiteFilter: options.length > 1,
    companyOptions: companies.map((c) => ({ value: c.id, label: `${c.companyName} (${c.customerIdReadable})` })),
    showCompanyFilter: multiCompany,
  };
}

