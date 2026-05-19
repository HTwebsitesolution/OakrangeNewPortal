# User roles

## oakrange_admin

All internal staff share `role = oakrange_admin` and access `/admin/*`. An additional column `admin_level` controls what they can do **to other admins**:

| `admin_level` | Who | Capabilities |
|---------------|-----|----------------|
| `super_admin` | Joseph (`joseph@htwebsolution.com`) | Everything below, plus create/edit/deactivate internal admins and assign levels |
| `admin` | Luke, office, test admin | Customers, sites, portal users, certificates, audit logs, settings — **not** internal admin accounts |

- Full admin area: customers, sites, users, certificates, audit logs, settings.
- Upload, publish, replace, void, and archive certificates.
- View/download any certificate PDF (audited).
- Manage user access grants (company-wide or per-site) for portal users.

Bootstrap: [ADMIN_BOOTSTRAP.md](ADMIN_BOOTSTRAP.md).

## customer_user

- Portal only: dashboard, certificate list, certificate detail, sites (where applicable), account, support.
- Access via `user_site_access`:
  - **Company-wide**: all sites under the company plus company-level documents.
  - **Site-level**: only assigned sites; company-level documents hidden by default.
- Cannot manage users or see admin/internal fields.

## site_manager

- Portal with multi-site visibility for assigned sites.
- Same certificate visibility rules as site-level grants (no company-level docs unless granted company-wide).
- Site filter on dashboard and certificate list when multiple sites apply.

## Access assignment

| Grant type | Sees |
|------------|------|
| Company-wide | All sites + company-level certificates for that company |
| Site-level | That site’s certificates only |

## Certificate visibility (portal)

| Status | Customer sees? |
|--------|----------------|
| Draft (unpublished) | No |
| Active, published | Yes |
| Active, expired (past due_date) | Yes, labelled Expired |
| Void / replaced / archived | No |

Sorting: newest first (`issue_date` desc, `uploaded_at` desc).

## Test accounts

See [TESTING.md](TESTING.md) for Phase 6 seed emails and password.
