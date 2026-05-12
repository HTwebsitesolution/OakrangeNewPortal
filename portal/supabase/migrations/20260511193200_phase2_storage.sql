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
