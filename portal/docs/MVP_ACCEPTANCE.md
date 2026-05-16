# MVP acceptance checklist (Phase 8)

**Review date:** 2026-05-16  
**Verdict:** Ready for **Oakrange stakeholder review** on staging. Production deployment after stakeholder sign-off and production Supabase/Vercel configuration.

Legend: **Pass** | **Partial** | **Fail** | **Not tested**

| Area | Status | Notes |
|------|--------|-------|
| Admin login and dashboard | Pass | Auth + dashboard with stats, recent customers/users/certs |
| Customer/company management | Pass | Phase 4–5 admin CRUD |
| Site management | Pass | Per-customer sites |
| User management | Pass | Admin create/edit/deactivate |
| User access assignment | Pass | Company-wide and site-level grants |
| Certificate upload workflows | Pass | Upload, publish, replace, void, archive |
| Display/download filename generation | Pass | `display_title`, `download_file_name` |
| Private PDF storage | Pass | Private bucket; no public URLs |
| Admin PDF view/download | Pass | Signed URL + audit |
| Customer dashboard | Pass | Latest certs, stats, site summaries |
| Customer certificate list | Pass | Newest first, filters, expiry badges |
| Site manager multi-site access | Pass | Phase 6 RLS + UI filters |
| Customer PDF view/download | Pass | RLS-first signed URL + audit |
| Audit logs | Pass | Admin list/detail, immutability migration |
| RLS/security | Pass | `test:rls` + Phase 6 visibility tests (when env + server up) |
| Responsive UI | Partial | Tailwind responsive layouts; limited device matrix in automation |
| Build/lint/tests | Pass | `lint`, `build`, `test:security` pass; runtime tests need dev server |
| Deployment readiness | Partial | Docs + `.env.example`; Vercel/Supabase config is environment-specific |

## Automated verification (run locally)

```bash
cd portal
npm run lint
npm run build
npm run test:security
npm run dev   # separate terminal
npm run test:rls
npm run test:phase6
npm run test:phase7
```

## Out of scope (MVP)

Bulk upload, notifications, QR integration, OCR, tool-level tracking, customer-side user management.

## Known limitations

- Audit log text search filters within the current page of results.
- Admin certificate list paginated (50 per page); very large filters may need narrower criteria.
- Demo seed script documents approach; full matrix uses Phase 6 test data names.
- `supabase db push` requires CLI link; migrations can be applied via SQL Editor.

## Related reports

- [phase6-runtime-acceptance-report.md](phase6-runtime-acceptance-report.md)
- [phase7-audit-verification.md](phase7-audit-verification.md)
