# Environment variables

Copy `portal/.env.example` to `portal/.env.local`. Never commit `.env.local` or real secrets.

## Required (local and production)

| Variable | Where used | Notes |
|----------|--------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server | Public anon key; RLS enforced |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Signed URLs after access checks; admin user provisioning |

## Optional

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Server scripts (`test:rls`, seed scripts). Defaults to `NEXT_PUBLIC_SUPABASE_URL`. |
| `PHASE6_BASE_URL` / `PHASE7_BASE_URL` | Base URL for runtime tests (default `http://127.0.0.1:3000`) |
| `REQUIRE_RLS_TESTS=1` | Fail instead of skip when Supabase env is missing (CI) |

## Security rules

- Never prefix the service role key with `NEXT_PUBLIC_`.
- Never embed the service role key in client components or client bundles.
- Do not log env values in application or audit metadata.

## Vercel

Add the same variables in the Vercel project settings for **Production** and **Preview**. The service role key must only be available to server-side functions.
