# Phase 6 — Customer & site manager portal verification

Manual checks for customer/site manager certificate dashboards. Use test users from Phase 3 when available.

## Preconditions

- Published, active certificates exist for test company/sites.
- At least one draft, void, replaced, and archived certificate exists (must not appear in portal).
- Company-level and site-level `user_site_access` grants configured for test users.

## Manual acceptance tests

1. **Customer login** — Sign in as `customer_user`, land on `/portal/dashboard`.
2. **Site manager login** — Sign in as `site_manager`, land on `/portal/dashboard`.
3. **Authorised certificates only** — Customer sees only certificates allowed by RLS (no other company).
4. **Site manager scope** — Site manager sees only assigned site certificates (not unassigned sites).
5. **Multi-site filter** — Site manager with multiple sites can filter list by site on `/portal/certificates`.
6. **Company-level access** — User with company grant sees all company site certs and company-level (`site_id` null) documents.
7. **Site-level access** — Site-only user does not see company-level documents.
8. **Newest first** — Dashboard latest section and full list sorted by `issue_date` DESC, then `uploaded_at` DESC.
9. **Draft hidden** — Unpublished drafts not listed.
10. **Void hidden** — Void certs not listed.
11. **Replaced hidden** — Replaced certs not listed.
12. **Archived hidden** — Archived certs not listed.
13. **Expired label** — Active cert with past `due_date` shows **Expired** but remains viewable.
14. **View PDF** — View opens via `/api/portal/certificates/[id]/signed-url?intent=view` (short-lived URL).
15. **Download PDF** — Download via `intent=download` with clean filename.
16. **Cross-customer signed URL** — Signed URL for another customer’s cert returns 404 (no existence leak).
17. **No direct storage URL** — Storage bucket not public; only signed URLs work.
18. **No random filename** — UI does not show original storage/random filename.
19. **No storage path** — UI does not show `storage_path`.
20. **Audit** — `certificate_viewed_customer` / `certificate_downloaded_customer` rows in `audit_logs`.
21. **Build** — `npm run lint` and `npm run build` pass.

## Security pattern (required)

1. User session (JWT) → Supabase query with RLS.
2. Row returned → service role creates short-lived signed URL only.
3. Audit log via user session client.

Do **not** fetch certificate lists with service role and filter in application code.
