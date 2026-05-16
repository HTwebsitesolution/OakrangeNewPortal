# Phase 7 — Audit logging verification

## Preconditions

- `portal/.env.local` configured
- Dev server: `npm run dev:clean`
- Optional seed: `npm run test:phase6:seed`

## Automated

```bash
cd portal
npm run test:phase7
npm run test:phase6
```

## Manual checks

1. Admin opens `/admin/audit-logs` — table loads, newest first.
2. Customer/site manager cannot access `/admin/audit-logs` (redirect to portal).
3. Filter by action `certificate_viewed_customer`.
4. Filter by company.
5. Open `/admin/audit-logs/[id]` — metadata shown, no storage paths or signed URLs.
6. Certificate detail — “Activity on this certificate” section lists view/download events.
7. Customer detail → Audit tab — recent company events + link to filtered audit log.

## RLS immutability

Migration `20260516180000_phase7_audit_immutability.sql` revokes `UPDATE` and `DELETE` on `audit_logs` for `authenticated`. Inserts remain subject to existing insert policy; selects remain admin-only.
