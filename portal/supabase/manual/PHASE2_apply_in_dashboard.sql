-- =============================================================================
-- Oakrange Certificate Portal — Phase 2 (ALL-IN-ONE for Supabase SQL Editor)
-- Run ONCE on a project that does not yet have these tables/policies.
-- This file ends with NOTIFY pgrst, 'reload schema'; to refresh the API cache.
-- =============================================================================
-- Oakrange Certificate Portal — Phase 2 core schema (tables, indexes, triggers).
-- Access rules are enforced in 20260511193100_phase2_rls.sql.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Sequences
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.company_customer_id_seq
  AS integer
  START WITH 1001
  INCREMENT BY 1
  MINVALUE 1001
  NO MAXVALUE
  CACHE 1;

-- ---------------------------------------------------------------------------
-- Companies
-- ---------------------------------------------------------------------------
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  customer_id_readable text NOT NULL,
  company_name text NOT NULL,
  primary_contact_name text,
  primary_contact_email text,
  phone text,
  address_line_1 text,
  address_line_2 text,
  town_city text,
  postcode text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT companies_customer_id_readable_unique UNIQUE (customer_id_readable)
);

CREATE OR REPLACE FUNCTION public.set_company_customer_id_readable ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF NEW.customer_id_readable IS NOT NULL AND length(trim(NEW.customer_id_readable)) > 0 THEN
    RETURN NEW;
  END IF;
  NEW.customer_id_readable := 'OAK-' || nextval('public.company_customer_id_seq')::text;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_companies_set_readable_id
  BEFORE INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_company_customer_id_readable ();

CREATE OR REPLACE FUNCTION public.touch_updated_at ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_companies_touch_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at ();

-- ---------------------------------------------------------------------------
-- Sites
-- ---------------------------------------------------------------------------
CREATE TABLE public.sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  site_name text NOT NULL,
  site_contact_name text,
  site_contact_email text,
  phone text,
  address_line_1 text,
  address_line_2 text,
  town_city text,
  postcode text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sites_company_id_idx ON public.sites (company_id);

CREATE TRIGGER trg_sites_touch_updated_at
  BEFORE UPDATE ON public.sites
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at ();

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  auth_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role text NOT NULL CHECK (role IN ('oakrange_admin', 'site_manager', 'customer_user')),
  company_id uuid REFERENCES public.companies (id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_auth_user_id_key UNIQUE (auth_user_id)
);

CREATE INDEX profiles_company_id_idx ON public.profiles (company_id);

CREATE TRIGGER trg_profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at ();

-- ---------------------------------------------------------------------------
-- Auth: create profile row for each new auth user
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, email, full_name, role, company_id, is_active)
    VALUES (NEW.id, COALESCE(NEW.email, ''), COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'customer_user', NULL, true)
  ON CONFLICT (auth_user_id)
    DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user ();

-- ---------------------------------------------------------------------------
-- User ↔ company/site access
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_site_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  site_id uuid REFERENCES public.sites (id) ON DELETE CASCADE,
  access_type text NOT NULL CHECK (access_type IN ('company', 'site')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles (id),
  CONSTRAINT user_site_access_site_rules CHECK (
    (access_type = 'company' AND site_id IS NULL)
    OR (access_type = 'site' AND site_id IS NOT NULL)
  )
);

CREATE INDEX user_site_access_user_id_idx ON public.user_site_access (user_id);
CREATE INDEX user_site_access_company_id_idx ON public.user_site_access (company_id);

CREATE UNIQUE INDEX user_site_access_company_unique ON public.user_site_access (user_id, company_id)
WHERE
  access_type = 'company';

CREATE UNIQUE INDEX user_site_access_site_unique ON public.user_site_access (user_id, site_id)
WHERE
  access_type = 'site';

CREATE OR REPLACE FUNCTION public.enforce_user_site_access_site_company ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF NEW.access_type = 'site' AND NEW.site_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT
        1
      FROM
        public.sites s
      WHERE
        s.id = NEW.site_id
        AND s.company_id = NEW.company_id) THEN
      RAISE EXCEPTION 'user_site_access.site_id must belong to user_site_access.company_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_site_access_site_company
  BEFORE INSERT OR UPDATE ON public.user_site_access
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_user_site_access_site_company ();

-- ---------------------------------------------------------------------------
-- Certificate documents
-- ---------------------------------------------------------------------------
CREATE TABLE public.certificate_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  site_id uuid REFERENCES public.sites (id) ON DELETE SET NULL,
  document_type text NOT NULL DEFAULT 'calibration_certificate',
  original_file_name text NOT NULL,
  display_title text NOT NULL,
  download_file_name text NOT NULL,
  storage_path text NOT NULL,
  file_size_bytes bigint,
  mime_type text NOT NULL DEFAULT 'application/pdf',
  issue_date date NOT NULL,
  due_date date,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid REFERENCES public.profiles (id),
  published_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'void', 'replaced', 'archived')),
  replaced_by_document_id uuid REFERENCES public.certificate_documents (id),
  notes text,
  search_tags text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT certificate_documents_storage_path_key UNIQUE (storage_path)
);

CREATE INDEX certificate_documents_company_issue_idx ON public.certificate_documents (company_id, issue_date DESC, uploaded_at DESC);

CREATE INDEX certificate_documents_company_site_idx ON public.certificate_documents (company_id, site_id);

CREATE INDEX certificate_documents_status_idx ON public.certificate_documents (status);

CREATE INDEX certificate_documents_published_at_idx ON public.certificate_documents (published_at)
WHERE
  published_at IS NOT NULL;

CREATE TRIGGER trg_certificate_documents_touch_updated_at
  BEFORE UPDATE ON public.certificate_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at ();

-- ---------------------------------------------------------------------------
-- Audit logs (append-only for app roles)
-- ---------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  user_id uuid REFERENCES public.profiles (id),
  user_role text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  company_id uuid REFERENCES public.companies (id) ON DELETE SET NULL,
  site_id uuid REFERENCES public.sites (id) ON DELETE SET NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_company_created_idx ON public.audit_logs (company_id, created_at DESC);

CREATE INDEX audit_logs_user_created_idx ON public.audit_logs (user_id, created_at DESC);

CREATE INDEX audit_logs_action_created_idx ON public.audit_logs (action, created_at DESC);

-- ---------------------------------------------------------------------------
-- Grants (Supabase: authenticated uses RLS)
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sites TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_site_access TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificate_documents TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO authenticated, service_role;

GRANT USAGE, SELECT ON SEQUENCE public.company_customer_id_seq TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.set_company_customer_id_readable () FROM PUBLIC;

REVOKE ALL ON FUNCTION public.touch_updated_at () FROM PUBLIC;

REVOKE ALL ON FUNCTION public.handle_new_user () FROM PUBLIC;

REVOKE ALL ON FUNCTION public.enforce_user_site_access_site_company () FROM PUBLIC;


-- Oakrange Certificate Portal — Phase 2 RLS and helper functions.
-- Rules (MVP):
-- - oakrange_admin: full access to all rows (subject to app patterns).
-- - customer_user / site_manager: inactive profiles cannot read/write protected data.
-- - Certificates for customers: published_at IS NOT NULL, status = 'active' only; expiry is UI-only from due_date.
-- - Company-level user_site_access: all published active certs for that company (all sites + company-level docs).
-- - Site-level user_site_access: published active certs for that site only; never company-level (site_id IS NULL) rows.
-- - Companies/sites: customers only see active records they are permitted to access.

-- ---------------------------------------------------------------------------
-- Helper: Oakrange admin (SECURITY DEFINER reads profiles without RLS recursion issues)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_oakrange_admin ()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT EXISTS (
    SELECT
      1
    FROM
      public.profiles p
    WHERE
      p.auth_user_id = auth.uid ()
      AND p.is_active = TRUE
      AND p.role = 'oakrange_admin');
$$;

REVOKE ALL ON FUNCTION public.is_oakrange_admin () FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_oakrange_admin () TO authenticated;

-- ---------------------------------------------------------------------------
-- Helper: current profile id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_profile_id ()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT
    p.id
  FROM
    public.profiles p
  WHERE
    p.auth_user_id = auth.uid ()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_profile_id () FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_profile_id () TO authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_site_access ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.certificate_documents ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
CREATE POLICY profiles_select_own_or_admin ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_oakrange_admin ()
    OR auth_user_id = auth.uid ());

CREATE POLICY profiles_insert_admin ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_oakrange_admin ());

CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_oakrange_admin ())
  WITH CHECK (public.is_oakrange_admin ());

CREATE POLICY profiles_delete_admin ON public.profiles
  FOR DELETE
  TO authenticated
  USING (public.is_oakrange_admin ());

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------
CREATE POLICY companies_select ON public.companies
  FOR SELECT
  TO authenticated
  USING (public.is_oakrange_admin ()
    OR (status = 'active'
      AND EXISTS (
        SELECT
          1
        FROM
          public.user_site_access usa
        JOIN public.profiles p ON p.id = usa.user_id
      WHERE
        p.auth_user_id = auth.uid ()
        AND p.is_active = TRUE
        AND usa.company_id = companies.id)));

CREATE POLICY companies_write_admin ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_oakrange_admin ());

CREATE POLICY companies_update_admin ON public.companies
  FOR UPDATE
  TO authenticated
  USING (public.is_oakrange_admin ())
  WITH CHECK (public.is_oakrange_admin ());

CREATE POLICY companies_delete_admin ON public.companies
  FOR DELETE
  TO authenticated
  USING (public.is_oakrange_admin ());

-- ---------------------------------------------------------------------------
-- sites
-- ---------------------------------------------------------------------------
CREATE POLICY sites_select ON public.sites
  FOR SELECT
  TO authenticated
  USING (public.is_oakrange_admin ()
    OR (status = 'active'
      AND EXISTS (
        SELECT
          1
        FROM
          public.companies c
        WHERE
          c.id = sites.company_id
          AND c.status = 'active')
      AND (
        EXISTS (
          SELECT
            1
          FROM
            public.user_site_access usa
          JOIN public.profiles p ON p.id = usa.user_id
        WHERE
          p.auth_user_id = auth.uid ()
          AND p.is_active = TRUE
          AND usa.company_id = sites.company_id
          AND usa.access_type = 'company')
        OR EXISTS (
          SELECT
            1
          FROM
            public.user_site_access usa
          JOIN public.profiles p ON p.id = usa.user_id
        WHERE
          p.auth_user_id = auth.uid ()
          AND p.is_active = TRUE
          AND usa.access_type = 'site'
          AND usa.site_id = sites.id))));

CREATE POLICY sites_write_admin ON public.sites
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_oakrange_admin ());

CREATE POLICY sites_update_admin ON public.sites
  FOR UPDATE
  TO authenticated
  USING (public.is_oakrange_admin ())
  WITH CHECK (public.is_oakrange_admin ());

CREATE POLICY sites_delete_admin ON public.sites
  FOR DELETE
  TO authenticated
  USING (public.is_oakrange_admin ());

-- ---------------------------------------------------------------------------
-- user_site_access
-- ---------------------------------------------------------------------------
CREATE POLICY user_site_access_select ON public.user_site_access
  FOR SELECT
  TO authenticated
  USING (public.is_oakrange_admin ()
    OR user_id = public.current_profile_id ());

CREATE POLICY user_site_access_write_admin ON public.user_site_access
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_oakrange_admin ());

CREATE POLICY user_site_access_update_admin ON public.user_site_access
  FOR UPDATE
  TO authenticated
  USING (public.is_oakrange_admin ())
  WITH CHECK (public.is_oakrange_admin ());

CREATE POLICY user_site_access_delete_admin ON public.user_site_access
  FOR DELETE
  TO authenticated
  USING (public.is_oakrange_admin ());

-- ---------------------------------------------------------------------------
-- certificate_documents
-- ---------------------------------------------------------------------------
CREATE POLICY certificate_documents_select ON public.certificate_documents
  FOR SELECT
  TO authenticated
  USING (public.is_oakrange_admin ()
    OR (EXISTS (
      SELECT
        1
      FROM
        public.profiles p
      WHERE
        p.auth_user_id = auth.uid ()
        AND p.is_active = TRUE
        AND p.role IN ('customer_user', 'site_manager'))
      AND published_at IS NOT NULL
      AND status = 'active'
      AND EXISTS (
        SELECT
          1
        FROM
          public.companies co
        WHERE
          co.id = certificate_documents.company_id
          AND co.status = 'active')
      AND (certificate_documents.site_id IS NULL
        OR EXISTS (
          SELECT
            1
          FROM
            public.sites s
          WHERE
            s.id = certificate_documents.site_id
            AND s.status = 'active'))
      AND (EXISTS (
        SELECT
          1
        FROM
          public.user_site_access usa
        JOIN public.profiles p ON p.id = usa.user_id
      WHERE
        p.auth_user_id = auth.uid ()
        AND p.is_active = TRUE
        AND usa.company_id = certificate_documents.company_id
        AND usa.access_type = 'company')
        OR (certificate_documents.site_id IS NOT NULL
          AND EXISTS (
            SELECT
              1
            FROM
              public.user_site_access usa
            JOIN public.profiles p ON p.id = usa.user_id
          WHERE
            p.auth_user_id = auth.uid ()
            AND p.is_active = TRUE
            AND usa.company_id = certificate_documents.company_id
            AND usa.access_type = 'site'
            AND usa.site_id = certificate_documents.site_id)))));

CREATE POLICY certificate_documents_insert_admin ON public.certificate_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_oakrange_admin ());

CREATE POLICY certificate_documents_update_admin ON public.certificate_documents
  FOR UPDATE
  TO authenticated
  USING (public.is_oakrange_admin ())
  WITH CHECK (public.is_oakrange_admin ());

CREATE POLICY certificate_documents_delete_admin ON public.certificate_documents
  FOR DELETE
  TO authenticated
  USING (public.is_oakrange_admin ());

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
CREATE POLICY audit_logs_select_admin ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_oakrange_admin ());

CREATE POLICY audit_logs_insert_authenticated ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.current_profile_id ()
    AND EXISTS (
      SELECT
        1
      FROM
        public.profiles p
      WHERE
        p.id = user_id
        AND p.is_active = TRUE));

-- No UPDATE / DELETE policies for authenticated (append-only)


-- Private certificate storage bucket (no public URLs).
-- MVP: no authenticated SELECT/INSERT policies on storage.objects for this bucket —
-- PDF access is server-only via service role + signed URLs after DB/RLS checks (later phase).

INSERT INTO storage.buckets (id, name, public)
  VALUES ('certificates', 'certificates', FALSE)
ON CONFLICT (id)
  DO UPDATE SET
    public = EXCLUDED.public;

-- Do not ALTER storage.objects here: dashboard SQL runs as a role that is not the
-- table owner (42501: must be owner of table objects). Supabase enables RLS on
-- storage.objects by default.

-- Intentionally omit policies granting SELECT/INSERT to authenticated for bucket `certificates`.
-- Service role bypasses RLS for controlled server operations.

-- =============================================================================
-- Reload PostgREST schema cache (helps clear PGRST205 after DDL)
-- =============================================================================
NOTIFY pgrst, 'reload schema';

