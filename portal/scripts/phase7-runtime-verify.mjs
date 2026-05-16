/**
 * Phase 7 audit visibility and logging checks.
 * Requires: portal/.env.local, dev server on :3000, npm run test:phase6:seed (optional).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.PHASE7_BASE_URL ?? "http://127.0.0.1:3000";
const PASSWORD = "Oakrange-Test-2026-Phase3!";

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const results = [];
const pass = (id, d = "") => { results.push({ id, status: "PASS", detail: d }); console.log(`PASS  ${id}${d ? ` — ${d}` : ""}`); };
const fail = (id, d = "") => { results.push({ id, status: "FAIL", detail: d }); console.error(`FAIL  ${id}${d ? ` — ${d}` : ""}`); };

async function signIn(email) {
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`${email}: ${error.message}`);
  return client;
}

async function fetchWithSession(client, path, { manual = false } = {}) {
  const { data: { session } } = await client.auth.getSession();
  const ref = new URL(url).hostname.split(".")[0];
  const headers = session
    ? { Cookie: `sb-${ref}-auth-token=${encodeURIComponent(JSON.stringify(session))}` }
    : {};
  const res = await fetch(`${BASE}${path}`, { redirect: manual ? "manual" : "follow", headers });
  const body = manual ? "" : await res.text();
  return { status: res.status, url: res.url, body, location: res.headers.get("location") ?? "" };
}

async function main() {
  console.log("Phase 7 runtime verification\n");
  if (!url || !serviceKey) {
    fail("env");
    process.exit(1);
  }
  pass("env");

  const service = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const admin = await signIn("admin@oakrange-test.co.uk");
  const adminAudit = await fetchWithSession(admin, "/admin/audit-logs");
  if (adminAudit.url.includes("/admin/audit-logs") && adminAudit.body.includes("Audit logs")) {
    pass("admin-audit-page");
  } else fail("admin-audit-page", adminAudit.url);

  const customer = await signIn("alpha.company@oakrange-test.co.uk");
  const customerAudit = await fetchWithSession(customer, "/admin/audit-logs", { manual: true });
  if (customerAudit.location.includes("/portal/dashboard") || customerAudit.url.includes("/portal/")) {
    pass("customer-blocked-audit-page");
  } else fail("customer-blocked-audit-page", customerAudit.location || String(customerAudit.status));

  const manager = await signIn("alpha.manager@oakrange-test.co.uk");
  const managerAudit = await fetchWithSession(manager, "/admin/audit-logs", { manual: true });
  if (managerAudit.location.includes("/portal/dashboard") || managerAudit.url.includes("/portal/")) {
    pass("manager-blocked-audit-page");
  } else fail("manager-blocked-audit-page");

  const { data: logs, error: listErr } = await service
    .from("audit_logs")
    .select("id, action, created_at, metadata_json")
    .order("created_at", { ascending: false })
    .limit(5);
  if (listErr) fail("audit-sort", listErr.message);
  else {
    let sorted = true;
    for (let i = 1; i < (logs ?? []).length; i++) {
      if (logs[i - 1].created_at < logs[i].created_at) sorted = false;
    }
    if (sorted) pass("audit-sort-newest-first");
    else fail("audit-sort-newest-first");
  }

  const manifestPath = resolve(__dirname, "../.phase6-test-manifest.json");
  let certId = null;
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    certId = manifest.certificates?.["alpha-site1-active"];
    if (certId) {
      await fetchWithSession(
        await signIn("alpha.site1@oakrange-test.co.uk"),
        `/api/portal/certificates/${certId}/signed-url?intent=view`,
        { manual: true }
      );
    }
  }

  const { data: filtered } = await service
    .from("audit_logs")
    .select("id")
    .eq("action", "certificate_viewed_customer")
    .order("created_at", { ascending: false })
    .limit(1);
  if ((filtered ?? []).length > 0) pass("audit-filter-action-customer-view");
  else fail("audit-filter-action-customer-view", "no certificate_viewed_customer rows");

  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const companyId = manifest.companies?.alpha;
    if (companyId) {
      const { data: companyLogs } = await service
        .from("audit_logs")
        .select("id")
        .eq("company_id", companyId)
        .limit(1);
      if ((companyLogs ?? []).length > 0) pass("audit-filter-company");
      else fail("audit-filter-company");
    }
  }

  const { data: recentMeta } = await service
    .from("audit_logs")
    .select("metadata_json, action, created_at")
    .in("action", ["certificate_viewed_customer", "certificate_downloaded_customer"])
    .order("created_at", { ascending: false })
    .limit(10);
  const leaky = (recentMeta ?? []).filter((row) => {
    const meta = row.metadata_json ?? {};
    if (meta.storage_path || meta.signed_url || meta.signedUrl) return true;
    const raw = JSON.stringify(meta).toLowerCase();
    return raw.includes("token=");
  });
  if (leaky.length === 0) pass("audit-metadata-no-secrets");
  else fail("audit-metadata-no-secrets", `found ${leaky.length} leaky metadata rows`);

  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`\n${results.length} checks: ${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
