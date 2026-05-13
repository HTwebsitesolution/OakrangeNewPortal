"use server";

import { revalidatePath } from "next/cache";
import { logAdminAudit } from "@/lib/audit/log";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import type { UserRole } from "@/types/profile";

export type AccessActionState = { error?: string; ok?: boolean };

async function loadTargetProfile(
  supabase: Awaited<ReturnType<typeof requireAdminSupabase>>["supabase"],
  profileId: string
): Promise<{ id: string; role: UserRole } | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", profileId)
    .maybeSingle();
  return data as { id: string; role: UserRole } | null;
}

export async function grantCompanyAccessAction(
  targetProfileId: string,
  companyId: string
): Promise<AccessActionState> {
  const { supabase, profile: actor } = await requireAdminSupabase();

  const target = await loadTargetProfile(supabase, targetProfileId);
  if (!target) return { error: "User not found." };
  if (target.role === "oakrange_admin") {
    return { error: "Oakrange admins do not use company access rows." };
  }

  const { data, error } = await supabase
    .from("user_site_access")
    .insert({
      user_id: targetProfileId,
      company_id: companyId,
      site_id: null,
      access_type: "company",
      created_by: actor.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Company-wide access is already granted for this user." };
    }
    return { error: error.message };
  }

  const { error: auditErr } = await logAdminAudit(supabase, {
    actorProfileId: actor.id,
    actorRole: actor.role,
    action: "access_grant_created",
    entityType: "user_site_access",
    entityId: data.id,
    companyId,
    metadata: { access_type: "company", target_profile_id: targetProfileId },
  });
  if (auditErr) {
    console.warn("Audit log (company access grant) failed:", auditErr.message);
  }

  revalidatePath(`/admin/users/${targetProfileId}`);
  revalidatePath(`/admin/users/${targetProfileId}/edit`);
  revalidatePath(`/admin/customers/${companyId}/users`);
  return { ok: true };
}

export async function grantSiteAccessAction(
  targetProfileId: string,
  companyId: string,
  siteId: string
): Promise<AccessActionState> {
  const { supabase, profile: actor } = await requireAdminSupabase();

  const target = await loadTargetProfile(supabase, targetProfileId);
  if (!target) return { error: "User not found." };
  if (target.role === "oakrange_admin") {
    return { error: "Oakrange admins do not use site access rows." };
  }

  const { data: site, error: siteErr } = await supabase
    .from("sites")
    .select("id")
    .eq("id", siteId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (siteErr || !site) return { error: "Site does not belong to that company." };

  const { data, error } = await supabase
    .from("user_site_access")
    .insert({
      user_id: targetProfileId,
      company_id: companyId,
      site_id: siteId,
      access_type: "site",
      created_by: actor.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Access to this site is already granted." };
    }
    return { error: error.message };
  }

  const { error: auditErr } = await logAdminAudit(supabase, {
    actorProfileId: actor.id,
    actorRole: actor.role,
    action: "access_grant_created",
    entityType: "user_site_access",
    entityId: data.id,
    companyId,
    siteId,
    metadata: { access_type: "site", target_profile_id: targetProfileId },
  });
  if (auditErr) {
    console.warn("Audit log (site access grant) failed:", auditErr.message);
  }

  revalidatePath(`/admin/users/${targetProfileId}`);
  revalidatePath(`/admin/users/${targetProfileId}/edit`);
  revalidatePath(`/admin/customers/${companyId}/users`);
  revalidatePath(`/admin/customers/${companyId}/sites/${siteId}`);
  return { ok: true };
}

export async function revokeAccessAction(
  accessRowId: string,
  targetProfileId: string
): Promise<AccessActionState> {
  const { supabase, profile: actor } = await requireAdminSupabase();

  const { data: row } = await supabase
    .from("user_site_access")
    .select("id, company_id, site_id, access_type")
    .eq("id", accessRowId)
    .eq("user_id", targetProfileId)
    .maybeSingle();

  if (!row) return { error: "Access row not found." };

  const { error } = await supabase.from("user_site_access").delete().eq("id", accessRowId);

  if (error) return { error: error.message };

  const { error: auditErr } = await logAdminAudit(supabase, {
    actorProfileId: actor.id,
    actorRole: actor.role,
    action: "access_grant_removed",
    entityType: "user_site_access",
    entityId: accessRowId,
    companyId: row.company_id,
    siteId: row.site_id,
    metadata: { access_type: row.access_type, target_profile_id: targetProfileId },
  });
  if (auditErr) {
    console.warn("Audit log (access revoke) failed:", auditErr.message);
  }

  revalidatePath(`/admin/users/${targetProfileId}`);
  revalidatePath(`/admin/users/${targetProfileId}/edit`);
  if (row.company_id) {
    revalidatePath(`/admin/customers/${row.company_id}/users`);
  }
  if (row.site_id) {
    revalidatePath(`/admin/customers/${row.company_id}/sites/${row.site_id}`);
  }
  return { ok: true };
}

function fdText(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export async function grantCompanyFromForm(
  _prev: AccessActionState,
  formData: FormData
): Promise<AccessActionState> {
  const targetProfileId = fdText(formData, "target_profile_id");
  const companyId = fdText(formData, "company_id");
  if (!targetProfileId || !companyId) return { error: "Missing target or company." };
  return grantCompanyAccessAction(targetProfileId, companyId);
}

export async function grantSiteFromForm(
  _prev: AccessActionState,
  formData: FormData
): Promise<AccessActionState> {
  const targetProfileId = fdText(formData, "target_profile_id");
  const companyId = fdText(formData, "company_id");
  const siteId = fdText(formData, "site_id");
  if (!targetProfileId || !companyId || !siteId) {
    return { error: "Missing target, company, or site." };
  }
  return grantSiteAccessAction(targetProfileId, companyId, siteId);
}

export async function revokeAccessFromForm(
  _prev: AccessActionState,
  formData: FormData
): Promise<AccessActionState> {
  const accessRowId = fdText(formData, "access_row_id");
  const targetProfileId = fdText(formData, "target_profile_id");
  if (!accessRowId || !targetProfileId) return { error: "Missing row or user." };
  return revokeAccessAction(accessRowId, targetProfileId);
}
