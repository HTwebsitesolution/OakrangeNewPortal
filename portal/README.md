# Oakrange Certificate Portal

Next.js application for Oakrange staff to manage customer certificates and for customers/site managers to view and download published PDFs securely.

## Stack

- **Next.js 15** (App Router) in this `portal/` directory
- **Supabase** — Auth, Postgres with RLS, private `certificates` storage bucket
- **Vercel** — recommended hosting

From the repository root you can run `npm run dev` (proxies to `portal/`).

## Quick start

1. Copy environment file:

   ```bash
   cd portal
   cp .env.example .env.local
   ```

2. Fill in Supabase URL, anon key, and service role key (see [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md)).

3. Apply database migrations in the Supabase SQL Editor (files under `supabase/migrations/`).

4. Create the first admin user (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).

5. Install and run:

   ```bash
   npm install
   npm run dev
   ```

6. Open [http://localhost:3000/login](http://localhost:3000/login).

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | Required environment variables |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel + Supabase setup |
| [docs/TESTING.md](docs/TESTING.md) | Lint, build, and test scripts |
| [docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md) | Auth, RLS, PDF access, audit |
| [docs/USER_ROLES.md](docs/USER_ROLES.md) | Roles and access rules |
| [docs/MVP_ACCEPTANCE.md](docs/MVP_ACCEPTANCE.md) | MVP checklist and Phase 8 status |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test:all` | Lint, build, security, RLS, Phase 6 & 7 (dev server required for runtime tests) |
| `npm run test:phase6:seed` | Idempotent acceptance test data |
| `npm run test:security` | Static security checks |

## MVP scope

In scope: admin customer/site/user management, certificate upload/publish/replace/void/archive, customer portal, site manager multi-site access, private PDFs via short-lived signed URLs, audit logs.

Out of scope for MVP: bulk upload, notifications, QR, OCR, tool-level tracking, customer-side user management.
