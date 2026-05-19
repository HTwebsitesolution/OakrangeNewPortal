# Internal admin bootstrap (Option A)

Oakrange internal staff use `role = oakrange_admin` with an additional `admin_level`:

| Person | Email | `admin_level` |
|--------|--------|----------------|
| Joseph | `joseph@htwebsolution.com` | `super_admin` |
| Luke | `luke.priestley@oakrange.co.uk` | `admin` |
| Office | `info@oakrange.co.uk` | `admin` |

## Prerequisites

1. Apply migration `20260519120000_add_admin_level.sql` (`supabase db push` or deploy migrations on hosted Supabase).
2. Set in `portal/.env.local` (never commit):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `BOOTSTRAP_ADMIN_TEMP_PASSWORD` (min 8 characters)

Optional email overrides: `BOOTSTRAP_SUPER_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_EMAIL_LUKE`, `BOOTSTRAP_ADMIN_EMAIL_OFFICE`.

## Run locally

```bash
cd portal
npm run bootstrap:internal-admins
```

The script is idempotent: it creates or updates Auth users, sets profiles to `oakrange_admin` with the correct `admin_level`, and clears site access rows.

## Production

1. Run migrations on production Supabase first.
2. Run the bootstrap script once from a secure machine with production env vars.
3. Sign in as Joseph (Super Admin) and **change all bootstrap passwords** immediately.
4. Do not commit `BOOTSTRAP_ADMIN_TEMP_PASSWORD` or reuse it across environments.

## Permissions summary

- **Super Admin** — create/edit/deactivate internal admins; assign `super_admin` or `admin`.
- **Admin** — manage customers, sites, certificates, and portal users only; cannot create or edit internal admin accounts.
- **Route gate** — unchanged: any `oakrange_admin` (with `admin_level` set) can access `/admin/*`.

See [USER_ROLES.md](USER_ROLES.md) and [SECURITY_MODEL.md](SECURITY_MODEL.md).
