# Security model

## Authentication

- Supabase Auth with email/password.
- Middleware and server layouts enforce session on `/admin/*` and `/portal/*`.
- Logged-out users are redirected to `/login`.
- Inactive profiles → `/account-disabled`.
- Auth user without profile → `/access-pending`.
- Portal users (customer_user, site_manager) cannot access admin routes; admins use `/admin/*`.

## Authorization (RLS)

Row Level Security on Postgres tables is the source of truth for data access.

### Certificates (customers)

Customers see only rows where:

- `published_at` is set
- `status = active`
- Company grant: all company certificates including company-level (`site_id` null)
- Site grant: assigned sites only — **no** company-level documents by default
- Void, replaced, archived, and draft certificates are hidden from customers
- Expired certificates remain visible with an **Expired** label (display only)

### Certificates (admin)

`oakrange_admin` can manage all certificate records and statuses via admin UI and RLS policies.

### Audit logs

- Readable by admin only.
- `UPDATE` and `DELETE` revoked from `authenticated` (append-only via app).
- Metadata sanitized: no storage paths, signed URLs, passwords, or tokens.

## PDF access

1. Private `certificates` bucket (not public).
2. Client never receives permanent storage URLs.
3. User requests `/api/.../signed-url` with session cookie.
4. Server verifies access with **user session** (RLS query) first.
5. Only then **service role** creates a short-lived signed URL (60s admin, 120s portal).
6. View/download events written to `audit_logs`.
7. Customers cannot request signed URLs for certificates outside RLS scope.

## Service role key

- `SUPABASE_SERVICE_ROLE_KEY` is server-only (`server-only` module).
- Used for: signed URLs after checks, auth admin APIs for user provisioning, test/seed scripts.
- Never exposed via `NEXT_PUBLIC_*` or client bundles.

## Upload limits

- PDF only, max 20 MB (`CERTIFICATE_MAX_FILE_SIZE_BYTES`).
- Validation on admin upload API.

## What we do not store in audit metadata

- `storage_path`, `signed_url`, passwords, tokens, service keys
