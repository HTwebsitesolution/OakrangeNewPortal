import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthAuditAction = "login" | "logout";

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
