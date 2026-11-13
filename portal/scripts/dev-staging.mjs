/**
 * Run the portal locally against the STAGING Supabase project (portal/.env.staging.local).
 * Usage: npm run dev:staging   (optional: PORT=3100)
 */
import { spawn } from "node:child_process";
import { loadEnvLocal } from "./load-env-local.mjs";

const PRODUCTION_REF = "dptzwrrydxicehgjnbxf";

process.env.PORTAL_ENV_FILE = ".env.staging.local";
if (!loadEnvLocal()) {
  console.error("portal/.env.staging.local not found.");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!url || url.includes(PRODUCTION_REF) || (process.env.SUPABASE_URL ?? "").includes(PRODUCTION_REF)) {
  console.error("Refusing to start: .env.staging.local does not point at a staging project.");
  process.exit(1);
}

const port = process.env.PORT ?? "3100";
console.log(`Starting portal on http://localhost:${port} against ${url}`);
const child = spawn("npx", ["next", "dev", "-p", port], { stdio: "inherit", shell: true, env: process.env });
child.on("exit", (code) => process.exit(code ?? 0));
