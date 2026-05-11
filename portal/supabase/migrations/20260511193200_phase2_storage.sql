-- Private certificate storage bucket (no public URLs).
-- MVP: no authenticated SELECT/INSERT policies on storage.objects for this bucket —
-- PDF access is server-only via service role + signed URLs after DB/RLS checks (later phase).

INSERT INTO storage.buckets (id, name, public)
  VALUES ('certificates', 'certificates', FALSE)
ON CONFLICT (id)
  DO UPDATE SET
    public = EXCLUDED.public;

-- Ensure RLS is enabled on storage.objects (default in Supabase; harmless if already on)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Intentionally omit policies granting SELECT/INSERT to authenticated for bucket `certificates`.
-- Service role bypasses RLS for controlled server operations.
