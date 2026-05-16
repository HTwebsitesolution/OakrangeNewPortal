import type { SupabaseClient } from "@supabase/supabase-js";
import { escapeIlikePattern } from "@/lib/admin/ilike";
import { parseCertificateDocumentType } from "@/lib/certificates/document-types";
import type {
  CertificateDocumentType,
  CertificateStatus,
} from "@/lib/certificates/types";

const ADMIN_CERTIFICATE_SELECT = `
  id,
  company_id,
  site_id,
  document_type,
  original_file_name,
  display_title,
  download_file_name,
  storage_path,
  file_size_bytes,
  mime_type,
  issue_date,
  due_date,
  uploaded_at,
  uploaded_by,
  published_at,
  status,
  notes,
  search_tags,
  replaced_by_document_id,
  companies(id, company_name, customer_id_readable, status),
  sites(id, site_name, status),
  profiles(id, email, full_name)
`.replace(/\s+/g, " ");

export type CertificateListFilters = {
  companyId?: string | null;
  siteId?: string | null;
  customerSearch?: string | null;
  siteSearch?: string | null;
  documentType?: CertificateDocumentType | null;
  issueDateFrom?: string | null;
  issueDateTo?: string | null;
  dueDateFrom?: string | null;
  dueDateTo?: string | null;
  uploadDateFrom?: string | null;
  uploadDateTo?: string | null;
  uploadedBySearch?: string | null;
  status?: CertificateStatus | null;
  originalFileName?: string | null;
  displayTitle?: string | null;
  notesSearch?: string | null;
  tag?: string | null;
  page?: number;
  pageSize?: number;
};

export type AdminCertificateListResult = {
  rows: AdminCertificateListRow[];
  error: string | null;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export function parseCertificateStatus(
  value: string | null | undefined
): CertificateStatus | null {
  return value === "active" ||
    value === "void" ||
    value === "replaced" ||
    value === "archived"
    ? value
    : null;
}

export type AdminCertificateListRow = {
  id: string;
  company_id: string;
  site_id: string | null;
  document_type: string;
  original_file_name: string;
  display_title: string;
  download_file_name: string;
  storage_path: string;
  file_size_bytes: number | null;
  mime_type: string;
  issue_date: string;
  due_date: string | null;
  uploaded_at: string;
  uploaded_by: string | null;
  published_at: string | null;
  status: CertificateStatus;
  notes: string | null;
  search_tags: string[] | null;
  replaced_by_document_id: string | null;
  companies:
    | {
        id: string;
        company_name: string;
        customer_id_readable: string;
        status: "active" | "inactive";
      }
    | {
        id: string;
        company_name: string;
        customer_id_readable: string;
        status: "active" | "inactive";
      }[]
    | null;
  sites:
    | { id: string; site_name: string; status: "active" | "inactive" }
    | { id: string; site_name: string; status: "active" | "inactive" }[]
    | null;
  profiles:
    | { id: string; email: string; full_name: string }
    | { id: string; email: string; full_name: string }[]
    | null;
};

function normalizeSearch(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed || null;
}

function dayStartIso(input: string): string {
  return `${input}T00:00:00.000Z`;
}

function dayEndIso(input: string): string {
  return `${input}T23:59:59.999Z`;
}

async function matchCompanyIds(
  supabase: SupabaseClient,
  raw: string
): Promise<string[]> {
  const pattern = `%${escapeIlikePattern(raw)}%`;
  const [byName, byCustomerId] = await Promise.all([
    supabase.from("companies").select("id").ilike("company_name", pattern),
    supabase
      .from("companies")
      .select("id")
      .ilike("customer_id_readable", pattern),
  ]);

  return [...new Set([...(byName.data ?? []), ...(byCustomerId.data ?? [])].map((row) => row.id))];
}

async function matchSiteIds(
  supabase: SupabaseClient,
  raw: string
): Promise<string[]> {
  const pattern = `%${escapeIlikePattern(raw)}%`;
  const { data } = await supabase
    .from("sites")
    .select("id")
    .ilike("site_name", pattern);
  return [...new Set((data ?? []).map((row) => row.id))];
}

async function matchProfileIds(
  supabase: SupabaseClient,
  raw: string
): Promise<string[]> {
  const pattern = `%${escapeIlikePattern(raw)}%`;
  const [byEmail, byName] = await Promise.all([
    supabase.from("profiles").select("id").ilike("email", pattern),
    supabase.from("profiles").select("id").ilike("full_name", pattern),
  ]);

  return [...new Set([...(byEmail.data ?? []), ...(byName.data ?? [])].map((row) => row.id))];
}

export async function listAdminCertificates(
  supabase: SupabaseClient,
  filters: CertificateListFilters
): Promise<AdminCertificateListResult> {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize =
    filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 50;
  const offset = (page - 1) * pageSize;
  const fetchTo = offset + pageSize;
  const customerSearch = normalizeSearch(filters.customerSearch);
  const siteSearch = normalizeSearch(filters.siteSearch);
  const uploadedBySearch = normalizeSearch(filters.uploadedBySearch);

  const [companyIds, siteIds, uploadedByIds] = await Promise.all([
    customerSearch ? matchCompanyIds(supabase, customerSearch) : Promise.resolve(null),
    siteSearch ? matchSiteIds(supabase, siteSearch) : Promise.resolve(null),
    uploadedBySearch ? matchProfileIds(supabase, uploadedBySearch) : Promise.resolve(null),
  ]);

  if (customerSearch && (companyIds?.length ?? 0) === 0) {
    return { rows: [], error: null, page, pageSize, hasMore: false };
  }

  if (siteSearch && (siteIds?.length ?? 0) === 0) {
    return { rows: [], error: null, page, pageSize, hasMore: false };
  }

  if (uploadedBySearch && (uploadedByIds?.length ?? 0) === 0) {
    return { rows: [], error: null, page, pageSize, hasMore: false };
  }

  let query = supabase
    .from("certificate_documents")
    .select(ADMIN_CERTIFICATE_SELECT)
    .order("uploaded_at", { ascending: false })
    .range(offset, fetchTo);

  if (filters.companyId) {
    query = query.eq("company_id", filters.companyId);
  }

  if (filters.siteId) {
    query = query.eq("site_id", filters.siteId);
  }

  if (companyIds) {
    query = query.in("company_id", companyIds);
  }

  if (siteIds) {
    query = query.in("site_id", siteIds);
  }

  if (uploadedByIds) {
    query = query.in("uploaded_by", uploadedByIds);
  }

  if (filters.documentType) {
    query = query.eq("document_type", filters.documentType);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
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

  if (filters.uploadDateFrom) {
    query = query.gte("uploaded_at", dayStartIso(filters.uploadDateFrom));
  }

  if (filters.uploadDateTo) {
    query = query.lte("uploaded_at", dayEndIso(filters.uploadDateTo));
  }

  if (filters.originalFileName) {
    query = query.ilike(
      "original_file_name",
      `%${escapeIlikePattern(filters.originalFileName)}%`
    );
  }

  if (filters.displayTitle) {
    query = query.ilike(
      "display_title",
      `%${escapeIlikePattern(filters.displayTitle)}%`
    );
  }

  if (filters.notesSearch) {
    query = query.ilike("notes", `%${escapeIlikePattern(filters.notesSearch)}%`);
  }

  if (filters.tag) {
    query = query.contains("search_tags", [filters.tag.trim()]);
  }

  const { data, error } = await query;
  if (error) {
    return { rows: [], error: error.message, page, pageSize, hasMore: false };
  }

  let rows = ((data ?? []) as unknown) as AdminCertificateListRow[];
  const hasMore = rows.length > pageSize;
  if (hasMore) {
    rows = rows.slice(0, pageSize);
  }

  return {
    rows,
    error: null,
    page,
    pageSize,
    hasMore,
  };
}

export function readCertificateListFilters(input: {
  [key: string]: string | string[] | undefined;
}): CertificateListFilters & { page: number; pageSize: number } {
  const get = (key: string) => {
    const value = input[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const rawPage = Number.parseInt(get("page") ?? "1", 10);
  const rawSize = Number.parseInt(get("pageSize") ?? "50", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize =
    Number.isFinite(rawSize) && rawSize > 0 ? Math.min(rawSize, 100) : 50;

  return {
    customerSearch: normalizeSearch(get("customerSearch")),
    siteSearch: normalizeSearch(get("siteSearch")),
    documentType: parseCertificateDocumentType(get("documentType")),
    status: parseCertificateStatus(get("status")),
    uploadedBySearch: normalizeSearch(get("uploadedBySearch")),
    originalFileName: normalizeSearch(get("originalFileName")),
    displayTitle: normalizeSearch(get("displayTitle")),
    notesSearch: normalizeSearch(get("notesSearch")),
    tag: normalizeSearch(get("tag")),
    issueDateFrom: normalizeSearch(get("issueDateFrom")),
    issueDateTo: normalizeSearch(get("issueDateTo")),
    dueDateFrom: normalizeSearch(get("dueDateFrom")),
    dueDateTo: normalizeSearch(get("dueDateTo")),
    uploadDateFrom: normalizeSearch(get("uploadDateFrom")),
    uploadDateTo: normalizeSearch(get("uploadDateTo")),
    page,
    pageSize,
  };
}
