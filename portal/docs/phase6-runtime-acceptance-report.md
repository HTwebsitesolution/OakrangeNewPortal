# Phase 6 Runtime Acceptance Report

**Date:** 2026-05-16  
**Environment:** Local (`http://127.0.0.1:3000`), Supabase project from `portal/.env.local`  
**Verdict:** **Phase 6 accepted** — all critical tests passed. Safe to plan Phase 7.

---

## 1. Environment and build

| Check | Result |
|-------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Present |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Present |
| `SUPABASE_SERVICE_ROLE_KEY` | Present (server only) |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| Portal API route compiles | `/api/portal/certificates/[id]/signed-url` in build output |
| Service role in client bundle | **PASS** — `SUPABASE_SERVICE_ROLE_KEY` not present in `.next` static output; `createServiceRoleClient` only in server-only modules |

---

## 2. Test data

Seeded via `node scripts/ensure-phase6-test-data.mjs` (idempotent, tagged `phase6-test`).

**Companies:** Test Alpha Transport Ltd, Test Beta Engineering Ltd  
**Sites:** Alpha Site 1, Alpha Site 2, Beta Site 1  

**Users** (password: `Oakrange-Test-2026-Phase3!`):

| Email | Role | Access |
|-------|------|--------|
| admin@oakrange-test.co.uk | oakrange_admin | — |
| alpha.company@oakrange-test.co.uk | customer_user | Company-wide (Alpha) |
| alpha.site1@oakrange-test.co.uk | customer_user | Alpha Site 1 only |
| alpha.manager@oakrange-test.co.uk | site_manager | Alpha Site 1 + 2 |
| beta.customer@oakrange-test.co.uk | customer_user | Company-wide (Beta) |
| inactive@oakrange-test.co.uk | customer_user | Inactive profile |
| noprofile@oakrange-test.co.uk | — | Auth user, profile deleted |

**Certificates (Company A):** published active (site 1, site 2, company-level), expired active, draft, void, replaced, archived, sort pair (same issue_date, different `uploaded_at`).  
**Certificates (Company B):** published active (Beta Site 1).  
All have PDFs in private `certificates` bucket.

Manifest: `portal/.phase6-test-manifest.json`

---

## 3. Role login and routing

| # | Test | Result |
|---|------|--------|
| 1 | Logged-out → `/portal/dashboard` | PASS → `/login` |
| 2 | Logged-out → `/admin/dashboard` | PASS → `/login` |
| 3 | Admin login | PASS → `/admin/dashboard` |
| 4 | Company-level customer | PASS → `/portal/dashboard` |
| 5 | Site-level customer | PASS → `/portal/dashboard` |
| 6 | Site manager | PASS → `/portal/dashboard` |
| 7 | Company B customer | PASS → `/portal/dashboard` |
| 8 | Inactive user | PASS → `/account-disabled` (after auth) |
| 9 | No-profile user | PASS → `/access-pending` |
| 10 | Customer → `/admin/dashboard` | PASS → redirected to `/portal/dashboard` |
| 11 | Site manager → `/admin/dashboard` | PASS → redirected to `/portal/dashboard` |

---

## 4. Certificate visibility (RLS)

| Persona | Expected scope | Result |
|---------|----------------|--------|
| Alpha company-level | All Alpha published active + company-level; no draft/void/replaced/archived/Beta | **PASS** |
| Alpha site-level (Site 1) | Site 1 only; no Site 2, company-level, Beta, hidden statuses | **PASS** |
| Alpha site manager | Site 1 + Site 2; no company-level, Beta, hidden statuses | **PASS** |
| Beta company-level | Beta cert only | **PASS** |
| Sort order | `issue_date DESC`, `uploaded_at DESC` | **PASS** |

---

## 5. Customer dashboard

| Check | Result |
|-------|--------|
| Dashboard loads | PASS |
| Latest certificates section | PASS |
| No `random-*.pdf` or storage path in HTML | PASS |
| Site manager “Your sites” section | PASS |

---

## 6. Certificate list and filters

| Check | Result |
|-------|--------|
| List loads with authorised rows only | PASS |
| No Beta rows for Alpha company user | PASS |
| Default sort newest first | PASS (RLS script) |

*Note:* Search/filter UI exercised indirectly via RLS list queries; full filter matrix not automated in this pass.

---

## 7. Certificate detail

| Check | Result |
|-------|--------|
| Authorised detail shows title, dates, View/Download PDF | PASS |
| Unauthorised detail (cross-company ID) | PASS — not found / unavailable messaging |
| No storage path or random filename in HTML | PASS |

---

## 8. PDF signed URLs

| Check | Result |
|-------|--------|
| Authorised view → 302/307 signed URL with `token=` | PASS |
| Authorised download | PASS |
| Denied: other site (site-level user) | PASS → 404 |
| Denied: company-level cert (site-level user) | PASS → 404 |
| Denied: Beta cert (Alpha user) | PASS → 404 |
| Customer blocked from admin signed URL API | PASS → 403 |
| TTL | 120 seconds (`SIGNED_URL_TTL_SECONDS`) |

---

## 9. Audit logs

| Check | Result |
|-------|--------|
| `certificate_viewed_customer` after view | PASS |
| `certificate_downloaded_customer` after download | PASS |
| Includes `user_id`, `entity_type`, `entity_id`, `company_id` | PASS |
| Unauthorised attempts do not log success view/download | PASS (404, no row) |

---

## 10. Security regression

| Check | Result |
|-------|--------|
| Portal users cannot use admin signed URL API | PASS |
| Draft/void/replaced/archived hidden via RLS | PASS |
| Cross-company RLS read blocked | PASS |
| Service role server-only | PASS |

---

## Tests run (automated)

```bash
cd portal
npm run lint
npm run build
node scripts/ensure-phase6-test-data.mjs
node scripts/phase6-runtime-verify.mjs    # 39 checks
node scripts/phase6-routing-verify.mjs      # 15 checks
```

**Total automated checks:** 54 passed, 0 failed (after fixes below).

---

## Bugs found and fixes

| Issue | Fix |
|-------|-----|
| `inactive@oakrange-test.co.uk` could not sign in (stale password) | `ensure-phase6-test-data.mjs` now resets password on existing auth users |
| Acceptance script false positive on `/portal/certificates/{id}` links | Tightened storage-path leak regex in `phase6-routing-verify.mjs` |

No application code changes were required for Phase 6 acceptance.

---

## Remaining risks / not fully automated

- **Filter UI** (date ranges, document type dropdown) — not every combination clicked in browser; RLS + list page load verified.
- **Expiring soon counts** on dashboard — logic covered by unit-style RLS data; exact UI counts not manually counted against spreadsheet.
- **Inactive user** — blocked at login UI (`signOut` + `/account-disabled`); middleware also blocks if session existed.
- **Dev server `.next` corruption** — run `npm run dev:clean` after `npm run build` while dev is running (operational, not Phase 6 logic).

---

## Manual test steps (if re-running)

See `portal/docs/phase6-portal-verification.md` and run:

```bash
cd portal
npm run dev:clean
node scripts/ensure-phase6-test-data.mjs
node scripts/phase6-runtime-verify.mjs
node scripts/phase6-routing-verify.mjs
```

Sign in at `/login` with any row from section 2.

---

## Phase 7 readiness

**Phase 6 is accepted.** Critical visibility, routing, signed URL, and audit behaviours pass under real Supabase RLS and local Next.js routes. Proceed to Phase 7 when ready.
