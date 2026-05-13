"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logAdminAudit } from "@/lib/audit/log";
import { requireAdminSupabase } from "@/lib/auth/require-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  parseUserRole,
  validateUserForm,
} from "@/lib/admin/validation";

export type UserActionState = { error?: string; ok?: boolean; tempPassword?: string };

const PROFILE_ROW_ATTEMPTS = 12;
const PROFILE_ROW_DELAY_MS = 250;

function text(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

function optionalCompanyId(fd: FormData): string | null {
  const v = text(fd, "company_id");
  return v === "" ? null : v;
}

async function waitForProfileRow(
  supabase: SupabaseClient,
  authUserId: string,
  attempts = PROFILE_ROW_ATTEMPTS
): Promise<{ id: string } | null> {
  for (let i = 0; i < attempts; i++) {
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

async function rollbackCreatedAuthUser(
  service: ReturnType<typeof createServiceRoleClient>,
  authUserId: string,
  reason: string
): Promise<UserActionState> {
  const { error: cleanupErr } = await service.auth.admin.deleteUser(authUserId);
  if (cleanupErr) {
    return {
      error: `${reason} Cleanup failed while deleting the partially created Auth user: ${cleanupErr.message}`,
    };
  }
  return { error: reason };
}

async function rollbackAuthEmail(
  service: ReturnType<typeof createServiceRoleClient>,
  authUserId: string,
  previousEmail: string
): Promise<Error | null> {
  const { error } = await service.auth.admin.updateUserById(authUserId, {
    email: previousEmail,
  });
  return error ? new Error(error.message) : null;
}

export async function createPortalUserAction(
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

  const email = text(formData, "email").toLowerCase();
  const full_name = text(formData, "full_name");
  const role = parseUserRole(text(formData, "role"));
  const company_id = optionalCompanyId(formData);
  const tempPassword = text(formData, "temp_password");

  if (!role) return { error: "Role is required." };
  const verr = validateUserForm({ email, role, company_id, full_name });
  if (verr) return { error: verr };
  if (tempPassword.length < 8) {
    return { error: "Temporary password must be at least 8 characters." };
  }

  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: full_name || email },
  });

  if (createErr) {
    return { error: createErr.message };
  }

  const user = created.user;
  if (!user) return { error: "Auth user was not returned." };

  const profileRow = await waitForProfileRow(supabase, user.id);
  if (!profileRow) {
    return rollbackCreatedAuthUser(
      service,
      user.id,
      "No profile row appeared after creating the Auth user. Check the handle_new_user trigger on auth.users."
    );
  }

  const finalCompanyId = role === "oakrange_admin" ? null : company_id;

  const { error: upErr } = await supabase
    .from("profiles")
    .update({
      email,
      full_name: full_name || email,
      role,
      company_id: finalCompanyId,
      is_active: true,
    })
    .eq("id", profileRow.id);

  if (upErr) {
    return rollbackCreatedAuthUser(
      service,
      user.id,
      `Profile update failed after Auth user creation: ${upErr.message}`
    );
  }

  if (role === "oakrange_admin") {
    await supabase.from("user_site_access").delete().eq("user_id", profileRow.id);
  }

  const { error: auditErr } = await logAdminAudit(supabase, {
    actorProfileId: actor.id,
    actorRole: actor.role,
    action: "user_created",
    entityType: "profile",
    entityId: profileRow.id,
    companyId: finalCompanyId,
    metadata: { email, role },
  });
  if (auditErr) {
    console.warn("Audit log (user create) failed:", auditErr.message);
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/dashboard");
  if (finalCompanyId) {
    revalidatePath(`/admin/customers/${finalCompanyId}/users`);
  }
  redirect(`/admin/users/${profileRow.id}`);
}

export async function updatePortalUserAction(
  profileId: string,
  _prev: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  const { supabase, profile: actor } = await requireAdminSupabase();

  const email = text(formData, "email").toLowerCase();
  const full_name = text(formData, "full_name");
  const role = parseUserRole(text(formData, "role"));
  const company_id = optionalCompanyId(formData);
  const is_active = text(formData, "is_active") === "true";

  if (!role) return { error: "Role is required." };
  const verr = validateUserForm({ email, role, company_id, full_name });
  if (verr) return { error: verr };

  const { data: existing, error: exErr } = await supabase
    .from("profiles")
    .select("id, auth_user_id, is_active, role, company_id, email")
    .eq("id", profileId)
    .maybeSingle();

  if (exErr || !existing) return { error: "User not found." };

  const finalCompanyId = role === "oakrange_admin" ? null : company_id;

  let service: ReturnType<typeof createServiceRoleClient> | null = null;
  try {
    service = createServiceRoleClient();
  } catch {
    service = null;
  }

  const emailChanged = existing.email?.toLowerCase() !== email;
  if (emailChanged) {
    if (!service) {
      return {
        error:
          "Changing login email requires SUPABASE_SERVICE_ROLE_KEY on the server so Auth and the profile stay in sync.",
      };
    }
    const { error: authEmailErr } = await service.auth.admin.updateUserById(
      existing.auth_user_id,
      { email }
    );
    if (authEmailErr) return { error: `Auth email update failed: ${authEmailErr.message}` };
  }

  const { error: upErr } = await supabase
    .from("profiles")
    .update({
      email,
      full_name: full_name || email,
      role,
      company_id: finalCompanyId,
      is_active,
    })
    .eq("id", profileId);

  if (upErr) {
    if (emailChanged && service) {
      const rollbackErr = await rollbackAuthEmail(service, existing.auth_user_id, existing.email);
      if (rollbackErr) {
        return {
          error: `${upErr.message} Auth email changed to ${email}, and rollback to ${existing.email} also failed: ${rollbackErr.message}`,
        };
      }
    }
    return { error: upErr.message };
  }

  if (role === "oakrange_admin") {
    await supabase.from("user_site_access").delete().eq("user_id", profileId);
  } else if (existing.company_id !== finalCompanyId) {
    await supabase.from("user_site_access").delete().eq("user_id", profileId);
  }

  const becameInactive = existing.is_active && !is_active;

  const { error: auditErr } = await logAdminAudit(supabase, {
    actorProfileId: actor.id,
    actorRole: actor.role,
    action: becameInactive ? "user_deactivated" : "user_updated",
    entityType: "profile",
    entityId: profileId,
    companyId: finalCompanyId,
    metadata: { email, role, is_active },
  });
  if (auditErr) {
    console.warn("Audit log (user update) failed:", auditErr.message);
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${profileId}`);
  revalidatePath(`/admin/users/${profileId}/edit`);
  revalidatePath("/admin/dashboard");
  if (finalCompanyId) {
    revalidatePath(`/admin/customers/${finalCompanyId}/users`);
  }
  if (existing.company_id && existing.company_id !== finalCompanyId) {
    revalidatePath(`/admin/customers/${existing.company_id}/users`);
  }
  return { ok: true };
}
