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
  download_file_name,
  status,
  published_at
`.replace(/\s+/g, " ");

export type PortalExpiryFilter = "active" | "expired" | "no_due_date";

export type PortalCertificateListFilters = {
  search?: string | null;
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
  siteId: string | null;
  siteName: string;
  certificateCount: number;
  expiredCount: number;
  expiringSoonCount: number;
  latestIssueDate: string | null;
};

export type PortalDashboardData = {
  companyName: string | null;
  customerIdReadable: string | null;
  totalCertificates: number;
  expiredCount: number;
  expiringSoonCount: number;
  latestCertificates: PortalCertificateRow[];
  siteSummaries: PortalSiteSummary[];
  hasCompanyWideAccess: boolean;
  assignedSiteCount: number;
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

  return {
    search: normalizeSearch(read("q") ?? read("search")),
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

  if (filters.siteId === PORTAL_COMPANY_LEVEL_SITE_FILTER) {
    query = query.is("site_id", null);
  } else if (filters.siteId) {
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

  if (filters.limit && filters.limit > 0) {
    query = query.limit(filters.limit);
  }

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

function buildSiteSummaries(rows: PortalCertificateRow[]): PortalSiteSummary[] {
  const summaries = new Map<string, PortalSiteSummary>();

  for (const row of rows) {
    const site = one(row.sites);
    const key = row.site_id ?? "company-level";
    const siteName = site?.site_name ?? "Company-level documents";
    const existing =
      summaries.get(key) ??
      ({
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

  return [...summaries.values()].sort((a, b) =>
    a.siteName.localeCompare(b.siteName)
  );
}

export async function loadPortalDashboardData(
  supabase: SupabaseClient,
  profileId: string
): Promise<{ data: PortalDashboardData; error: string | null }> {
  const { rows, error } = await listPortalCertificates(supabase, {});
  if (error) {
    return {
      data: {
        companyName: null,
        customerIdReadable: null,
        totalCertificates: 0,
        expiredCount: 0,
        expiringSoonCount: 0,
        latestCertificates: [],
        siteSummaries: [],
        hasCompanyWideAccess: false,
        assignedSiteCount: 0,
      },
      error,
    };
  }

  const { grants, error: grantsError } = await loadPortalAccessGrants(
    supabase,
    profileId
  );
  if (grantsError) {
    return {
      data: {
        companyName: null,
        customerIdReadable: null,
        totalCertificates: 0,
        expiredCount: 0,
        expiringSoonCount: 0,
        latestCertificates: [],
        siteSummaries: [],
        hasCompanyWideAccess: false,
        assignedSiteCount: 0,
      },
      error: grantsError,
    };
  }

  const company = one(rows[0]?.companies) ?? one(grants[0]?.companies);
  const hasCompanyWideAccess = grants.some(
    (grant) => grant.access_type === "company"
  );
  const assignedSiteCount = grants.filter(
    (grant) => grant.access_type === "site" && grant.site_id
  ).length;

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
      companyName: company?.company_name ?? null,
      customerIdReadable: company?.customer_id_readable ?? null,
      totalCertificates: rows.length,
      expiredCount,
      expiringSoonCount,
      latestCertificates: rows.slice(0, 5),
      siteSummaries: buildSiteSummaries(rows),
      hasCompanyWideAccess,
      assignedSiteCount,
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

export async function loadPortalSiteFilterOptions(
  supabase: SupabaseClient,
  profileId: string
): Promise<{ options: Array<{ value: string; label: string }>; showSiteFilter: boolean }> {
  const { grants, error: grantsError } = await loadPortalAccessGrants(supabase, profileId);
  if (grantsError) {
    return { options: [], showSiteFilter: false };
  }

  const hasCompanyAccess = grants.some((grant) => grant.access_type === "company");
  const siteGrants = grants.filter(
    (grant) => grant.access_type === "site" && grant.site_id
  );

  if (hasCompanyAccess) {
    const { rows } = await listPortalCertificates(supabase, {});
    const options = new Map<string, string>();

    for (const row of rows) {
      if (!row.site_id) {
        options.set(PORTAL_COMPANY_LEVEL_SITE_FILTER, "Company-level documents");
        continue;
      }
      const site = one(row.sites);
      if (site) {
        options.set(row.site_id, site.site_name);
      }
    }

    return {
      options: [...options.entries()].map(([value, label]) => ({ value, label })),
      showSiteFilter: options.size > 1,
    };
  }

  const options = siteGrants
    .map((grant) => {
      const site = one(grant.sites);
      if (!grant.site_id || !site) return null;
      return { value: grant.site_id, label: site.site_name };
    })
    .filter((item): item is { value: string; label: string } => item !== null);

  return {
    options,
    showSiteFilter: options.length > 1,
  };
}

