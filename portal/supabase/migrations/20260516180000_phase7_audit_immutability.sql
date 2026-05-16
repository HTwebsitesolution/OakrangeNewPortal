-- Phase 7: audit_logs append-only for application roles.
-- SELECT remains admin-only via existing RLS (audit_logs_select_admin).
-- INSERT remains authenticated with user_id = current_profile_id() (audit_logs_insert_authenticated).
-- REVOKE UPDATE/DELETE so grants cannot be used even if a policy were added by mistake.

REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated;

CREATE INDEX IF NOT EXISTS audit_logs_entity_created_idx ON public.audit_logs (entity_type, entity_id, created_at DESC);
