# Deployment

## Supabase

1. Create a Supabase project (EU region recommended for UK customers).
2. Run all SQL files in `portal/supabase/migrations/` in order via the **SQL Editor** (or link CLI with `supabase link` if preferred).
3. Confirm the `certificates` storage bucket exists and is **private** (migration should create it).
4. Under **Authentication → URL configuration**, set:
   - **Site URL**: your production app URL (e.g. `https://portal.oakrange.co.uk`)
   - **Redirect URLs**: include  
     `https://<your-domain>/auth/callback`  
     `http://localhost:3000/auth/callback` (for local dev)

5. **Password reset**: ensure redirect URLs include  
   `https://<your-domain>/reset-password`  
   `http://localhost:3000/reset-password`

## Vercel

1. Import the repository; set **Root Directory** to `portal` (or deploy from repo root using root `package.json` scripts).
2. Framework preset: **Next.js**.
3. Add environment variables from [ENVIRONMENT.md](ENVIRONMENT.md).
4. Deploy. Verify `npm run build` succeeds in the build log.

## First admin user

1. In Supabase **Authentication → Users**, create a user with the admin email.
2. In **Table Editor → profiles**, set `role` to `oakrange_admin` and `is_active` to true for that user’s row (profile may be created by trigger on signup).
3. Sign in at `/login` — you should land on `/admin/dashboard`.

Alternatively use an existing bootstrap script if your project provides one (`npm run ensure:test-users` creates **test** accounts only).

## Post-deploy checks

- Logged-out user cannot open `/admin/*` or `/portal/*` (redirects to login).
- Customer can view only published active certificates per RLS.
- PDF links go through `/api/.../signed-url` and expire quickly.
- Audit log page loads for admin only.

## Staging vs production

Use separate Supabase projects for staging and production. Use different Vercel environments with matching env vars. Do not point staging at production data.
