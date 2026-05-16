/**
 * Phase 6 login/routing checks via HTTP + session cookies.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.PHASE6_BASE_URL ?? "http://127.0.0.1:3000";

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
const manifest = JSON.parse(readFileSync(resolve(__dirname, "../.phase6-test-manifest.json"), "utf8"));

const results = [];
const pass = (id, d = "") => { results.push({ id, status: "PASS", detail: d }); console.log(`PASS  ${id}${d ? ` — ${d}` : ""}`); };
const fail = (id, d = "") => { results.push({ id, status: "FAIL", detail: d }); console.error(`FAIL  ${id}${d ? ` — ${d}` : ""}`); };

async function signIn(email) {
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: manifest.password });
  if (error) throw error;
  return client;
}

async function fetchPath(client, path, { manual = true } = {}) {
  const { data: { session } } = await client.auth.getSession();
  const ref = new URL(url).hostname.split(".")[0];
  const headers = {};
  if (session) {
    headers.Cookie = `sb-${ref}-auth-token=${encodeURIComponent(JSON.stringify(session))}`;
  }
  const res = await fetch(`${BASE}${path}`, { redirect: manual ? "manual" : "follow", headers });
  const location = res.headers.get("location") ?? "";
  const body = manual ? "" : await res.text();
  return { status: res.status, location, body, url: res.url };
}

async function main() {
  console.log("Phase 6 routing verification\n");

  const anonPortal = await fetch(`${BASE}/portal/dashboard`, { redirect: "manual" });
  if (anonPortal.status === 307 || anonPortal.status === 302) {
    const loc = anonPortal.headers.get("location") ?? "";
    if (loc.includes("/login")) pass("logged-out-portal-redirect");
    else fail("logged-out-portal-redirect", loc);
  } else fail("logged-out-portal-redirect", `HTTP ${anonPortal.status}`);

  const anonAdmin = await fetch(`${BASE}/admin/dashboard`, { redirect: "manual" });
  const adminLoc = anonAdmin.headers.get("location") ?? "";
  if (adminLoc.includes("/login")) pass("logged-out-admin-redirect");
  else fail("logged-out-admin-redirect", adminLoc);

  const admin = await signIn("admin@oakrange-test.co.uk");
  const adminDash = await fetchPath(admin, "/admin/dashboard", { manual: false });
  if (adminDash.url.includes("/admin/dashboard") && adminDash.body.includes("Dashboard")) pass("admin-lands-admin-dashboard");
  else fail("admin-lands-admin-dashboard", adminDash.url);

  const company = await signIn("alpha.company@oakrange-test.co.uk");
  const portalDash = await fetchPath(company, "/portal/dashboard", { manual: false });
  if (portalDash.url.includes("/portal/dashboard") && portalDash.body.includes("Latest certificates")) {
    pass("company-customer-portal-dashboard");
  } else fail("company-customer-portal-dashboard", portalDash.url);

  const storageLeak =
    /random-[0-9a-f-]+\.pdf/i.test(portalDash.body) ||
    /certificates\/[0-9a-f-]{36}\/(company|[0-9a-f-]{36})\/[0-9a-f-]{36}\.pdf/i.test(portalDash.body);
  if (!storageLeak) pass("dashboard-no-storage-leak");
  else fail("dashboard-no-storage-leak");

  const site1 = await signIn("alpha.site1@oakrange-test.co.uk");
  const site1Dash = await fetchPath(site1, "/portal/dashboard", { manual: false });
  if (site1Dash.url.includes("/portal/dashboard")) pass("site-customer-portal-dashboard");
  else fail("site-customer-portal-dashboard");

  const manager = await signIn("alpha.manager@oakrange-test.co.uk");
  const mgrDash = await fetchPath(manager, "/portal/dashboard", { manual: false });
  if (mgrDash.url.includes("/portal/dashboard") && mgrDash.body.includes("Your sites")) {
    pass("manager-portal-dashboard-sites");
  } else fail("manager-portal-dashboard-sites");

  const beta = await signIn("beta.customer@oakrange-test.co.uk");
  const betaDash = await fetchPath(beta, "/portal/dashboard", { manual: false });
  if (betaDash.url.includes("/portal/dashboard")) pass("beta-customer-portal-dashboard");
  else fail("beta-customer-portal-dashboard");

  const inactive = await signIn("inactive@oakrange-test.co.uk");
  const inactiveRes = await fetchPath(inactive, "/portal/dashboard", { manual: true });
  if (inactiveRes.location.includes("/account-disabled")) pass("inactive-blocked");
  else fail("inactive-blocked", inactiveRes.location || `HTTP ${inactiveRes.status}`);

  const noprofile = await signIn("noprofile@oakrange-test.co.uk");
  const pendingRes = await fetchPath(noprofile, "/portal/dashboard", { manual: true });
  if (pendingRes.location.includes("/access-pending")) pass("noprofile-access-pending");
  else fail("noprofile-access-pending", pendingRes.location || `HTTP ${pendingRes.status}`);

  const customerAdmin = await fetchPath(company, "/admin/dashboard", { manual: true });
  if (customerAdmin.location.includes("/portal/dashboard")) pass("customer-blocked-from-admin");
  else fail("customer-blocked-from-admin", customerAdmin.location);

  const managerAdmin = await fetchPath(manager, "/admin/dashboard", { manual: true });
  if (managerAdmin.location.includes("/portal/dashboard")) pass("manager-blocked-from-admin");
  else fail("manager-blocked-from-admin", managerAdmin.location);

  const certId = manifest.certificates["alpha-site1-active"];
  const detail = await fetchPath(company, `/portal/certificates/${certId}`, { manual: false });
  if (detail.body.includes("P6 Alpha Site 1 Active") && detail.body.includes("View PDF")) pass("detail-page-authorized");
  else fail("detail-page-authorized");

  const betaId = manifest.certificates["beta-site1-active"];
  const badDetail = await fetchPath(company, `/portal/certificates/${betaId}`, { manual: false });
  if (badDetail.status === 404 || badDetail.body.includes("Document unavailable") || badDetail.body.includes("not-found")) {
    pass("detail-page-unauthorized");
  } else fail("detail-page-unauthorized", `HTTP ${badDetail.status}`);

  const list = await fetchPath(company, "/portal/certificates", { manual: false });
  if (list.body.includes("P6 Alpha Site 1 Active") && !list.body.includes("P6 Beta")) pass("cert-list-scope");
  else fail("cert-list-scope");

  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`\n${results.length} routing checks: ${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
