-- Manager-to-user delegated access.
--
-- An Oakrange admin assigns customer_user accounts to a site_manager and approves a snapshot of
-- (company, site) scopes taken from that user's direct grants at approval time. site_id IS NULL
-- means the company's company-level documents.
--
-- Delegated access = active assignment + active approved scope + active site_manager
--                    + active company (+ active site belonging to that company).
-- It deliberately does not depend on the assigned user's later status or grants, and grants
-- added to that user later never extend it without a fresh admin approval.
--
-- Existing tables, policies and grants are not modified. Delegated reads are added as separate
-- permissive SELECT policies, which Postgres ORs with the existing ones.
-- Rollback: supabase/rollback/20261111120000_manager_user_assignments_down.sql

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE public.manager_user_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  manager_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  customer_user_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  revoked_at timestamptz,
  CONSTRAINT manager_user_assignments_not_self CHECK (manager_profile_id <> customer_user_profile_id),
  CONSTRAINT manager_user_assignments_revocation CHECK (
    (is_active AND revoked_at IS NULL)
    OR (NOT is_active AND revoked_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX manager_user_assignments_active_pair ON public.manager_user_assignments (manager_profile_id, customer_user_profile_id)
WHERE
  is_active;

CREATE INDEX manager_user_assignments_manager_idx ON public.manager_user_assignments (manager_profile_id);

CREATE INDEX manager_user_assignments_customer_idx ON public.manager_user_assignments (customer_user_profile_id);

CREATE TABLE public.manager_assignment_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  assignment_id uuid NOT NULL REFERENCES public.manager_user_assignments (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  site_id uuid REFERENCES public.sites (id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT TRUE,
  approved_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  approved_at timestamptz NOT NULL DEFAULT now(),
  revoked_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  revoked_at timestamptz,
  CONSTRAINT manager_assignment_scopes_revocation CHECK (
    (is_active AND revoked_at IS NULL)
    OR (NOT is_active AND revoked_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX manager_assignment_scopes_active_site ON public.manager_assignment_scopes (assignment_id, site_id)
WHERE
  is_active AND site_id IS NOT NULL;

CREATE UNIQUE INDEX manager_assignment_scopes_active_company_level ON public.manager_assignment_scopes (assignment_id, company_id)
WHERE
  is_active AND site_id IS NULL;

CREATE INDEX manager_assignment_scopes_assignment_idx ON public.manager_assignment_scopes (assignment_id);

CREATE INDEX manager_assignment_scopes_company_site_idx ON public.manager_assignment_scopes (company_id, site_id)
WHERE
  is_active;

-- ---------------------------------------------------------------------------
-- Write rules (apply to every writer, including the service role)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_manager_user_assignment ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.manager_profile_id <> OLD.manager_profile_id
      OR NEW.customer_user_profile_id <> OLD.customer_user_profile_id THEN
      RAISE EXCEPTION 'manager_assignment_immutable';
    END IF;
    IF NEW.is_active AND NOT OLD.is_active THEN
      RAISE EXCEPTION 'manager_assignment_cannot_reactivate';
    END IF;
    RETURN NEW;
  END IF;

  IF NOT NEW.is_active THEN
    RAISE EXCEPTION 'manager_assignment_must_start_active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = NEW.manager_profile_id
      AND p.role = 'site_manager'
      AND p.is_active = TRUE) THEN
    RAISE EXCEPTION 'manager_must_be_active_site_manager';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = NEW.customer_user_profile_id
      AND p.role = 'customer_user'
      AND p.is_active = TRUE) THEN
    RAISE EXCEPTION 'assigned_user_must_be_active_customer_user';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_manager_user_assignments_enforce
  BEFORE INSERT OR UPDATE ON public.manager_user_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_manager_user_assignment ();

CREATE OR REPLACE FUNCTION public.enforce_manager_assignment_scope ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_customer uuid;
  v_assignment_active boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.assignment_id <> OLD.assignment_id
      OR NEW.company_id <> OLD.company_id
      OR NEW.site_id IS DISTINCT FROM OLD.site_id
      OR NEW.approved_at <> OLD.approved_at THEN
      RAISE EXCEPTION 'manager_scope_immutable';
    END IF;
    IF NEW.is_active AND NOT OLD.is_active THEN
      RAISE EXCEPTION 'manager_scope_cannot_reactivate';
    END IF;
    RETURN NEW;
  END IF;

  IF NOT NEW.is_active THEN
    RAISE EXCEPTION 'manager_scope_must_start_active';
  END IF;

  SELECT a.customer_user_profile_id, a.is_active
  INTO v_customer, v_assignment_active
  FROM public.manager_user_assignments a
  WHERE a.id = NEW.assignment_id;

  IF v_assignment_active IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'manager_assignment_not_active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_customer
      AND p.role = 'customer_user'
      AND p.is_active = TRUE) THEN
    RAISE EXCEPTION 'assigned_user_must_be_active_customer_user';
  END IF;

  IF NEW.site_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sites s
    WHERE s.id = NEW.site_id
      AND s.company_id = NEW.company_id) THEN
    RAISE EXCEPTION 'manager_scope_site_company_mismatch';
  END IF;

  -- The approved scope must be inside the assigned user's direct grants at approval time.
  IF NOT EXISTS (
    SELECT 1 FROM public.user_site_access usa
    WHERE usa.user_id = v_customer
      AND usa.company_id = NEW.company_id
      AND (usa.access_type = 'company'
        OR (NEW.site_id IS NOT NULL
          AND usa.access_type = 'site'
          AND usa.site_id = NEW.site_id))) THEN
    RAISE EXCEPTION 'manager_scope_outside_assigned_user_access';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_manager_assignment_scopes_enforce
  BEFORE INSERT OR UPDATE ON public.manager_assignment_scopes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_manager_assignment_scope ();

REVOKE ALL ON FUNCTION public.enforce_manager_user_assignment () FROM PUBLIC;

REVOKE ALL ON FUNCTION public.enforce_manager_assignment_scope () FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- Effective delegated access (only ever answers for the signed-in user)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_delegated_scope (p_company_id uuid, p_site_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles m
    JOIN public.manager_user_assignments a ON a.manager_profile_id = m.id AND a.is_active
    JOIN public.manager_assignment_scopes s ON s.assignment_id = a.id AND s.is_active
    JOIN public.companies c ON c.id = s.company_id AND c.status = 'active'
    LEFT JOIN public.sites st ON st.id = s.site_id
    WHERE m.auth_user_id = auth.uid ()
      AND m.is_active = TRUE
      AND m.role = 'site_manager'
      AND s.company_id = p_company_id
      AND s.site_id IS NOT DISTINCT FROM p_site_id
      AND (s.site_id IS NULL
        OR (st.status = 'active' AND st.company_id = s.company_id)));
$$;

CREATE OR REPLACE FUNCTION public.has_delegated_company (p_company_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles m
    JOIN public.manager_user_assignments a ON a.manager_profile_id = m.id AND a.is_active
    JOIN public.manager_assignment_scopes s ON s.assignment_id = a.id AND s.is_active
    JOIN public.companies c ON c.id = s.company_id AND c.status = 'active'
    LEFT JOIN public.sites st ON st.id = s.site_id
    WHERE m.auth_user_id = auth.uid ()
      AND m.is_active = TRUE
      AND m.role = 'site_manager'
      AND s.company_id = p_company_id
      AND (s.site_id IS NULL
        OR (st.status = 'active' AND st.company_id = s.company_id)));
$$;

REVOKE ALL ON FUNCTION public.has_delegated_scope (uuid, uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.has_delegated_company (uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_delegated_scope (uuid, uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.has_delegated_company (uuid) TO authenticated;

-- Display names for a manager's assigned users, without opening up profiles to managers.
CREATE OR REPLACE FUNCTION public.manager_team_members ()
  RETURNS TABLE (
    assignment_id uuid,
    member_name text,
    company_name text,
    customer_id_readable text)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT
    a.id,
    COALESCE(NULLIF(trim(p.full_name), ''), 'Team member'),
    c.company_name,
    c.customer_id_readable
  FROM public.profiles m
  JOIN public.manager_user_assignments a ON a.manager_profile_id = m.id AND a.is_active
  JOIN public.profiles p ON p.id = a.customer_user_profile_id
  LEFT JOIN public.companies c ON c.id = p.company_id
  WHERE m.auth_user_id = auth.uid ()
    AND m.is_active = TRUE
    AND m.role = 'site_manager'
  ORDER BY 3, 2;
$$;

REVOKE ALL ON FUNCTION public.manager_team_members () FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.manager_team_members () TO authenticated;

-- Atomic create (assignment + approved scopes). Runs as the caller, so RLS and triggers apply.
CREATE OR REPLACE FUNCTION public.create_manager_assignment (p_manager_profile_id uuid, p_customer_user_profile_id uuid, p_scopes jsonb)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public
  AS $$
DECLARE
  v_actor uuid := public.current_profile_id ();
  v_assignment_id uuid;
BEGIN
  IF NOT public.is_oakrange_admin () THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  IF p_scopes IS NULL OR jsonb_typeof(p_scopes) <> 'array' OR jsonb_array_length(p_scopes) = 0 THEN
    RAISE EXCEPTION 'manager_assignment_requires_scope';
  END IF;

  INSERT INTO public.manager_user_assignments (manager_profile_id, customer_user_profile_id, created_by)
    VALUES (p_manager_profile_id, p_customer_user_profile_id, v_actor)
  RETURNING id INTO v_assignment_id;

  INSERT INTO public.manager_assignment_scopes (assignment_id, company_id, site_id, approved_by)
  SELECT v_assignment_id, (x ->> 'company_id')::uuid, NULLIF(x ->> 'site_id', '')::uuid, v_actor
  FROM jsonb_array_elements(p_scopes) x;

  RETURN v_assignment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_manager_assignment (uuid, uuid, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_manager_assignment (uuid, uuid, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS on the new tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.manager_user_assignments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.manager_assignment_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY manager_user_assignments_select ON public.manager_user_assignments
  FOR SELECT
  TO authenticated
  USING (public.is_oakrange_admin ()
    OR manager_profile_id = public.current_profile_id ());

CREATE POLICY manager_user_assignments_insert_admin ON public.manager_user_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_oakrange_admin ());

CREATE POLICY manager_user_assignments_update_admin ON public.manager_user_assignments
  FOR UPDATE
  TO authenticated
  USING (public.is_oakrange_admin ())
  WITH CHECK (public.is_oakrange_admin ());

CREATE POLICY manager_assignment_scopes_select ON public.manager_assignment_scopes
  FOR SELECT
  TO authenticated
  USING (public.is_oakrange_admin ()
    OR EXISTS (
      SELECT 1 FROM public.manager_user_assignments a
      WHERE a.id = manager_assignment_scopes.assignment_id
        AND a.manager_profile_id = public.current_profile_id ()));

CREATE POLICY manager_assignment_scopes_insert_admin ON public.manager_assignment_scopes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_oakrange_admin ());

CREATE POLICY manager_assignment_scopes_update_admin ON public.manager_assignment_scopes
  FOR UPDATE
  TO authenticated
  USING (public.is_oakrange_admin ())
  WITH CHECK (public.is_oakrange_admin ());

-- No DELETE policies: assignments and scopes are revoked, never deleted, to keep history.

REVOKE ALL ON public.manager_user_assignments FROM anon;

REVOKE ALL ON public.manager_assignment_scopes FROM anon;

GRANT SELECT, INSERT, UPDATE ON public.manager_user_assignments TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.manager_assignment_scopes TO authenticated;

GRANT ALL ON public.manager_user_assignments TO service_role;

GRANT ALL ON public.manager_assignment_scopes TO service_role;

-- ---------------------------------------------------------------------------
-- Delegated read policies (additive; existing *_select policies are unchanged)
-- ---------------------------------------------------------------------------
CREATE POLICY certificate_documents_select_delegated ON public.certificate_documents
  FOR SELECT
  TO authenticated
  USING (published_at IS NOT NULL
    AND status = 'active'
    AND public.has_delegated_scope (company_id, site_id));

CREATE POLICY sites_select_delegated ON public.sites
  FOR SELECT
  TO authenticated
  USING (status = 'active'
    AND public.has_delegated_scope (company_id, id));

CREATE POLICY companies_select_delegated ON public.companies
  FOR SELECT
  TO authenticated
  USING (status = 'active'
    AND public.has_delegated_company (id));
