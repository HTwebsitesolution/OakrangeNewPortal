-- Rollback for 20261111120000_manager_user_assignments.sql
--
-- Step 1 alone switches off all delegated access immediately and is safe to run on its own.
-- Steps 2-3 remove the feature completely, including assignment history; export
-- manager_user_assignments and manager_assignment_scopes first if that history is needed.
-- Existing tables, policies and grants are not touched.

BEGIN;

-- 1. Remove delegated read access
DROP POLICY IF EXISTS certificate_documents_select_delegated ON public.certificate_documents;
DROP POLICY IF EXISTS sites_select_delegated ON public.sites;
DROP POLICY IF EXISTS companies_select_delegated ON public.companies;

-- 2. Remove functions
DROP FUNCTION IF EXISTS public.create_manager_assignment (uuid, uuid, jsonb);
DROP FUNCTION IF EXISTS public.manager_team_members ();
DROP FUNCTION IF EXISTS public.has_delegated_scope (uuid, uuid);
DROP FUNCTION IF EXISTS public.has_delegated_company (uuid);

-- 3. Remove tables (drops their policies and triggers) and trigger functions
DROP TABLE IF EXISTS public.manager_assignment_scopes;
DROP TABLE IF EXISTS public.manager_user_assignments;
DROP FUNCTION IF EXISTS public.enforce_manager_assignment_scope ();
DROP FUNCTION IF EXISTS public.enforce_manager_user_assignment ();

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    DELETE FROM supabase_migrations.schema_migrations WHERE version = '20261111120000';
  END IF;
END
$$;

COMMIT;
