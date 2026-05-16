"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAdminAudit } from "@/lib/audit/log";
import { CERTIFICATES_BUCKET } from "@/lib/certificates/storage";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
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
  const becameActive = before?.status === "inactive" && status === "active";
  const auditAction = becameInactive
    ? "customer_deactivated"
    : becameActive
      ? "customer_reactivated"
      : "customer_updated";

  const { error: auditErr } = await logAdminAudit(supabase, {
    actorProfileId: profile.id,
    actorRole: profile.role,
    action: auditAction,
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

async function removeCertificateStorage(paths: string[]): Promise<void> {
  if (paths.length === 0) return;

  let service: ReturnType<typeof createServiceRoleClient>;
  try {
    service = createServiceRoleClient();
  } catch (err) {
    console.warn("Storage cleanup skipped (service role unavailable):", err);
    return;
  }

  const chunkSize = 50;
  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize);
    const { error } = await service.storage.from(CERTIFICATES_BUCKET).remove(chunk);
    if (error) {
      console.warn("Certificate storage cleanup failed:", error.message);
    }
  }
}

export async function deleteCustomerAction(
  companyId: string,
  _prev: CustomerActionState,
  formData: FormData
): Promise<CustomerActionState> {
  const { supabase, profile } = await requireAdminSupabase();

  const confirmName = text(formData, "confirm_name");
  const { data: company, error: companyErr } = await supabase
    .from("companies")
    .select("id, company_name, customer_id_readable")
    .eq("id", companyId)
    .maybeSingle();

  if (companyErr || !company) {
    return { error: "Customer not found." };
  }

  if (confirmName.toLowerCase() !== company.company_name.trim().toLowerCase()) {
    return {
      error: `Type the company name exactly as shown (${company.company_name}) to confirm deletion.`,
    };
  }

  const [
    { count: siteCount },
    { count: certificateCount },
    { count: userCount },
    { data: certificates, error: certErr },
  ] = await Promise.all([
    supabase.from("sites").select("*", { count: "exact", head: true }).eq("company_id", companyId),
    supabase
      .from("certificate_documents")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("company_id", companyId),
    supabase.from("certificate_documents").select("storage_path").eq("company_id", companyId),
  ]);

  if (certErr) {
    return { error: certErr.message };
  }

  const storagePaths = (certificates ?? [])
    .map((row) => row.storage_path)
    .filter((path): path is string => Boolean(path));

  await removeCertificateStorage(storagePaths);

  const { error: deactivateErr } = await supabase
    .from("profiles")
    .update({ is_active: false })
    .eq("company_id", companyId);
  if (deactivateErr) {
    return { error: deactivateErr.message };
  }

  const { error: auditErr } = await logAdminAudit(supabase, {
    actorProfileId: profile.id,
    actorRole: profile.role,
    action: "customer_deleted",
    entityType: "company",
    entityId: companyId,
    companyId,
    metadata: {
      company_name: company.company_name,
      customer_id_readable: company.customer_id_readable,
      sites_removed: siteCount ?? 0,
      certificates_removed: certificateCount ?? 0,
      users_deactivated: userCount ?? 0,
    },
  });
  if (auditErr) {
    console.warn("Audit log (customer delete) failed:", auditErr.message);
  }

  const { error: deleteErr } = await supabase.from("companies").delete().eq("id", companyId);
  if (deleteErr) {
    return { error: deleteErr.message };
  }

  revalidatePath("/admin/customers");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/sites");
  revalidatePath("/admin/users");
  revalidatePath("/admin/certificates");
  redirect("/admin/customers");
}
