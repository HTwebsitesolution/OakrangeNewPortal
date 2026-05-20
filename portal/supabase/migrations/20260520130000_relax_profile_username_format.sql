-- Allow mixed-case alphanumeric usernames (e.g. 1824newport, 1825Swansea1, hewi3188).

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_username_format_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format_check
  CHECK (
    username IS NULL
    OR username ~ '^[A-Za-z0-9]{4,32}$'
  );
