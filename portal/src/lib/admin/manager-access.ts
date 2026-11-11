import type { SupabaseClient } from "@supabase/supabase-js";
import { one } from "@/lib/admin/embed";

/**
 * A unit of delegable access: one site, or a company's company-level documents (siteId null).
 * Mirrors how direct grants work: a company grant covers company-level documents and every
 * site; a site grant covers that site only.
 */
export type ScopeUnit = {
  key: string;
  companyId: string;
  companyName: string;
  customerIdReadable: string;
  siteId: string | null;
  siteName: string | null;
  certificateCount: number;
};

export function scopeKey(companyId: string, siteId: string | null): string {
  return `${companyId}:${siteId ?? "company"}`;
}

export function scopeLabel(unit: Pick<ScopeUnit, "companyName" | "customerIdReadable" | "siteName">): string {
  const company = `${unit.companyName} (${unit.customerIdReadable})`;
  return unit.siteName ? `${company} — ${unit.siteName}` : `${company} — company-level documents`;
}

type CompanyRow = { id: string; company_name: string; customer_id_readable: string; status: string };
type SiteRow = { id: string; company_id: string; site_name: string; status: string };

/**
 * Scope units currently covered by a customer user's direct grants (admin session only).
 * Inactive companies and sites are excluded, so nothing inactive can be approved.
 */
export async function loadEligibleScopes(
  supabase: SupabaseClient,
  customerUserId: string
): Promise<{ units: ScopeUnit[]; error: string | null }> {
  const { data: grants, error } = await supabase
    .from("user_site_access")
    .select("access_type, company_id, site_id")
    .eq("user_id", customerUserId);
  if (error) return { units: [], error: error.message };
  if (!grants?.length) return { units: [], error: null };

  const companyIds = [...new Set(grants.map((g) => g.company_id as string))];
  const [{ data: companies, error: coErr }, { data: sites, error: siErr }, { data: certs, error: ceErr }] =
    await Promise.all([
      supabase.from("companies").select("id, company_name, customer_id_readable, status").in("id", companyIds),
      supabase.from("sites").select("id, company_id, site_name, status").in("company_id", companyIds),
      supabase
        .from("certificate_documents")
        .select("company_id, site_id")
        .in("company_id", companyIds)
        .eq("status", "active")
        .not("published_at", "is", null),
    ]);
  const firstErr = coErr ?? siErr ?? ceErr;
  if (firstErr) return { units: [], error: firstErr.message };

  const companyById = new Map((companies as CompanyRow[]).map((c) => [c.id, c]));
  const siteById = new Map((sites as SiteRow[]).map((s) => [s.id, s]));
  const counts = new Map<string, number>();
  for (const c of certs ?? []) {
    const key = scopeKey(c.company_id as string, (c.site_id as string | null) ?? null);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const units = new Map<string, ScopeUnit>();
  const add = (company: CompanyRow, site: SiteRow | null) => {
    if (company.status !== "active" || (site && site.status !== "active")) return;
    const key = scopeKey(company.id, site?.id ?? null);
    units.set(key, {
      key,
      companyId: company.id,
      companyName: company.company_name,
      customerIdReadable: company.customer_id_readable,
      siteId: site?.id ?? null,
      siteName: site?.site_name ?? null,
      certificateCount: counts.get(key) ?? 0,
    });
  };

  for (const g of grants) {
    const company = companyById.get(g.company_id as string);
    if (!company) continue;
    if (g.access_type === "company") {
      add(company, null);
      for (const site of siteById.values()) {
        if (site.company_id === company.id) add(company, site);
      }
    } else if (g.site_id) {
      const site = siteById.get(g.site_id as string);
      if (site && site.company_id === company.id) add(company, site);
    }
  }

  return {
    units: [...units.values()].sort(
      (a, b) =>
        a.companyName.localeCompare(b.companyName) ||
        (a.siteName === null ? -1 : b.siteName === null ? 1 : a.siteName.localeCompare(b.siteName))
    ),
    error: null,
  };
}

export type ApprovedScope = {
  id: string;
  key: string;
  companyId: string;
  siteId: string | null;
  label: string;
  approvedAt: string;
  /** Still inside the assigned user's direct grants. Informational: access is kept either way. */
  coveredByUser: boolean;
  /** Company/site still active (inactive scopes grant nothing). */
  isLive: boolean;
};

export type ManagerAssignmentView = {
  id: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    username: string | null;
    isActive: boolean;
    role: string;
    companyLabel: string | null;
  };
  scopes: ApprovedScope[];
  pending: ScopeUnit[];
};

/** Active assignments for a manager, with approved scopes and pending expansions (admin session). */
export async function loadManagerAssignments(
  supabase: SupabaseClient,
  managerId: string
): Promise<{ assignments: ManagerAssignmentView[]; error: string | null }> {
  const { data, error } = await supabase
    .from("manager_user_assignments")
    .select(
      `id, created_at, customer_user_profile_id,
       profiles!manager_user_assignments_customer_user_profile_id_fkey(id, full_name, email, username, is_active, role, companies(company_name, customer_id_readable)),
       manager_assignment_scopes(id, company_id, site_id, is_active, approved_at, companies(company_name, customer_id_readable, status), sites(site_name, status))`
    )
    .eq("manager_profile_id", managerId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) return { assignments: [], error: error.message };

  const assignments: ManagerAssignmentView[] = [];
  for (const row of data ?? []) {
    const p = one(row.profiles) as {
      id: string;
      full_name: string;
      email: string;
      username: string | null;
      is_active: boolean;
      role: string;
      companies: { company_name: string; customer_id_readable: string } | { company_name: string; customer_id_readable: string }[] | null;
    } | null;
    if (!p) continue;
    const pCompany = one(p.companies);

    const { units: eligible } = await loadEligibleScopes(supabase, p.id);
    const eligibleKeys = new Set(eligible.map((u) => u.key));

    const scopes: ApprovedScope[] = (row.manager_assignment_scopes ?? [])
      .filter((s: { is_active: boolean }) => s.is_active)
      .map(
        (s: {
          id: string;
          company_id: string;
          site_id: string | null;
          approved_at: string;
          companies: unknown;
          sites: unknown;
        }) => {
          const co = one(s.companies as { company_name: string; customer_id_readable: string; status: string } | null);
          const si = one(s.sites as { site_name: string; status: string } | null);
          const key = scopeKey(s.company_id, s.site_id);
          return {
            id: s.id,
            key,
            companyId: s.company_id,
            siteId: s.site_id,
            label: scopeLabel({
              companyName: co?.company_name ?? "Unknown company",
              customerIdReadable: co?.customer_id_readable ?? "?",
              siteName: s.site_id ? si?.site_name ?? "Unknown site" : null,
            }),
            approvedAt: s.approved_at,
            coveredByUser: p.is_active && eligibleKeys.has(key),
            isLive: co?.status === "active" && (!s.site_id || si?.status === "active"),
          };
        }
      )
      .sort((a: ApprovedScope, b: ApprovedScope) => a.label.localeCompare(b.label));

    const approvedKeys = new Set(scopes.map((s) => s.key));
    assignments.push({
      id: row.id,
      createdAt: row.created_at,
      user: {
        id: p.id,
        name: p.full_name,
        email: p.email,
        username: p.username,
        isActive: p.is_active,
        role: p.role,
        companyLabel: pCompany ? `${pCompany.company_name} (${pCompany.customer_id_readable})` : null,
      },
      scopes,
      pending: p.is_active && p.role === "customer_user" ? eligible.filter((u) => !approvedKeys.has(u.key)) : [],
    });
  }

  return { assignments, error: null };
}

export type ManagedByRow = { assignmentId: string; managerId: string; managerLabel: string };

/** Managers a customer user is currently assigned to (admin session). */
export async function loadManagedBy(
  supabase: SupabaseClient,
  customerUserId: string
): Promise<ManagedByRow[]> {
  const { data } = await supabase
    .from("manager_user_assignments")
    .select("id, manager_profile_id, profiles!manager_user_assignments_manager_profile_id_fkey(full_name, email, username)")
    .eq("customer_user_profile_id", customerUserId)
    .eq("is_active", true);
  return (data ?? []).map((row) => {
    const m = one(row.profiles) as { full_name: string; email: string; username: string | null } | null;
    return {
      assignmentId: row.id,
      managerId: row.manager_profile_id,
      managerLabel: m ? `${m.username ?? m.email}${m.full_name ? ` (${m.full_name})` : ""}` : row.manager_profile_id,
    };
  });
}
