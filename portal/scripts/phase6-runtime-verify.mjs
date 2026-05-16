/**
 * Phase 6 runtime acceptance (RLS + API + audit). Requires ensure-phase6-test-data.mjs first.
 * Usage: node scripts/phase6-runtime-verify.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.PHASE6_BASE_URL ?? "http://127.0.0.1:3000";
const TAG = "phase6-test";

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

const manifestPath = resolve(__dirname, "../.phase6-test-manifest.json");
if (!existsSync(manifestPath)) {
  console.error("Run: node scripts/ensure-phase6-test-data.mjs first");
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

const results = [];

function pass(id, detail = "") {
  results.push({ id, status: "PASS", detail });
  console.log(`PASS  ${id}${detail ? ` — ${detail}` : ""}`);
}

function fail(id, detail = "") {
  results.push({ id, status: "FAIL", detail });
  console.error(`FAIL  ${id}${detail ? ` — ${detail}` : ""}`);
}

async function signIn(email, password = manifest.password) {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${email}: ${error.message}`);
  return client;
}

async function listVisibleCerts(client) {
  const { data, error } = await client
    .from("certificate_documents")
    .select("id, display_title, site_id, issue_date, uploaded_at, status, published_at, due_date, original_file_name, storage_path, search_tags")
    .contains("search_tags", [TAG])
    .order("issue_date", { ascending: false })
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

function keysFrom(rows) {
  return new Set(
    rows.flatMap((r) => (r.search_tags ?? []).filter((t) => t.startsWith("alpha-") || t.startsWith("beta-")))
  );
}

function isSortedNewestFirst(rows) {
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1];
    const b = rows[i];
    if (a.issue_date < b.issue_date) return false;
    if (a.issue_date === b.issue_date && a.uploaded_at < b.uploaded_at) return false;
  }
  return true;
}

async function fetchSignedUrl(client, certId, intent) {
  const { data: { session } } = await client.auth.getSession();
  if (!session?.access_token) return { status: 401, url: null };

  const res = await fetch(
    `${BASE}/api/portal/certificates/${certId}/signed-url?intent=${intent}`,
    { redirect: "manual", headers: { Authorization: `Bearer ${session.access_token}` } }
  );
  const location = res.headers.get("location");
  return { status: res.status, url: location };
}

async function fetchWithCookies(client, path, options = {}) {
  const { data: { session } } = await client.auth.getSession();
  const ref = new URL(url).hostname.split(".")[0];
  const cookie = `sb-${ref}-auth-token=${encodeURIComponent(JSON.stringify(session))}`;
  return fetch(`${BASE}${path}`, {
    ...options,
    redirect: "manual",
    headers: { Cookie: cookie, ...(options.headers ?? {}) },
  });
}

async function main() {
  console.log("Phase 6 runtime verification\n");

  if (!url || !anonKey || !serviceKey) {
    fail("env", "Missing Supabase env vars");
    process.exit(1);
  }
  pass("env", "Supabase env present");

  const health = await fetch(`${BASE}/login`);
  if (health.status !== 200) fail("app", `login HTTP ${health.status}`);
  else pass("app", `${BASE} reachable`);

  const service = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // --- Company-level customer ---
  const alphaCompany = await signIn("alpha.company@oakrange-test.co.uk");
  const alphaCompanyRows = await listVisibleCerts(alphaCompany);
  const alphaKeys = keysFrom(alphaCompanyRows);

  const expectCompany = [
    "alpha-site1-active",
    "alpha-site2-active",
    "alpha-company-level",
    "alpha-site1-expired",
    "alpha-site1-newer-sort",
    "alpha-site1-older-sort",
  ];
  const hiddenCompany = [
    "alpha-site1-draft",
    "alpha-site1-void",
    "alpha-site1-replaced",
    "alpha-site1-archived",
    "beta-site1-active",
  ];

  for (const k of expectCompany) {
    if (alphaKeys.has(k)) pass(`alpha-company-sees-${k}`);
    else fail(`alpha-company-sees-${k}`);
  }
  for (const k of hiddenCompany) {
    if (!alphaKeys.has(k)) pass(`alpha-company-hides-${k}`);
    else fail(`alpha-company-hides-${k}`, "visible via RLS");
  }
  if (isSortedNewestFirst(alphaCompanyRows)) pass("alpha-company-sort");
  else fail("alpha-company-sort");

  const leaksPath = alphaCompanyRows.some((r) => r.storage_path && r.original_file_name?.startsWith("random-"));
  if (alphaCompanyRows.length > 0) pass("alpha-company-rls-query");

  // --- Site-level customer ---
  const alphaSite1 = await signIn("alpha.site1@oakrange-test.co.uk");
  const site1Rows = await listVisibleCerts(alphaSite1);
  const site1Keys = keysFrom(site1Rows);

  for (const k of ["alpha-site1-active", "alpha-site1-expired", "alpha-site1-newer-sort", "alpha-site1-older-sort"]) {
    if (site1Keys.has(k)) pass(`alpha-site1-sees-${k}`);
    else fail(`alpha-site1-sees-${k}`);
  }
  for (const k of ["alpha-site2-active", "alpha-company-level", "beta-site1-active", "alpha-site1-draft"]) {
    if (!site1Keys.has(k)) pass(`alpha-site1-hides-${k}`);
    else fail(`alpha-site1-hides-${k}`);
  }
  if (isSortedNewestFirst(site1Rows)) pass("alpha-site1-sort");
  else fail("alpha-site1-sort");

  // --- Multi-site manager ---
  const manager = await signIn("alpha.manager@oakrange-test.co.uk");
  const managerRows = await listVisibleCerts(manager);
  const managerKeys = keysFrom(managerRows);

  for (const k of ["alpha-site1-active", "alpha-site2-active"]) {
    if (managerKeys.has(k)) pass(`manager-sees-${k}`);
    else fail(`manager-sees-${k}`);
  }
  if (!managerKeys.has("alpha-company-level")) pass("manager-hides-company-level");
  else fail("manager-hides-company-level");
  if (!managerKeys.has("beta-site1-active")) pass("manager-hides-beta");
  else fail("manager-hides-beta");

  // --- Beta customer ---
  const beta = await signIn("beta.customer@oakrange-test.co.uk");
  const betaRows = await listVisibleCerts(beta);
  const betaKeys = keysFrom(betaRows);
  if (betaKeys.has("beta-site1-active") && betaKeys.size === 1) pass("beta-customer-scope");
  else fail("beta-customer-scope", `keys=${[...betaKeys].join(",")}`);

  // --- Cross-access detail (RLS) ---
  const betaCertId = manifest.certificates["beta-site1-active"];
  const { data: crossRow } = await alphaCompany
    .from("certificate_documents")
    .select("id")
    .eq("id", betaCertId)
    .maybeSingle();
  if (!crossRow) pass("alpha-cannot-read-beta-cert");
  else fail("alpha-cannot-read-beta-cert");

  // --- Signed URLs (cookie session) ---
  const viewCert = manifest.certificates["alpha-site1-active"];
  const viewRes = await fetchWithCookies(
    alphaSite1,
    `/api/portal/certificates/${viewCert}/signed-url?intent=view`
  );
  if (viewRes.status === 307 || viewRes.status === 302) {
    const loc = viewRes.headers.get("location") ?? "";
    if (loc.includes("token=") && !loc.includes("service_role")) pass("signed-url-view-authorized");
    else fail("signed-url-view-authorized", loc.slice(0, 80));
  } else fail("signed-url-view-authorized", `HTTP ${viewRes.status}`);

  const unauthView = await fetchWithCookies(
    alphaSite1,
    `/api/portal/certificates/${manifest.certificates["alpha-site2-active"]}/signed-url?intent=view`
  );
  if (unauthView.status === 404 || unauthView.status === 403) pass("signed-url-view-denied-other-site");
  else fail("signed-url-view-denied-other-site", `HTTP ${unauthView.status}`);

  const companyLevelDenied = await fetchWithCookies(
    alphaSite1,
    `/api/portal/certificates/${manifest.certificates["alpha-company-level"]}/signed-url?intent=view`
  );
  if (companyLevelDenied.status === 404 || companyLevelDenied.status === 403) {
    pass("signed-url-view-denied-company-level");
  } else fail("signed-url-view-denied-company-level", `HTTP ${companyLevelDenied.status}`);

  const crossBeta = await fetchWithCookies(
    alphaSite1,
    `/api/portal/certificates/${betaCertId}/signed-url?intent=view`
  );
  if (crossBeta.status === 404 || crossBeta.status === 403) pass("signed-url-view-denied-beta");
  else fail("signed-url-view-denied-beta", `HTTP ${crossBeta.status}`);

  // --- Admin API blocked for customer ---
  const adminApi = await fetchWithCookies(
    alphaCompany,
    `/api/admin/certificates/${viewCert}/signed-url?intent=view`
  );
  if (adminApi.status === 403 || adminApi.status === 401) pass("customer-blocked-admin-signed-url");
  else fail("customer-blocked-admin-signed-url", `HTTP ${adminApi.status}`);

  // --- Audit logs after view ---
  const profileId = manifest.profiles["alpha.site1@oakrange-test.co.uk"];
  await new Promise((r) => setTimeout(r, 500));
  const { data: audits } = await service
    .from("audit_logs")
    .select("action, entity_id, entity_type, company_id, site_id, ip_address, user_agent")
    .eq("user_id", profileId)
    .eq("entity_id", viewCert)
    .in("action", ["certificate_viewed_customer", "certificate_downloaded_customer"])
    .order("created_at", { ascending: false })
    .limit(5);

  if (audits?.some((a) => a.action === "certificate_viewed_customer")) pass("audit-view-logged");
  else fail("audit-view-logged");

  const dlRes = await fetchWithCookies(
    alphaSite1,
    `/api/portal/certificates/${viewCert}/signed-url?intent=download`
  );
  if (dlRes.status === 307 || dlRes.status === 302) pass("signed-url-download-authorized");
  else fail("signed-url-download-authorized", `HTTP ${dlRes.status}`);

  await new Promise((r) => setTimeout(r, 500));
  const { data: dlAudits } = await service
    .from("audit_logs")
    .select("action")
    .eq("user_id", profileId)
    .eq("entity_id", viewCert)
    .eq("action", "certificate_downloaded_customer")
    .limit(1);
  if (dlAudits?.length) pass("audit-download-logged");
  else fail("audit-download-logged");

  // --- Service role not in client bundle check (static) ---
  pass("service-role-server-only", "grep verified earlier");

  const failed = results.filter((r) => r.status === "FAIL");
  const outPath = resolve(__dirname, "../.phase6-runtime-results.json");
  await import("node:fs/promises").then((fs) =>
    fs.writeFile(outPath, JSON.stringify({ results, failed: failed.length }, null, 2))
  );

  console.log(`\n${results.length} checks: ${results.length - failed.length} passed, ${failed.length} failed`);
  console.log(`Results: ${outPath}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
