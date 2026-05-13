# Phase 5 Admin Verification

This verification pass is limited to Phase 5 admin certificate management.

Out of scope:
- customer-facing portal certificate dashboards
- any new portal download or visibility UI
- changes to `src/app/portal/certificates/page.tsx` beyond preserving its current placeholder/security posture

## Preconditions

- An active `oakrange_admin` account can sign in.
- At least one active customer exists.
- At least one active site exists under a customer.
- A valid PDF smaller than 20 MB is available.
- A non-PDF file is available for validation checks.

## Admin Upload Checks

1. Global upload:
   - Open `/admin/certificates/upload`.
   - Publish one company-level certificate.
   - Confirm redirect to `/admin/certificates/[id]`.
   - Confirm the success banner, generated display title, generated download filename, and storage path format:
     `certificates/{company_id}/{company|site_id}/{certificate_id}.pdf`

2. Customer upload:
   - Open `/admin/customers/[companyId]/certificates/upload`.
   - Confirm the customer is preselected and locked.
   - Publish one site-level certificate from this screen.
   - Confirm it appears in both the customer certificate list and the site certificate list.

3. Site upload:
   - Open `/admin/customers/[companyId]/sites/[siteId]/certificates/upload`.
   - Confirm both customer and site are preselected and locked.
   - Publish one site-level certificate.

## Validation Checks

1. Try uploading a non-PDF file.
   - Expected: request is rejected and no certificate row is published.

2. Try uploading a PDF larger than 20 MB.
   - Expected: request is rejected and no certificate row is published.

3. Try publishing with `due_date < issue_date`.
   - Expected: request is rejected by app validation and DB guardrails.

4. Try publishing against an inactive customer or inactive site.
   - Expected: existing certificates remain visible, but new uploads are blocked.

## Access Checks

1. From a certificate detail page, click `View PDF`.
   - Expected: the PDF opens through `/api/admin/certificates/[id]/signed-url`.

2. Click `Download PDF`.
   - Expected: the PDF downloads with the generated download filename.

3. Confirm the `certificates` bucket remains private and that no public URL is exposed to the browser code.

## Lifecycle Checks

1. Replace:
   - Open an active certificate detail page.
   - Click `Replace certificate`.
   - Upload a new PDF.
   - Expected:
     - a new certificate row is published
     - the old row becomes `replaced`
     - the old row stores `replaced_by_document_id`
     - both rows remain visible in admin history

2. Void:
   - Void an active certificate.
   - Expected: status becomes `void` and the file remains available to admins.

3. Archive:
   - Archive an active certificate.
   - Expected: status becomes `archived` and the file remains available to admins.

4. Audit:
   - Confirm new `audit_logs` rows exist for:
     - `certificate_uploaded`
     - `certificate_published`
     - `certificate_viewed_admin`
     - `certificate_downloaded_admin`
     - `certificate_replaced`
     - `certificate_voided`
     - `certificate_archived`

## Regression Checks

1. Confirm `/admin/certificates`, `/admin/customers/[id]/certificates`, and `/admin/customers/[id]/sites/[siteId]/certificates` render and filter correctly.
2. Confirm the customer/site detail pages link into the new certificate areas.
3. Confirm `src/app/portal/certificates/page.tsx` is still not implemented as a customer dashboard in Phase 5.
4. Run:
   - `npm run lint`
   - `npm run build`
