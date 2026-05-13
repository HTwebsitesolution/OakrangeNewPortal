-- Phase 5 certificate integrity guardrails.
-- Keep existing visibility/RLS rules intact; tighten only certificate write correctness.

ALTER TABLE public.certificate_documents
  ADD CONSTRAINT certificate_documents_due_date_after_issue_check
  CHECK (due_date IS NULL OR due_date >= issue_date);

CREATE OR REPLACE FUNCTION public.enforce_certificate_site_company ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF NEW.site_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT
        1
      FROM
        public.sites s
      WHERE
        s.id = NEW.site_id
        AND s.company_id = NEW.company_id) THEN
      RAISE EXCEPTION 'certificate_documents.site_id must belong to certificate_documents.company_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_certificate_documents_site_company
  BEFORE INSERT OR UPDATE ON public.certificate_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_certificate_site_company ();

REVOKE ALL ON FUNCTION public.enforce_certificate_site_company () FROM PUBLIC;
