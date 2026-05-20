"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logAdminAudit } from "@/lib/audit/log";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  parseUserRole,
  parseUsername,
  validateCompanyAndPortalUserCreateForm,
} from "@/lib/admin/validation";
import type { UserActionState } from "./users";

const PROFILE_ROW_ATTEMPTS = 12;
const PROFILE_ROW_DELAY_MS = 250;

function text(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

function optionalText(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
}

async function waitForProfileRow(
  supabase: SupabaseClient,
  authUserId: string
): Promise<{ id: string } | null> {
  for (let i = 0; i < PROFILE_ROW_ATTEMPTS; i++) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (data?.id) return data;
    await new Promise((r) => setTimeout(r, PROFILE_ROW_DELAY_MS));
  }
  return null;
}

async function rollbackAuthUser(
  service: ReturnType<typeof createServiceRoleClient>,
  authUserId: string
) {
  await service.auth.admin.deleteUser(authUserId);
}

async function rollbackCompany(supabase: SupabaseClient, companyId: string) {
  await supabase.from("companies").delete().eq("id", companyId);
}

/** Create a new company and its first portal login in one step (WordPress-style onboarding). */
export async function createCompanyAndPortalUserAction(
  _prev: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  const { supabase, profile: actor } = await requireAdminSupabase();

  let service: ReturnType<typeof createServiceRoleClient>;
  try {
    service = createServiceRoleClient();
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Service role key is not configured. Add SUPABASE_SERVICE_ROLE_KEY to create sign-in accounts.",
    };
  }

  const company_name = text(formData, "company_name");
  const primary_contact_name = text(formData, "primary_contact_name");
  const email = text(formData, "email").toLowerCase();
  const usernameRaw = text(formData, "username");
  const username = parseUsername(usernameRaw);
  const role = parseUserRole(text(formData, "role"));
  const tempPassword = text(formData, "temp_password");
  const phone = optionalText(formData, "phone");
  const postcode = optionalText(formData, "postcode");

  if (!role) return { error: "Role is required." };
  const verr = validateCompanyAndPortalUserCreateForm({
    company_name,
    primary_contact_name,
    email,
    username: usernameRaw,
    role,
    temp_password: tempPassword,
  });
  if (verr) return { error: verr };
  if (!username) return { error: "Enter a valid username (4–32 letters or numbers)." };

  const { data: existingUsername } = await service
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();
  if (existingUsername) {
    return { error: `Username ${username} is already in use.` };
  }

  const { data: company, error: companyErr } = await supabase
    .from("companies")
    .insert({
      company_name,
      status: "active",
      primary_contact_name,
      primary_contact_email: email,
      phone,
      postcode,
    })
    .select("id, customer_id_readable")
    .single();

  if (companyErr || !company) {
    return { error: companyErr?.message ?? "Could not create the company." };
  }

  const companyId = company.id;

  const { error: companyAuditErr } = await logAdminAudit(supabase, {
    actorProfileId: actor.id,
    actorRole: actor.role,
    action: "customer_created",
    entityType: "company",
    entityId: companyId,
    companyId,
    metadata: { company_name, combined_onboarding: true },
  });
  if (companyAuditErr) {
    console.warn("Audit log (company create) failed:", companyAuditErr.message);
  }

  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: company_name },
  });

  if (createErr) {
    await rollbackCompany(supabase, companyId);
    return { error: createErr.message };
  }

  const authUser = created.user;
  if (!authUser) {
    await rollbackCompany(supabase, companyId);
    return { error: "Auth user was not returned." };
  }

  const profileRow = await waitForProfileRow(supabase, authUser.id);
  if (!profileRow) {
    await rollbackAuthUser(service, authUser.id);
    await rollbackCompany(supabase, companyId);
    return {
      error:
        "No profile row appeared after creating the Auth user. Check the handle_new_user trigger on auth.users.",
    };
  }

  const { error: upErr } = await supabase
    .from("profiles")
    .update({
      email,
      username,
      full_name: company_name,
      role,
      admin_level: null,
      company_id: companyId,
      is_active: true,
    })
    .eq("id", profileRow.id);

  if (upErr) {
    await rollbackAuthUser(service, authUser.id);
    await rollbackCompany(supabase, companyId);
    const msg = upErr.message.includes("profiles_username_unique")
      ? `Username ${username} is already in use.`
      : upErr.message;
    return { error: msg };
  }

  const { data: accessRow, error: accessErr } = await supabase
    .from("user_site_access")
    .insert({
      user_id: profileRow.id,
      company_id: companyId,
      site_id: null,
      access_type: "company",
      created_by: actor.id,
    })
    .select("id")
    .single();

  if (accessErr || !accessRow) {
    await rollbackAuthUser(service, authUser.id);
    await rollbackCompany(supabase, companyId);
    return {
      error: accessErr?.message ?? "Company was created but certificate access could not be granted.",
    };
  }

  await logAdminAudit(supabase, {
    actorProfileId: actor.id,
    actorRole: actor.role,
    action: "access_grant_created",
    entityType: "user_site_access",
    entityId: accessRow.id,
    companyId,
    metadata: { access_type: "company", target_profile_id: profileRow.id, combined_onboarding: true },
  });

  await logAdminAudit(supabase, {
    actorProfileId: actor.id,
    actorRole: actor.role,
    action: "user_created",
    entityType: "profile",
    entityId: profileRow.id,
    companyId,
    metadata: {
      email,
      username,
      role,
      full_name: company_name,
      combined_onboarding: true,
    },
  });

  await logAdminAudit(supabase, {
    actorProfileId: actor.id,
    actorRole: actor.role,
    action: "password_reset_or_invite_sent",
    entityType: "profile",
    entityId: profileRow.id,
    companyId,
    metadata: { email, method: "combined_company_user_create" },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/dashboard");
  revalidatePath(`/admin/customers/${companyId}`);
  revalidatePath(`/admin/customers/${companyId}/users`);
  redirect(`/admin/users/${profileRow.id}`);
}
