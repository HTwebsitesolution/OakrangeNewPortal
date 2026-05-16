import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthAuditAction = "login" | "logout";

export type AdminAuditAction =
  | "customer_created"
  | "customer_updated"
  | "customer_deactivated"
  | "certificate_uploaded"
  | "certificate_published"
  | "certificate_viewed_admin"
  | "certificate_downloaded_admin"
  | "certificate_replaced"
  | "certificate_voided"
  | "certificate_archived"
  | "certificate_viewed_customer"
  | "certificate_downloaded_customer"
  | "site_created"
  | "site_updated"
  | "site_deactivated"
  | "user_created"
  | "user_updated"
  | "user_deactivated"
  | "access_grant_created"
  | "access_grant_removed";

/**
 * Append-only audit row. Call with a client that has the user session (RLS: own user_id only).
 */
export async function logAuthAudit(
  supabase: SupabaseClient,
  input: {
    userId: string;
    userRole: string;
    action: AuthAuditAction;
    metadata?: Record<string, unknown>;
  }
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("audit_logs").insert({
    user_id: input.userId,
    user_role: input.userRole,
    action: input.action,
    entity_type: "auth",
    entity_id: null,
    company_id: null,
    site_id: null,
    metadata_json: input.metadata ?? {},
  });

  return { error: error ? new Error(error.message) : null };
}

/**
 * Append-only admin audit row. Same RLS as auth audit: `user_id` must be the signed-in profile.
 */
export async function logAdminAudit(
  supabase: SupabaseClient,
  input: {
    actorProfileId: string;
    actorRole: string;
    action: AdminAuditAction;
    entityType: string;
    entityId: string | null;
    companyId?: string | null;
    siteId?: string | null;
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
  }
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("audit_logs").insert({
    user_id: input.actorProfileId,
    user_role: input.actorRole,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    company_id: input.companyId ?? null,
    site_id: input.siteId ?? null,
    metadata_json: input.metadata ?? {},
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
  });

  return { error: error ? new Error(error.message) : null };
}
