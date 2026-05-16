/**
 * Optional stakeholder demo seed (realistic company names).
 * Automated tests continue to use: npm run test:phase6:seed
 *
 * Usage: npm run seed:demo
 * Requires portal/.env.local with SUPABASE_SERVICE_ROLE_KEY.
 */
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

console.log(`
Oakrange demo data
==================

For full automated test coverage (RLS, portal, audit), run:
  npm run test:phase6:seed

That creates "Test Alpha Transport Ltd" and related accounts (password: Oakrange-Test-2026-Phase3!).

For stakeholder demos, use existing phase6 companies or create customers manually in Admin.
Planned demo companies (create via Admin if needed):
  - Meridian Logistics Group (multi-site)
  - Harbourview Construction Ltd
  - Oakfield Healthcare Services

Demo portal users should be created in Admin → Users with company/site access grants.
Never use joke names or obvious placeholders in production demo environments.
`);

process.exit(0);
