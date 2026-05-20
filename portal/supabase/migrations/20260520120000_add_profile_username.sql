-- Portal login username (e.g. 1824newport, 378STC). Set at user creation; immutable thereafter.

ALTER TABLE public.profiles
  ADD COLUMN username text;

CREATE UNIQUE INDEX profiles_username_unique_lower_idx
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format_check
  CHECK (
    username IS NULL
    OR username ~ '^[A-Za-z0-9]{4,32}$'
  );

CREATE OR REPLACE FUNCTION public.profiles_username_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND OLD.username IS NOT NULL
    AND NEW.username IS DISTINCT FROM OLD.username THEN
    RAISE EXCEPTION 'username_immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_username_immutable
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_username_immutable();
