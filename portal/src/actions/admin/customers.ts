"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAdminAudit } from "@/lib/audit/log";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import {
  parseCompanyStatus,
  validateCompanyForm,
  type CompanyStatus,
} from "@/lib/admin/validation";

export type CustomerActionState = { error?: string; ok?: boolean };

function text(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

function optionalText(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
}

export async function createCustomerAction(
  _prev: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  const { supabase, profile } = await requireAdminSupabase();

  const company_name = text(formData, "company_name");
  const status = parseCompanyStatus(text(formData, "status"));
  const err = validateCompanyForm({ company_name, status });
  if (err) return { error: err };

  const row = {
    company_name,
    status,
    primary_contact_name: optionalText(formData, "primary_contact_name"),
    primary_contact_email: optionalText(formData, "primary_contact_email"),
    phone: optionalText(formData, "phone"),
    address_line_1: optionalText(formData, "address_line_1"),
    address_line_2: optionalText(formData, "address_line_2"),
    town_city: optionalText(formData, "town_city"),
    postcode: optionalText(formData, "postcode"),
    notes: optionalText(formData, "notes"),
  };

  const { data, error } = await supabase
    .from("companies")
    .insert(row)
    .select("id")
    .single();

  if (error) return { error: error.message };

  const { error: auditErr } = await logAdminAudit(supabase, {
    actorProfileId: profile.id,
    actorRole: profile.role,
    action: "customer_created",
    entityType: "company",
    entityId: data.id,
    companyId: data.id,
    metadata: { company_name },
  });
  if (auditErr) {
    console.warn("Audit log (customer create) failed:", auditErr.message);
  }

  revalidatePath("/admin/customers");
  revalidatePath("/admin/dashboard");
  redirect(`/admin/customers/${data.id}`);
}

export async function updateCustomerAction(
  companyId: string,
  _prev: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  const { supabase, profile } = await requireAdminSupabase();

  const company_name = text(formData, "company_name");
  const status = parseCompanyStatus(text(formData, "status")) as CompanyStatus;
  const err = validateCompanyForm({ company_name, status });
  if (err) return { error: err };

  const { data: before, error: beforeErr } = await supabase
    .from("companies")
    .select("status")
    .eq("id", companyId)
    .maybeSingle();
  if (beforeErr || !before) {
    return { error: "Customer not found." };
  }

  const row = {
    company_name,
    status,
    primary_contact_name: optionalText(formData, "primary_contact_name"),
    primary_contact_email: optionalText(formData, "primary_contact_email"),
    phone: optionalText(formData, "phone"),
    address_line_1: optionalText(formData, "address_line_1"),
    address_line_2: optionalText(formData, "address_line_2"),
    town_city: optionalText(formData, "town_city"),
    postcode: optionalText(formData, "postcode"),
    notes: optionalText(formData, "notes"),
  };

  const { error } = await supabase.from("companies").update(row).eq("id", companyId);

  if (error) return { error: error.message };

  const becameInactive = before?.status === "active" && status === "inactive";

  const { error: auditErr } = await logAdminAudit(supabase, {
    actorProfileId: profile.id,
    actorRole: profile.role,
    action: becameInactive ? "customer_deactivated" : "customer_updated",
    entityType: "company",
    entityId: companyId,
    companyId,
    metadata: { company_name, status },
  });
  if (auditErr) {
    console.warn("Audit log (customer update) failed:", auditErr.message);
  }

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${companyId}`);
  revalidatePath(`/admin/customers/${companyId}/edit`);
  revalidatePath("/admin/dashboard");
  return { ok: true };
}
