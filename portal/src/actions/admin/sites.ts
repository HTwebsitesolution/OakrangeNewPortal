"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAdminAudit } from "@/lib/audit/log";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import { parseSiteStatus, validateSiteForm, type SiteStatus } from "@/lib/admin/validation";

export type SiteActionState = { error?: string; ok?: boolean };

function text(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

function optionalText(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
}

export async function createSiteAction(
  companyId: string,
  _prev: SiteActionState,
  formData: FormData
): Promise<SiteActionState> {
  const { supabase, profile } = await requireAdminSupabase();

  const site_name = text(formData, "site_name");
  const status = parseSiteStatus(text(formData, "status")) as SiteStatus;
  const err = validateSiteForm({ site_name, status });
  if (err) return { error: err };

  const row = {
    company_id: companyId,
    site_name,
    status,
    site_contact_name: optionalText(formData, "site_contact_name"),
    site_contact_email: optionalText(formData, "site_contact_email"),
    phone: optionalText(formData, "phone"),
    address_line_1: optionalText(formData, "address_line_1"),
    address_line_2: optionalText(formData, "address_line_2"),
    town_city: optionalText(formData, "town_city"),
    postcode: optionalText(formData, "postcode"),
    notes: optionalText(formData, "notes"),
  };

  const { data, error } = await supabase.from("sites").insert(row).select("id").single();

  if (error) return { error: error.message };

  const { error: auditErr } = await logAdminAudit(supabase, {
    actorProfileId: profile.id,
    actorRole: profile.role,
    action: "site_created",
    entityType: "site",
    entityId: data.id,
    companyId,
    siteId: data.id,
    metadata: { site_name },
  });
  if (auditErr) {
    console.warn("Audit log (site create) failed:", auditErr.message);
  }

  revalidatePath(`/admin/customers/${companyId}/sites`);
  revalidatePath(`/admin/customers/${companyId}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/sites");
  redirect(`/admin/customers/${companyId}/sites/${data.id}`);
}

export async function updateSiteAction(
  companyId: string,
  siteId: string,
  _prev: SiteActionState,
  formData: FormData
): Promise<SiteActionState> {
  const { supabase, profile } = await requireAdminSupabase();

  const site_name = text(formData, "site_name");
  const status = parseSiteStatus(text(formData, "status")) as SiteStatus;
  const err = validateSiteForm({ site_name, status });
  if (err) return { error: err };

  const { data: before, error: beforeErr } = await supabase
    .from("sites")
    .select("status")
    .eq("id", siteId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (beforeErr || !before) return { error: "Site not found for this customer." };

  const row = {
    site_name,
    status,
    site_contact_name: optionalText(formData, "site_contact_name"),
    site_contact_email: optionalText(formData, "site_contact_email"),
    phone: optionalText(formData, "phone"),
    address_line_1: optionalText(formData, "address_line_1"),
    address_line_2: optionalText(formData, "address_line_2"),
    town_city: optionalText(formData, "town_city"),
    postcode: optionalText(formData, "postcode"),
    notes: optionalText(formData, "notes"),
  };

  const { error } = await supabase
    .from("sites")
    .update(row)
    .eq("id", siteId)
    .eq("company_id", companyId);

  if (error) return { error: error.message };

  const becameInactive = before?.status === "active" && status === "inactive";
  const becameActive = before?.status === "inactive" && status === "active";
  const auditAction = becameInactive
    ? "site_deactivated"
    : becameActive
      ? "site_reactivated"
      : "site_updated";

  const { error: auditErr } = await logAdminAudit(supabase, {
    actorProfileId: profile.id,
    actorRole: profile.role,
    action: auditAction,
    entityType: "site",
    entityId: siteId,
    companyId,
    siteId,
    metadata: { site_name, status },
  });
  if (auditErr) {
    console.warn("Audit log (site update) failed:", auditErr.message);
  }

  revalidatePath(`/admin/customers/${companyId}/sites`);
  revalidatePath(`/admin/customers/${companyId}/sites/${siteId}`);
  revalidatePath(`/admin/customers/${companyId}/sites/${siteId}/edit`);
  revalidatePath(`/admin/customers/${companyId}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/sites");
  return { ok: true };
}
