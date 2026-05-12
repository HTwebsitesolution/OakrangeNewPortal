/**
 * Creates Phase 3 test Auth users + aligns public.profiles (requires service role).
 *
 * Prerequisites:
 * - NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
 * - SUPABASE_SERVICE_ROLE_KEY in .env.local (never commit this file)
 * - Phase 2 migrations applied (companies, profiles, handle_new_user trigger)
 *
 * Usage (from portal/):
 *   npm run ensure:test-users
 *
 * Default password for all three (change after first login):
 *   Oakrange-Test-2026-Phase3!
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TEST_PASSWORD = "Oakrange-Test-2026-Phase3!";
const TEST_COMPANY_NAME = "Oakrange Test Customer";

const USERS = [
  {
    email: "admin@oakrange-test.co.uk",
    role: "oakrange_admin",
    companyId: null,
  },
  {
    email: "manager@oakrange-test.co.uk",
    role: "site_manager",
    companyId: "assign", // filled after company exists
  },
  {
    email: "customer@oakrange-test.co.uk",
    role: "customer_user",
    companyId: "assign",
  },
];

function loadEnvFile() {
  const envPath = resolve(__dirname, "..", ".env.local");
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    // Always apply .env.local so empty env vars from the shell do not block loading.
    process.env[key] = val;
  }
}

loadEnvFile();

const url =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (!url || !serviceKey) {
  fail(
    "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY. Add them to portal/.env.local"
  );
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findAuthUserByEmail(email) {
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function ensureAuthUser(email) {
  const existing = await findAuthUserByEmail(email);
  if (existing) {
    console.log(`Auth user already exists: ${email}`);
    return existing;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  console.log(`Created Auth user: ${email}`);
  return data.user;
}

async function waitForProfile(authUserId, email, attempts = 10) {
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await admin
      .from("profiles")
      .select("id, email")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(
    `No profiles row for ${email} after signup. Check handle_new_user trigger on auth.users.`
  );
}

async function ensureTestCompany() {
  const { data: existing, error: selErr } = await admin
    .from("companies")
    .select("id")
    .eq("company_name", TEST_COMPANY_NAME)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing?.id) {
    console.log(`Using existing company: ${TEST_COMPANY_NAME} (${existing.id})`);
    return existing.id;
  }
  const { data, error } = await admin
    .from("companies")
    .insert({ company_name: TEST_COMPANY_NAME })
    .select("id")
    .single();
  if (error) throw error;
  console.log(`Created company: ${TEST_COMPANY_NAME} (${data.id})`);
  return data.id;
}

async function main() {
  const companyId = await ensureTestCompany();

  for (const spec of USERS) {
    const user = await ensureAuthUser(spec.email);
    await waitForProfile(user.id, spec.email);

    const company_id =
      spec.companyId === "assign" ? companyId : spec.companyId;

    const { error: upErr } = await admin
      .from("profiles")
      .update({
        role: spec.role,
        company_id,
        is_active: true,
        email: spec.email,
      })
      .eq("auth_user_id", user.id);

    if (upErr) throw upErr;
    console.log(
      `Updated profile: ${spec.email} → role=${spec.role}, company_id=${company_id ?? "null"}`
    );
  }

  console.log("\nDone. Sign in at /login with:");
  console.log(`  ${USERS[0].email} / ${USERS[1].email} / ${USERS[2].email}`);
  console.log(`  Password (all): ${TEST_PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
