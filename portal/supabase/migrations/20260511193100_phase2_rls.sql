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
