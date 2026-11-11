"use server";

import { revalidatePath } from "next/cache";
import { searchCompanies } from "@/lib/admin/company-search";
import { one } from "@/lib/admin/embed";
import { escapeIlikePattern } from "@/lib/admin/ilike";
import { loadEligibleScopes, scopeLabel, type ScopeUnit } from "@/lib/admin/manager-access";
import { logAdminAudit } from "@/lib/audit/log";
import { requireAdminSupabase } from "@/lib/auth/require-session";

export type ManagerAccessActionState = { error?: string; ok?: boolean };

export type AssignableUser = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  companyLabel: string | null;
  access: string[];
  alreadyAssigned: boolean;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FRIENDLY_ERRORS: Array<[RegExp, string]> = [
  [/manager_must_be_active_site_manager/, "The manager must be an active site manager."],
  [/assigned_user_must_be_active_customer_user/, "Only active customer users can be assigned to a manager."],
  [/manager_user_assignments_not_self/, "A manager cannot be assigned to themselves."],
  [/manager_user_assignments_active_pair|duplicate key/, "This user is already assigned to this manager."],
  [/manager_scope_outside_assigned_user_access/, "That access is no longer held by the user. Refresh and try again."],
  [/manager_scope_site_company_mismatch/, "That site does not belong to the selected company."],
  [/manager_assignment_requires_scope/, "Select at least one site or company-level document set."],
  [/manager_assignment_not_active/, "This assignment has been removed."],
  [/insufficient_privilege|row-level security/, "You do not have permission to change manager access."],
];

function friendly(message: string): string {
  return FRIENDLY_ERRORS.find(([re]) => re.test(message))?.[1] ?? message;
}

function revalidateUsers(...profileIds: string[]) {
  for (const id of profileIds) {
    revalidatePath(`/admin/users/${id}`);
    revalidatePath(`/admin/users/${id}/edit`);
  }
}

type AdminCtx = Awaited<ReturnType<typeof requireAdminSupabase>>;

async function loadActiveManager(supabase: AdminCtx["supabase"], managerId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", managerId)
    .maybeSingle();
  return data && data.role === "site_manager" && data.is_active ? data : null;
}

/** Search active customer users across all companies by name, email, username, company or OAK number. */
export async function searchAssignableUsersAction(
  managerId: string,
  query: string
): Promise<{ users: AssignableUser[]; error?: string }> {
  const { supabase } = await requireAdminSupabase();
  const q = query.trim();
  if (!UUID_RE.test(managerId)) return { users: [], error: "Invalid manager." };
  if (q.length < 2) return { users: [] };

  const pattern = `%${escapeIlikePattern(q)}%`;
  const profileCols = "id, full_name, email, username, company_id, companies(company_name, customer_id_readable)";
  const base = () =>
    supabase.from("profiles").select(profileCols).eq("role", "customer_user").eq("is_active", true).limit(25);

  const [byName, byEmail, byUsername, companies] = await Promise.all([
    base().ilike("full_name", pattern),
    base().ilike("email", pattern),
    base().ilike("username", pattern),
    searchCompanies(supabase, q),
  ]);
  const firstErr = byName.error?.message ?? byEmail.error?.message ?? byUsername.error?.message ?? companies.error;
  if (firstErr) return { users: [], error: firstErr };

  let byCompany: typeof byName.data = [];
  const companyIds = companies.companies.map((c) => c.id);
  if (companyIds.length) {
    const { data, error } = await base().in("company_id", companyIds);
    if (error) return { users: [], error: error.message };
    byCompany = data;
  }

  const merged = new Map<string, NonNullable<typeof byName.data>[number]>();
  for (const row of [...(byName.data ?? []), ...(byEmail.data ?? []), ...(byUsername.data ?? []), ...(byCompany ?? [])]) {
    merged.set(row.id, row);
  }
  const rows = [...merged.values()].slice(0, 25);
  if (!rows.length) return { users: [] };

  const ids = rows.map((r) => r.id);
  const [{ data: grants }, { data: existing }] = await Promise.all([
    supabase
      .from("user_site_access")
      .select("user_id, access_type, companies(company_name, customer_id_readable), sites(site_name)")
      .in("user_id", ids),
    supabase
      .from("manager_user_assignments")
      .select("customer_user_profile_id")
      .eq("manager_profile_id", managerId)
      .eq("is_active", true)
      .in("customer_user_profile_id", ids),
  ]);
  const assigned = new Set((existing ?? []).map((e) => e.customer_user_profile_id));

  const users: AssignableUser[] = rows.map((r) => {
    const co = one(r.companies) as { company_name: string; customer_id_readable: string } | null;
    const access = (grants ?? [])
      .filter((g) => g.user_id === r.id)
      .map((g) => {
        const gc = one(g.companies) as { company_name: string; customer_id_readable: string } | null;
        const gs = one(g.sites) as { site_name: string } | null;
        const company = gc ? `${gc.company_name} (${gc.customer_id_readable})` : "Unknown company";
        return g.access_type === "company" ? `${company} — whole company` : `${company} — ${gs?.site_name ?? "site"}`;
      });
    return {
      id: r.id,
      name: r.full_name,
      email: r.email,
      username: r.username,
      companyLabel: co ? `${co.company_name} (${co.customer_id_readable})` : null,
      access,
      alreadyAssigned: assigned.has(r.id),
    };
  });

  return { users: users.sort((a, b) => (a.companyLabel ?? "").localeCompare(b.companyLabel ?? "") || a.name.localeCompare(b.name)) };
}

/** What assigning this user would let the manager see, computed from the user's current grants. */
export async function previewAssignmentAction(
  customerUserId: string
): Promise<{ units: ScopeUnit[]; error?: string }> {
  const { supabase } = await requireAdminSupabase();
  if (!UUID_RE.test(customerUserId)) return { units: [], error: "Invalid user." };
  const { units, error } = await loadEligibleScopes(supabase, customerUserId);
  return error ? { units: [], error } : { units };
}

function pickEligible(eligible: ScopeUnit[], requestedKeys: string[]): { selected: ScopeUnit[]; error?: string } {
  const requested = new Set(requestedKeys);
  const selected = eligible.filter((u) => requested.has(u.key));
  if (selected.length === 0) return { selected, error: "Select at least one site or company-level document set." };
  if (selected.length !== requested.size) {
    return { selected: [], error: "Some selected access is no longer held by this user. Refresh and try again." };
  }
  return { selected };
}

export async function createManagerAssignmentAction(
  managerId: string,
  customerUserId: string,
  scopeKeys: string[]
): Promise<ManagerAccessActionState> {
  const { supabase, profile: actor } = await requireAdminSupabase();
  if (!UUID_RE.test(managerId) || !UUID_RE.test(customerUserId)) return { error: "Invalid request." };
  if (!(await loadActiveManager(supabase, managerId))) return { error: "The manager must be an active site manager." };

  const { units, error: eligErr } = await loadEligibleScopes(supabase, customerUserId);
  if (eligErr) return { error: eligErr };
  const { selected, error: pickErr } = pickEligible(units, scopeKeys);
  if (pickErr) return { error: pickErr };

  const { data: assignmentId, error } = await supabase.rpc("create_manager_assignment", {
    p_manager_profile_id: managerId,
    p_customer_user_profile_id: customerUserId,
    p_scopes: selected.map((u) => ({ company_id: u.companyId, site_id: u.siteId })),
  });
  if (error) return { error: friendly(error.message) };

  const { error: auditErr } = await logAdminAudit(supabase, {
    actorProfileId: actor.id,
    actorRole: actor.role,
    action: "manager_assignment_created",
    entityType: "manager_user_assignments",
    entityId: assignmentId as string,
    metadata: {
      manager_profile_id: managerId,
      customer_user_profile_id: customerUserId,
      approved_scopes: selected.map((u) => ({ company_id: u.companyId, site_id: u.siteId, label: scopeLabel(u) })),
    },
  });
  if (auditErr) console.warn("Audit log (manager assignment created) failed:", auditErr.message);

  revalidateUsers(managerId, customerUserId);
  return { ok: true };
}

async function loadActiveAssignment(supabase: AdminCtx["supabase"], assignmentId: string) {
  const { data } = await supabase
    .from("manager_user_assignments")
    .select("id, manager_profile_id, customer_user_profile_id, is_active")
    .eq("id", assignmentId)
    .maybeSingle();
  return data?.is_active ? data : null;
}

/** Approve additional scopes (permission expansion) for an existing assignment. */
export async function approveManagerScopesAction(
  assignmentId: string,
  scopeKeys: string[]
): Promise<ManagerAccessActionState> {
  const { supabase, profile: actor } = await requireAdminSupabase();
  if (!UUID_RE.test(assignmentId)) return { error: "Invalid request." };
  const assignment = await loadActiveAssignment(supabase, assignmentId);
  if (!assignment) return { error: "This assignment has been removed." };
  if (!(await loadActiveManager(supabase, assignment.manager_profile_id))) {
    return { error: "The manager must be an active site manager." };
  }

  const { units, error: eligErr } = await loadEligibleScopes(supabase, assignment.customer_user_profile_id);
  if (eligErr) return { error: eligErr };
  const { selected, error: pickErr } = pickEligible(units, scopeKeys);
  if (pickErr) return { error: pickErr };

  const { data: inserted, error } = await supabase
    .from("manager_assignment_scopes")
    .insert(selected.map((u) => ({ assignment_id: assignmentId, company_id: u.companyId, site_id: u.siteId, approved_by: actor.id })))
    .select("id, company_id, site_id");
  if (error) return { error: friendly(error.message) };

  for (const row of inserted ?? []) {
    const unit = selected.find((u) => u.companyId === row.company_id && u.siteId === row.site_id);
    const { error: auditErr } = await logAdminAudit(supabase, {
      actorProfileId: actor.id,
      actorRole: actor.role,
      action: "manager_scope_approved",
      entityType: "manager_assignment_scopes",
      entityId: row.id,
      companyId: row.company_id,
      siteId: row.site_id,
      metadata: {
        assignment_id: assignmentId,
        manager_profile_id: assignment.manager_profile_id,
        customer_user_profile_id: assignment.customer_user_profile_id,
        label: unit ? scopeLabel(unit) : null,
      },
    });
    if (auditErr) console.warn("Audit log (manager scope approved) failed:", auditErr.message);
  }

  revalidateUsers(assignment.manager_profile_id, assignment.customer_user_profile_id);
  return { ok: true };
}

export async function revokeManagerScopeAction(scopeId: string): Promise<ManagerAccessActionState> {
  const { supabase, profile: actor } = await requireAdminSupabase();
  if (!UUID_RE.test(scopeId)) return { error: "Invalid request." };

  const { data: scope } = await supabase
    .from("manager_assignment_scopes")
    .select("id, assignment_id, company_id, site_id, is_active, manager_user_assignments(manager_profile_id, customer_user_profile_id)")
    .eq("id", scopeId)
    .maybeSingle();
  if (!scope?.is_active) return { error: "That access has already been removed." };
  const assignment = one(scope.manager_user_assignments) as {
    manager_profile_id: string;
    customer_user_profile_id: string;
  } | null;

  const { error } = await supabase
    .from("manager_assignment_scopes")
    .update({ is_active: false, revoked_at: new Date().toISOString(), revoked_by: actor.id })
    .eq("id", scopeId)
    .eq("is_active", true);
  if (error) return { error: friendly(error.message) };

  const { error: auditErr } = await logAdminAudit(supabase, {
    actorProfileId: actor.id,
    actorRole: actor.role,
    action: "manager_scope_revoked",
    entityType: "manager_assignment_scopes",
    entityId: scopeId,
    companyId: scope.company_id,
    siteId: scope.site_id,
    metadata: {
      assignment_id: scope.assignment_id,
      manager_profile_id: assignment?.manager_profile_id ?? null,
      customer_user_profile_id: assignment?.customer_user_profile_id ?? null,
    },
  });
  if (auditErr) console.warn("Audit log (manager scope revoked) failed:", auditErr.message);

  if (assignment) revalidateUsers(assignment.manager_profile_id, assignment.customer_user_profile_id);
  return { ok: true };
}

export async function removeManagerAssignmentAction(assignmentId: string): Promise<ManagerAccessActionState> {
  const { supabase, profile: actor } = await requireAdminSupabase();
  if (!UUID_RE.test(assignmentId)) return { error: "Invalid request." };
  const assignment = await loadActiveAssignment(supabase, assignmentId);
  if (!assignment) return { error: "This assignment has already been removed." };

  const now = new Date().toISOString();
  const { data: revokedScopes, error: scopeErr } = await supabase
    .from("manager_assignment_scopes")
    .update({ is_active: false, revoked_at: now, revoked_by: actor.id })
    .eq("assignment_id", assignmentId)
    .eq("is_active", true)
    .select("id, company_id, site_id");
  if (scopeErr) return { error: friendly(scopeErr.message) };

  const { error } = await supabase
    .from("manager_user_assignments")
    .update({ is_active: false, revoked_at: now, revoked_by: actor.id })
    .eq("id", assignmentId)
    .eq("is_active", true);
  if (error) return { error: friendly(error.message) };

  const { error: auditErr } = await logAdminAudit(supabase, {
    actorProfileId: actor.id,
    actorRole: actor.role,
    action: "manager_assignment_removed",
    entityType: "manager_user_assignments",
    entityId: assignmentId,
    metadata: {
      manager_profile_id: assignment.manager_profile_id,
      customer_user_profile_id: assignment.customer_user_profile_id,
      revoked_scopes: (revokedScopes ?? []).map((s) => ({ scope_id: s.id, company_id: s.company_id, site_id: s.site_id })),
    },
  });
  if (auditErr) console.warn("Audit log (manager assignment removed) failed:", auditErr.message);

  revalidateUsers(assignment.manager_profile_id, assignment.customer_user_profile_id);
  return { ok: true };
}
