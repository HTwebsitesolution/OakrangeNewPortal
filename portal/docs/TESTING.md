# Testing

All commands run from `portal/` unless noted. From repo root, use `npm run <script> --prefix portal`.

## Prerequisites

- `portal/.env.local` with Supabase URL, anon key, and service role key
- Migrations applied to your Supabase project
- For runtime tests: **one** dev server on port 3000 (`npm run dev` or `npm run dev:clean` if port is stuck). Do not leave a second server on 3001 — pages will load without CSS.
- Phase 9 UI/CSS check (dev server required): `npm run test:phase9:ui`
- If port 3000 is already in use, stop the other process or set `PHASE6_BASE_URL` / `PHASE7_BASE_URL` to match your server (e.g. `http://127.0.0.1:3001`)

## Scripts

| Script | What it checks |
|--------|----------------|
| `npm run lint` | ESLint |
| `npm run build` | Production Next.js build + types |
| `npm run test:security` | Static checks (no service role in client, signed URL TTL, audit sanitization) |
| `npm run test:rls` | Supabase RLS integration (`tests/rls-phase2.mjs`) |
| `npm run test:phase6:seed` | Idempotent Phase 6 test data |
| `npm run test:phase6:runtime` | Portal visibility, signed URLs, sorting (needs dev server) |
| `npm run test:phase6:routing` | Auth redirects and role routing |
| `npm run test:phase6` | Seed + runtime + routing |
| `npm run test:phase7` | Audit log access and metadata (needs dev server) |
| `npm run test:all` | lint → build → security → rls → phase6 → phase7 |

## Test users (Phase 6)

Password: `Oakrange-Test-2026-Phase3!`

| Email | Role |
|-------|------|
| admin@oakrange-test.co.uk | oakrange_admin |
| alpha.company@oakrange-test.co.uk | customer_user (company-wide) |
| alpha.site1@oakrange-test.co.uk | customer_user (site-level) |
| alpha.manager@oakrange-test.co.uk | site_manager |
| beta.customer@oakrange-test.co.uk | customer_user (other company) |

Seed: `npm run test:phase6:seed`

## CI notes

Set `REQUIRE_RLS_TESTS=1` to fail when Supabase env is missing. Runtime tests need a running app (`PHASE6_BASE_URL` / `PHASE7_BASE_URL`).

## Manual QA

See [MVP_ACCEPTANCE.md](MVP_ACCEPTANCE.md) and `docs/phase6-runtime-acceptance-report.md`.
