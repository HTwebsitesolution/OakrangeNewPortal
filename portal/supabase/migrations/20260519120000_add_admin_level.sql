-- Internal Oakrange admin hierarchy (Option A): role stays oakrange_admin; admin_level distinguishes super vs admin.

ALTER TABLE public.profiles
  ADD COLUMN admin_level text;

UPDATE public.profiles
SET admin_level = 'admin'
WHERE role = 'oakrange_admin'
  AND admin_level IS NULL;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_admin_level_check
  CHECK (admin_level IS NULL OR admin_level IN ('super_admin', 'admin'));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_admin_level_role_check
  CHECK (
    (role = 'oakrange_admin' AND admin_level IS NOT NULL)
    OR (role <> 'oakrange_admin' AND admin_level IS NULL)
  );

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role = 'oakrange_admin'
      AND p.admin_level = 'super_admin'
      AND p.is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_profile_admin_level()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role text;
  actor_level text;
BEGIN
  -- Service role / bootstrap (no JWT): normalize only.
  IF auth.uid() IS NULL THEN
    IF NEW.role <> 'oakrange_admin' THEN
      NEW.admin_level := NULL;
    ELSIF NEW.admin_level IS NULL THEN
      NEW.admin_level := 'admin';
    END IF;
    RETURN NEW;
  END IF;

  SELECT role, admin_level
  INTO actor_role, actor_level
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  IF actor_role IS DISTINCT FROM 'oakrange_admin' THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  IF NEW.role <> 'oakrange_admin' THEN
    NEW.admin_level := NULL;
    RETURN NEW;
  END IF;

  IF NEW.admin_level IS NULL THEN
    NEW.admin_level := 'admin';
  END IF;

  IF actor_level = 'super_admin' THEN
    RETURN NEW;
  END IF;

  IF NEW.admin_level = 'super_admin' THEN
    RAISE EXCEPTION 'only_super_admin_may_set_super_admin';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.role = 'oakrange_admin' AND OLD.admin_level = 'super_admin' THEN
    IF NEW.admin_level IS DISTINCT FROM OLD.admin_level OR NEW.is_active = false THEN
      RAISE EXCEPTION 'cannot_modify_super_admin';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.role = 'oakrange_admin' THEN
    RAISE EXCEPTION 'only_super_admin_may_create_internal_admin';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.role = 'oakrange_admin' AND OLD.role <> 'oakrange_admin' THEN
    RAISE EXCEPTION 'only_super_admin_may_promote_to_internal_admin';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_enforce_admin_level
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_admin_level();
