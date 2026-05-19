/**
 * Bootstrap internal Oakrange admin accounts (Option A).
 *
 * Creates or updates Auth users + profiles with role oakrange_admin and the correct admin_level.
 * Uses the service role key only — run locally or in a secure CI job, never commit passwords.
 *
 * Usage (from portal/):
 *   npm run bootstrap:internal-admins
 *
 * Required in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   BOOTSTRAP_ADMIN_TEMP_PASSWORD  (min 8 chars; share securely, then force reset in production)
 *
 * Optional overrides (defaults match production bootstrap spec):
 *   BOOTSTRAP_SUPER_ADMIN_EMAIL=joseph@htwebsolution.com
 *   BOOTSTRAP_ADMIN_EMAIL_LUKE=luke.priestley@oakrange.co.uk
 *   BOOTSTRAP_ADMIN_EMAIL_OFFICE=info@oakrange.co.uk
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ADMINS = [
  {
    email: (process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL ?? "joseph@htwebsolution.com").toLowerCase(),
    admin_level: "super_admin",
    full_name: "Joseph",
  },
  {
    email: (process.env.BOOTSTRAP_ADMIN_EMAIL_LUKE ?? "luke.priestley@oakrange.co.uk").toLowerCase(),
    admin_level: "admin",
    full_name: "Luke Priestley",
  },
  {
    email: (process.env.BOOTSTRAP_ADMIN_EMAIL_OFFICE ?? "info@oakrange.co.uk").toLowerCase(),
    admin_level: "admin",
    full_name: "Oakrange Office",
  },
];

function loadEnvFile() {
  const envPath = resolve(__dirname, "..", ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvFile();

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const password = process.env.BOOTSTRAP_ADMIN_TEMP_PASSWORD ?? "";

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (!url || !serviceKey) {
  fail(
    "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY in portal/.env.local"
  );
}
if (password.length < 8) {
  fail("Set BOOTSTRAP_ADMIN_TEMP_PASSWORD (min 8 characters) in portal/.env.local before running.");
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
    const found = data.users.find((u) => u.email?.toLowerCase() === email);
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function ensureAuthUser(spec) {
  const existing = await findAuthUserByEmail(spec.email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: spec.full_name },
    });
    if (error) throw error;
    console.log(`Updated Auth user: ${spec.email}`);
    return existing;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: spec.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: spec.full_name },
  });
  if (error) throw error;
  console.log(`Created Auth user: ${spec.email}`);
  return data.user;
}

async function waitForProfile(authUserId, email, attempts = 12) {
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (error) throw error;
    if (data?.id) return data;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`No profiles row for ${email}. Apply migrations and check handle_new_user.`);
}

async function main() {
  console.log("Bootstrapping internal Oakrange admins (Option A)…\n");

  for (const spec of ADMINS) {
    const user = await ensureAuthUser(spec);
    await waitForProfile(user.id, spec.email);

    const { error: upErr } = await admin
      .from("profiles")
      .update({
        email: spec.email,
        full_name: spec.full_name,
        role: "oakrange_admin",
        admin_level: spec.admin_level,
        company_id: null,
        is_active: true,
      })
      .eq("auth_user_id", user.id);

    if (upErr) {
      throw new Error(`${spec.email}: ${upErr.message}`);
    }

    await admin.from("user_site_access").delete().eq("user_id", user.id);

    console.log(`  → ${spec.email} (${spec.admin_level})`);
  }

  console.log("\nDone. Sign in at /login and change passwords immediately in production.");
  console.log("Super Admin:", ADMINS[0].email);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
