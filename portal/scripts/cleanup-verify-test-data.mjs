/**
 * Remove Phase 1–4 verification customers and their dedicated test auth users.
 *
 * Usage:
 *   node scripts/cleanup-verify-test-data.mjs          # dry run (default)
 *   node scripts/cleanup-verify-test-data.mjs --execute
 *
 * Requires portal/.env.local with SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const execute = process.argv.includes("--execute");

const VERIFY_COMPANY_NAMES = [
  "Oakrange Verify Customer A",
  "Oakrange Verify Customer B",
];

/** Portal test accounts created only for verify-customer RLS checks. */
const VERIFY_AUTH_EMAILS = [
  "customer@oakrange-test.co.uk",
  "manager@oakrange-test.co.uk",
  "inactive@oakrange-test.co.uk",
  "pending@oakrange-test.co.uk",
];

const CERT_BUCKET = "certificates";

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (!url || !serviceKey) {
  fail("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in portal/.env.local");
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function removeStorage(paths) {
  if (paths.length === 0) return;
  for (let i = 0; i < paths.length; i += 50) {
    const chunk = paths.slice(i, i + 50);
    const { error } = await admin.storage.from(CERT_BUCKET).remove(chunk);
    if (error) console.warn("Storage remove warning:", error.message);
  }
}

async function main() {
  console.log(execute ? "EXECUTE — deleting verify test data\n" : "DRY RUN — pass --execute to delete\n");

  const { data: companies, error: coErr } = await admin
    .from("companies")
    .select("id, company_name, customer_id_readable")
    .in("company_name", VERIFY_COMPANY_NAMES);

  if (coErr) fail(coErr.message);

  if (!companies?.length) {
    console.log("No verify customer companies found (already removed or renamed).");
  } else {
    for (const company of companies) {
      console.log(`Company: ${company.company_name} (${company.customer_id_readable})`);

      const [{ data: certs }, { data: profiles }, { data: sites }] = await Promise.all([
        admin.from("certificate_documents").select("id, storage_path").eq("company_id", company.id),
        admin.from("profiles").select("id, email, role").eq("company_id", company.id),
        admin.from("sites").select("id, site_name").eq("company_id", company.id),
      ]);

      console.log(`  sites: ${(sites ?? []).map((s) => s.site_name).join(", ") || "—"}`);
      console.log(`  profiles: ${(profiles ?? []).map((p) => p.email).join(", ") || "—"}`);
      console.log(`  certificates: ${certs?.length ?? 0}`);

      if (execute) {
        const paths = (certs ?? []).map((c) => c.storage_path).filter(Boolean);
        await removeStorage(paths);

        const { error: delCoErr } = await admin.from("companies").delete().eq("id", company.id);
        if (delCoErr) fail(`Delete ${company.company_name}: ${delCoErr.message}`);
        console.log(`  deleted company ${company.company_name}`);
      }
    }
  }

  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 200 });
  const toDelete = (authUsers?.users ?? []).filter((u) =>
    VERIFY_AUTH_EMAILS.includes((u.email ?? "").toLowerCase())
  );

  if (toDelete.length === 0) {
    console.log("\nNo verify test auth users found.");
  } else {
    console.log("\nAuth users:");
    for (const u of toDelete) {
      console.log(`  ${u.email}`);
      if (execute) {
        const { data: profiles } = await admin
          .from("profiles")
          .select("id")
          .eq("auth_user_id", u.id);
        for (const profile of profiles ?? []) {
          await admin.from("user_site_access").delete().eq("user_id", profile.id);
          await admin.from("audit_logs").delete().eq("user_id", profile.id);
          const { error: profileErr } = await admin.from("profiles").delete().eq("id", profile.id);
          if (profileErr) console.warn(`  profile delete warning (${u.email}):`, profileErr.message);
        }
        const { error } = await admin.auth.admin.deleteUser(u.id);
        if (error) fail(`Delete auth ${u.email}: ${error.message}`);
        console.log(`  deleted auth ${u.email}`);
      }
    }
  }

  if (!execute) {
    console.log("\nDry run complete. Re-run with --execute to apply.");
  } else {
    console.log("\nVerify test data removed.");
    console.log("Kept: Oakrange Test Customer, Test Alpha/Beta, admin@oakrange-test.co.uk");
  }
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
