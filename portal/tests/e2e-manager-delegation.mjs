/**
 * Browser acceptance test for manager-to-user delegation (Carbodyshops scenario).
 *
 * Runs the real admin and portal UI against the STAGING project:
 *   1. npm run dev:staging            (portal on http://localhost:3100 using .env.staging.local)
 *   2. PORTAL_ENV_FILE=.env.staging.local npm run test:e2e:delegation
 *
 * Fixture rows are left in staging (audit_logs is append-only and references them).
 */
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "../scripts/load-env-local.mjs";

loadEnvLocal();

const BASE = process.env.UI_VERIFY_BASE_URL ?? "http://localhost:3100";
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PRODUCTION_REF = "dptzwrrydxicehgjnbxf";

if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (set PORTAL_ENV_FILE=.env.staging.local).");
  process.exit(1);
}
if (url.includes(PRODUCTION_REF)) {
  console.error("Refusing to run the delegation browser test against production.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const tag = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const password = `E2e-${tag}-Pass1`;
const PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"
);
let passed = 0;

function check(cond, msg) {
  if (!cond) throw new Error(msg);
  passed += 1;
  console.log(`  ok  ${msg}`);
}

async function must(promise, label) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function createCompany(name) {
  return (await must(admin.from("companies").insert({ company_name: `${name} ${tag}` }).select("id, customer_id_readable").single(), name));
}

async function createSite(companyId, name) {
  return (await must(admin.from("sites").insert({ company_id: companyId, site_name: name }).select("id").single(), name)).id;
}

async function createUser(username, role, companyId, fullName, adminLevel = null) {
  const email = `${username.toLowerCase()}@example.com`;
  const created = await must(admin.auth.admin.createUser({ email, password, email_confirm: true }), `auth ${username}`);
  const profile = await must(admin.from("profiles").select("id").eq("auth_user_id", created.user.id).single(), `profile ${username}`);
  await must(
    admin
      .from("profiles")
      .update({ role, company_id: companyId, full_name: fullName, username, is_active: true, ...(adminLevel ? { admin_level: adminLevel } : {}) })
      .eq("id", profile.id)
      .select("id"),
    `profile update ${username}`
  );
  return { id: profile.id, email, username };
}

async function grant(userId, companyId, siteId = null) {
  await must(
    admin.from("user_site_access").insert({ user_id: userId, company_id: companyId, site_id: siteId, access_type: siteId ? "site" : "company" }).select("id"),
    "grant"
  );
}

async function createCert(companyId, siteId, title, issueDate, adminId) {
  const path = `certificates/${companyId}/${siteId ?? "company"}/${tag}-${title.replace(/\W+/g, "-")}.pdf`;
  await must(admin.storage.from("certificates").upload(path, PDF, { contentType: "application/pdf", upsert: true }), `upload ${title}`);
  return (
    await must(
      admin
        .from("certificate_documents")
        .insert({
          company_id: companyId,
          site_id: siteId,
          original_file_name: `${title}.pdf`,
          display_title: title,
          download_file_name: `${title}.pdf`,
          storage_path: path,
          issue_date: issueDate,
          uploaded_by: adminId,
          published_at: new Date().toISOString(),
          status: "active",
          mime_type: "application/pdf",
          file_size_bytes: PDF.length,
        })
        .select("id")
        .single(),
      title
    )
  ).id;
}

async function login(page, identifier) {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  const notice = page.getByRole("button", { name: "Close migration notice" });
  if (await notice.isVisible().catch(() => false)) await notice.click();
  await page.locator("#identifier").fill(identifier);
  await page.locator("#password").fill(password);
  await page.locator("#password").press("Enter");
  await page.waitForURL(/\/(admin|portal)\//, { timeout: 60000 });
  await page.waitForLoadState("networkidle");
}

async function availableCertificates(page) {
  await page.goto(`${BASE}/portal/dashboard`, { waitUntil: "networkidle" });
  const text = await page.locator("main").innerText();
  const m = text.match(/Available certificates\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

async function certificateTitles(page, query = "") {
  await page.goto(`${BASE}/portal/certificates${query}`, { waitUntil: "networkidle" });
  return page.locator("table tbody tr td:first-child a").allInnerTexts();
}

async function main() {
  console.log(`Fixtures (tag ${tag})…`);
  const adminUser = await createUser(`e2eadmin${tag}`, "oakrange_admin", null, "E2E Admin", "admin");
  const manchester = await createCompany("Carbodyshop Manchester");
  const wakefield = await createCompany("Carbodyshop Wakefield");
  const sheffield = await createCompany("Carbodyshop Sheffield");
  const unrelated = await createCompany("Unrelated Motors");
  const manchesterSite = await createSite(manchester.id, "Manchester Bodyshop");
  const wakefieldSite = await createSite(wakefield.id, "Wakefield Bodyshop");
  const sheffieldSite = await createSite(sheffield.id, "Sheffield Bodyshop");
  const unrelatedSite = await createSite(unrelated.id, "Unrelated Depot");

  const staffA = await createUser(`staffa${tag}`, "customer_user", manchester.id, "Staff A Manchester");
  const staffB = await createUser(`staffb${tag}`, "customer_user", wakefield.id, "Staff B Wakefield");
  const staffC = await createUser(`staffc${tag}`, "customer_user", sheffield.id, "Staff C Sheffield");
  const unrelatedUser = await createUser(`unrel${tag}`, "customer_user", unrelated.id, "Unrelated Staff");
  await grant(staffA.id, manchester.id);
  await grant(staffB.id, wakefield.id, wakefieldSite);
  await grant(staffC.id, sheffield.id);
  await grant(unrelatedUser.id, unrelated.id);

  const certs = {
    manchesterCompany: await createCert(manchester.id, null, `Manchester insurance ${tag}`, "2026-01-10", adminUser.id),
    manchesterSite: await createCert(manchester.id, manchesterSite, `Manchester calibration ${tag}`, "2026-03-01", adminUser.id),
    wakefieldSite: await createCert(wakefield.id, wakefieldSite, `Wakefield calibration ${tag}`, "2026-02-01", adminUser.id),
    wakefieldCompany: await createCert(wakefield.id, null, `Wakefield company doc ${tag}`, "2026-02-05", adminUser.id),
    sheffieldSite: await createCert(sheffield.id, sheffieldSite, `Sheffield calibration ${tag}`, "2026-04-01", adminUser.id),
    unrelated: await createCert(unrelated.id, unrelatedSite, `Unrelated calibration ${tag}`, "2026-05-01", adminUser.id),
  };

  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("dialog", (d) => d.accept());

  try {
    console.log("\nTest 1: admin creates Mark as a site manager");
    await login(page, adminUser.email);
    await page.goto(`${BASE}/admin/users/new?mode=existing`, { waitUntil: "networkidle" });
    const markUsername = `mark${tag}`;
    await page.locator("#email").fill(`${markUsername}@example.com`);
    await page.locator("#username").fill(markUsername);
    await page.locator("#full_name").fill("Mark Regional Manager");
    await page.locator("#role").selectOption("site_manager");
    await page.locator('input[role="combobox"]').fill(manchester.customer_id_readable);
    await page.getByRole("option").getByRole("button").first().click();
    await page.locator("#temp_password").fill(password);
    await page.getByRole("button", { name: "Create user" }).click();
    await page.waitForURL(/\/admin\/users\/[0-9a-f-]{36}$/, { timeout: 60000 });
    const markId = page.url().split("/").pop();
    const markProfile = await must(admin.from("profiles").select("role, is_active").eq("id", markId).single(), "mark");
    check(markProfile.role === "site_manager" && markProfile.is_active, "Mark created through Admin → Users → New as an active site manager");

    console.log("\nTests 2-3: search across differently named companies and assign");
    await page.goto(`${BASE}/admin/users/${markId}/edit`, { waitUntil: "networkidle" });
    const searchBox = page.locator("#manager_user_search");
    await searchBox.fill(`Carbodyshop`);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    for (const staff of [staffA, staffB, staffC]) {
      await page.getByText(staff.username, { exact: true }).waitFor({ timeout: 30000 });
    }
    check(true, "Searching 'Carbodyshop' finds Staff A, B and C across three separately named companies");

    for (const staff of [staffA, staffB, staffC]) {
      await searchBox.fill(staff.username);
      await page.getByRole("button", { name: "Search", exact: true }).click();
      const row = page.locator("li").filter({ hasText: staff.username }).filter({ has: page.getByRole("button", { name: "Preview" }) });
      await row.getByRole("button", { name: "Preview" }).click();
      await page.getByRole("button", { name: "Confirm assignment" }).waitFor();
      const previewText = await page
        .locator("div", { hasText: "The manager will be able to see" })
        .filter({ has: page.getByRole("button", { name: "Confirm assignment" }) })
        .last()
        .innerText();
      check(/\d+ certificates? visible today/.test(previewText), `Preview for ${staff.username} lists sites with certificate counts`);
      await page.getByRole("button", { name: "Confirm assignment" }).click();
      await page.getByText("Saved successfully.").waitFor({ timeout: 30000 });
      await page.waitForLoadState("networkidle");
    }
    const assignedList = page.locator("section", { hasText: "Assigned customer users" });
    for (const staff of [staffA, staffB, staffC]) {
      await assignedList.getByText(staff.username, { exact: true }).waitFor({ timeout: 30000 });
    }
    check(true, "Staff A, B and C appear under Mark's assigned customer users (test 14)");

    console.log("\nTests 4-8: Mark's single login");
    await login(page, markUsername);
    check(page.url().includes("/portal/"), "Mark signs in once with his username");
    check((await availableCertificates(page)) === 4, "Dashboard counts 4 certificates across the three branches");
    const dash = await page.locator("main").innerText();
    check(/3 companies/.test(dash), "Dashboard header shows 3 companies");
    check(["Staff A Manchester", "Staff B Wakefield", "Staff C Sheffield"].every((n) => dash.includes(n)), "Dashboard lists Mark's team");
    check(!dash.includes("Wakefield company doc"), "Wakefield company-level document is not shown (Staff B is site-only)");

    const titles = await certificateTitles(page);
    check(
      titles.join("|") ===
        [`Sheffield calibration ${tag}`, `Manchester calibration ${tag}`, `Wakefield calibration ${tag}`, `Manchester insurance ${tag}`].join("|"),
      "Certificates list shows exactly the 4 approved certificates, newest first"
    );
    check(await page.locator("#companyId").isVisible(), "Company / branch filter is available");
    const sheffieldOnly = await certificateTitles(page, `?companyId=${sheffield.id}`);
    check(sheffieldOnly.length === 1 && sheffieldOnly[0].startsWith("Sheffield"), "Filtering by Sheffield shows only Sheffield");

    for (const intent of ["view", "download"]) {
      const res = await page.request.get(`${BASE}/api/portal/certificates/${certs.manchesterSite}/signed-url?intent=${intent}`);
      const body = await res.body();
      check(res.ok() && body.subarray(0, 5).toString() === "%PDF-", `Mark can ${intent} an authorised PDF`);
    }

    console.log("\nTests 9-10: no unrelated access, no user management");
    const denied = await page.request.get(`${BASE}/api/portal/certificates/${certs.unrelated}/signed-url?intent=download`, { maxRedirects: 0 });
    check(denied.status() >= 400, `Signed URL for an unrelated certificate is refused (HTTP ${denied.status()})`);
    const deniedB = await page.request.get(`${BASE}/api/portal/certificates/${certs.wakefieldCompany}/signed-url?intent=download`, { maxRedirects: 0 });
    check(deniedB.status() >= 400, "Signed URL for an unapproved Wakefield document is refused");
    await page.goto(`${BASE}/portal/certificates/${certs.unrelated}`, { waitUntil: "networkidle" });
    check(!(await page.locator("main").innerText()).includes("Unrelated calibration"), "Unrelated certificate detail page is not shown");
    await page.goto(`${BASE}/admin/users`, { waitUntil: "networkidle" });
    check(!page.url().includes("/admin/users"), "Mark is redirected away from Admin → Users");

    console.log("\nTest 11: removing Staff B's assignment");
    await login(page, adminUser.email);
    await page.goto(`${BASE}/admin/users/${markId}/edit`, { waitUntil: "networkidle" });
    await page
      .locator("li", { hasText: staffB.username })
      .filter({ has: page.getByRole("button", { name: "Remove assignment" }) })
      .getByRole("button", { name: "Remove assignment" })
      .click();
    await page.getByText("Saved successfully.").waitFor({ timeout: 30000 });
    await login(page, markUsername);
    const afterRemove = await certificateTitles(page);
    check(afterRemove.length === 3 && !afterRemove.some((t) => t.startsWith("Wakefield")), "Mark no longer sees Wakefield after removal");
    const revokedPdf = await page.request.get(`${BASE}/api/portal/certificates/${certs.wakefieldSite}/signed-url?intent=download`, { maxRedirects: 0 });
    check(revokedPdf.status() >= 400, "Wakefield PDF link is refused immediately after removal");

    console.log("\nTest 12: Staff A's new access needs approval");
    const paintShop = await createSite(manchester.id, "Manchester Paint Shop");
    const paintCert = await createCert(manchester.id, paintShop, `Manchester paint shop ${tag}`, "2026-06-01", adminUser.id);
    check(!(await certificateTitles(page)).some((t) => t.startsWith("Manchester paint shop")), "Mark does not see Staff A's new Manchester site");
    await login(page, adminUser.email);
    await page.goto(`${BASE}/admin/users/${markId}/edit`, { waitUntil: "networkidle" });
    const pendingBox = page.locator("div", { hasText: "Pending expansion" }).filter({ has: page.getByRole("button", { name: "Approve selected" }) }).last();
    await pendingBox.getByText("Manchester Paint Shop").waitFor({ timeout: 30000 });
    check(true, "Admin sees the new site as a pending expansion");
    await pendingBox.getByRole("checkbox").first().check();
    await pendingBox.getByRole("button", { name: "Approve selected" }).click();
    await page.getByText("Saved successfully.").waitFor({ timeout: 30000 });
    await login(page, markUsername);
    check((await certificateTitles(page))[0] === `Manchester paint shop ${tag}`, "After approval Mark sees the new site's certificate first");
    const paintPdf = await page.request.get(`${BASE}/api/portal/certificates/${paintCert}/signed-url?intent=download`);
    check(paintPdf.ok(), "Approved expansion PDF downloads");

    console.log("\nTest 15: audit log");
    const audit = await must(
      admin.from("audit_logs").select("action").eq("user_id", adminUser.id).like("action", "manager_%"),
      "audit"
    );
    const count = (a) => audit.filter((r) => r.action === a).length;
    check(count("manager_assignment_created") === 3, "3 manager_assignment_created events");
    check(count("manager_assignment_removed") === 1, "1 manager_assignment_removed event");
    check(count("manager_scope_approved") === 1, "1 manager_scope_approved event");
    const markAudit = await must(
      admin.from("audit_logs").select("action, entity_id").eq("user_id", markId).like("action", "certificate_%_customer"),
      "mark audit"
    );
    check(
      markAudit.some((r) => r.action === "certificate_downloaded_customer" && r.entity_id === certs.manchesterSite) &&
        markAudit.some((r) => r.action === "certificate_viewed_customer"),
      "Mark's delegated views and downloads are recorded under his own profile"
    );
    check(!markAudit.some((r) => r.entity_id === certs.unrelated), "No audit entry exists for the refused unrelated download");

    console.log("\nTest 16: existing workflows");
    await login(page, staffA.username);
    const aTitles = await certificateTitles(page);
    check(aTitles.length === 3 && aTitles.every((t) => t.startsWith("Manchester")), "Staff A still sees only Manchester (3 certificates)");
    await login(page, staffB.username);
    const bTitles = await certificateTitles(page);
    check(bTitles.length === 1 && bTitles[0].startsWith("Wakefield calibration"), "Staff B still sees only their Wakefield site");
    await login(page, unrelatedUser.username);
    const uTitles = await certificateTitles(page);
    check(uTitles.length === 1 && uTitles[0].startsWith("Unrelated"), "Unrelated customer still sees only their own certificate");
    check(!(await page.locator("#companyId").isVisible().catch(() => false)), "Single-company customers do not get the company filter");

    console.log(`\nOK: ${passed} browser acceptance checks passed. Mark login: ${markUsername} (staging only).`);
  } catch (err) {
    const shot = process.env.E2E_FAILURE_SCREENSHOT;
    if (shot) await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    console.error(`  at ${page.url()}`);
    throw err;
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(`\nFAIL: ${err.message}`);
  process.exit(1);
});
