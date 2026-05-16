import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthAuditAction =
  | "login"
  | "logout"
  | "account_disabled_block"
  | "access_pending_redirect";

export type AdminAuditAction =
  | "customer_created"
  | "customer_updated"
  | "customer_deactivated"
  | "customer_reactivated"
  | "customer_deleted"
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
  | "site_reactivated"
  | "user_created"
  | "user_updated"
  | "user_deactivated"
  | "user_reactivated"
  | "user_role_changed"
  | "password_reset_or_invite_sent"
  | "access_grant_created"
  | "access_grant_removed"
  | "access_grant_changed";

export type AuditAction = AuthAuditAction | AdminAuditAction;

const SENSITIVE_METADATA_KEYS = new Set([
  "storage_path",
  "signedurl",
  "signed_url",
  "password",
  "temp_password",
  "service_role",
  "service_role_key",
  "supabase_service_role_key",
  "access_token",
  "refresh_token",
]);

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (SENSITIVE_METADATA_KEYS.has(lower)) return true;
  return lower.includes("password") || lower.includes("secret") || lower.includes("token");
}

/** Strip secrets, storage paths, and signed URLs before persisting audit metadata. */
export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!metadata) return {};

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (isSensitiveKey(key)) continue;
    if (typeof value === "string" && value.includes("token=")) continue;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      clean[key] = sanitizeAuditMetadata(value as Record<string, unknown>);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export function getRequestAuditMetadata(request: {
  headers: { get(name: string): string | null };
}): { ipAddress: string | null; userAgent: string | null } {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  };
}

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
    ipAddress?: string | null;
    userAgent?: string | null;
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
    metadata_json: sanitizeAuditMetadata(input.metadata),
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
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
    metadata_json: sanitizeAuditMetadata(input.metadata),
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
  });

  return { error: error ? new Error(error.message) : null };
}
