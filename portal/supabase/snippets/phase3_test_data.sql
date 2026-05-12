-- Phase 3: manual test data (Supabase SQL Editor)
-- 1. In Authentication, create users with these exact emails (or run npm run ensure:test-users).
--    admin@oakrange-test.co.uk
--    manager@oakrange-test.co.uk
--    customer@oakrange-test.co.uk
-- 2. Run this script once. It creates a shared test company and updates profiles.

INSERT INTO public.companies (company_name)
SELECT 'Oakrange Test Customer'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.companies
  WHERE company_name = 'Oakrange Test Customer');

-- If the company already existed under another name, adjust the WHERE below.

WITH c AS (
  SELECT id
  FROM public.companies
  WHERE company_name = 'Oakrange Test Customer'
  ORDER BY created_at DESC
  LIMIT 1
)
UPDATE public.profiles AS p
SET
  role = 'oakrange_admin',
  company_id = NULL,
  is_active = TRUE,
  email = 'admin@oakrange-test.co.uk'
WHERE p.email = 'admin@oakrange-test.co.uk';

WITH c AS (
  SELECT id
  FROM public.companies
  WHERE company_name = 'Oakrange Test Customer'
  ORDER BY created_at DESC
  LIMIT 1
)
UPDATE public.profiles AS p
SET
  role = 'site_manager',
  company_id = (SELECT id FROM c),
  is_active = TRUE,
  email = 'manager@oakrange-test.co.uk'
WHERE p.email = 'manager@oakrange-test.co.uk';

WITH c AS (
  SELECT id
  FROM public.companies
  WHERE company_name = 'Oakrange Test Customer'
  ORDER BY created_at DESC
  LIMIT 1
)
UPDATE public.profiles AS p
SET
  role = 'customer_user',
  company_id = (SELECT id FROM c),
  is_active = TRUE,
  email = 'customer@oakrange-test.co.uk'
WHERE p.email = 'customer@oakrange-test.co.uk';
