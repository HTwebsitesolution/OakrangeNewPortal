/**
 * Staging-only demo of manager-to-user assignments (Carbodyshops scenario). Safe to re-run.
 *
 *   $env:PORTAL_ENV_FILE=".env.staging.local"; $env:STAGING_DEMO_PASSWORD="..."; node scripts/seed-staging-manager-demo.mjs
 *
 * Creates an admin, Mark (site manager) and three Carbodyshop staff from separately named companies,
 * assigns the staff to Mark through create_manager_assignment, then adds a Manchester site that is
 * left as a pending expansion for the admin to approve.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRODUCTION_REF = "dptzwrrydxicehgjnbxf";
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const password = process.env.STAGING_DEMO_PASSWORD ?? "";

if (!url || !serviceKey || !anonKey) {
  console.error("Missing Supabase settings (set PORTAL_ENV_FILE=.env.staging.local).");
  process.exit(1);
}
if (url.includes(PRODUCTION_REF)) {
  console.error("Refusing to run: this script is for the staging project only.");
  process.exit(1);
}
if (!password) {
  console.error("Set STAGING_DEMO_PASSWORD.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const pdfBytes = readFileSync(resolve(__dirname, "../tests/fixtures/certificate-valid.pdf"));

async function must(promise, label) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function ensureCompany(name) {
  const existing = await must(admin.from("companies").select("id, customer_id_readable").eq("company_name", name).maybeSingle(), name);
  if (existing) return existing;
  return must(admin.from("companies").insert({ company_name: name }).select("id, customer_id_readable").single(), name);
}

async function ensureSite(companyId, name) {
  const existing = await must(admin.from("sites").select("id").eq("company_id", companyId).eq("site_name", name).maybeSingle(), name);
  if (existing) return existing.id;
  return (await must(admin.from("sites").insert({ company_id: companyId, site_name: name }).select("id").single(), name)).id;
}

async function ensureUser({ username, role, companyId, fullName, adminLevel = null }) {
  const email = `${username}@example.com`;
  const existing = await must(admin.from("profiles").select("id, auth_user_id").eq("username", username).maybeSingle(), username);
  let profileId;
  if (existing) {
    await must(admin.auth.admin.updateUserById(existing.auth_user_id, { password }), `password ${username}`);
    profileId = existing.id;
  } else {
    const created = await must(admin.auth.admin.createUser({ email, password, email_confirm: true }), `auth ${username}`);
    profileId = (await must(admin.from("profiles").select("id").eq("auth_user_id", created.user.id).single(), `profile ${username}`)).id;
  }
  await must(
    admin
      .from("profiles")
      .update({ role, company_id: companyId, full_name: fullName, username, is_active: true, admin_level: adminLevel })
      .eq("id", profileId)
      .select("id"),
    `profile update ${username}`
  );
  return { id: profileId, email, username };
}

async function ensureGrant(userId, companyId, siteId = null) {
  let query = admin.from("user_site_access").select("id").eq("user_id", userId).eq("company_id", companyId);
  query = siteId ? query.eq("site_id", siteId) : query.is("site_id", null);
  if ((await must(query, "grant lookup")).length) return;
  await must(
    admin.from("user_site_access").insert({ user_id: userId, company_id: companyId, site_id: siteId, access_type: siteId ? "site" : "company" }).select("id"),
    "grant"
  );
}

async function ensureCert(companyId, siteId, title, issueDate, adminId) {
  const existing = await must(admin.from("certificate_documents").select("id").eq("company_id", companyId).eq("display_title", title).maybeSingle(), title);
  if (existing) return existing.id;
  const path = `certificates/${companyId}/${siteId ?? "company"}/${title.replace(/\W+/g, "-").toLowerCase()}.pdf`;
  await must(admin.storage.from("certificates").upload(path, pdfBytes, { contentType: "application/pdf", upsert: true }), `upload ${title}`);
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
          file_size_bytes: pdfBytes.length,
        })
        .select("id")
        .single(),
      title
    )
  ).id;
}

async function main() {
  const adminUser = await ensureUser({ username: "stagingadmin", role: "oakrange_admin", companyId: null, fullName: "Staging Admin", adminLevel: "super_admin" });

  const manchester = await ensureCompany("Carbodyshop Manchester");
  const wakefield = await ensureCompany("Carbodyshop Wakefield");
  const sheffield = await ensureCompany("Carbodyshop Sheffield");
  const unrelated = await ensureCompany("Unrelated Motors");
  const manchesterSite = await ensureSite(manchester.id, "Manchester Bodyshop");
  const wakefieldSite = await ensureSite(wakefield.id, "Wakefield Bodyshop");
  const sheffieldSite = await ensureSite(sheffield.id, "Sheffield Bodyshop");
  const unrelatedSite = await ensureSite(unrelated.id, "Unrelated Depot");

  const mark = await ensureUser({ username: "carbodymark", role: "site_manager", companyId: manchester.id, fullName: "Mark (Carbodyshops Manager)" });
  const staffA = await ensureUser({ username: "staffmanchester", role: "customer_user", companyId: manchester.id, fullName: "Staff A Manchester" });
  const staffB = await ensureUser({ username: "staffwakefield", role: "customer_user", companyId: wakefield.id, fullName: "Staff B Wakefield" });
  const staffC = await ensureUser({ username: "staffsheffield", role: "customer_user", companyId: sheffield.id, fullName: "Staff C Sheffield" });
  const other = await ensureUser({ username: "unrelatedstaff", role: "customer_user", companyId: unrelated.id, fullName: "Unrelated Motors Staff" });
  await ensureGrant(staffA.id, manchester.id);
  await ensureGrant(staffB.id, wakefield.id, wakefieldSite);
  await ensureGrant(staffC.id, sheffield.id);
  await ensureGrant(other.id, unrelated.id);

  await ensureCert(manchester.id, null, "Manchester public liability insurance", "2026-01-10", adminUser.id);
  await ensureCert(manchester.id, manchesterSite, "Manchester spray booth calibration", "2026-03-01", adminUser.id);
  await ensureCert(wakefield.id, wakefieldSite, "Wakefield torque wrench calibration", "2026-02-01", adminUser.id);
  await ensureCert(wakefield.id, null, "Wakefield company-wide insurance", "2026-02-05", adminUser.id);
  await ensureCert(sheffield.id, sheffieldSite, "Sheffield wheel alignment calibration", "2026-04-01", adminUser.id);
  await ensureCert(unrelated.id, unrelatedSite, "Unrelated Motors calibration", "2026-05-01", adminUser.id);

  const anon = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: signInError } = await anon.auth.signInWithPassword({ email: adminUser.email, password });
  if (signInError) throw new Error(`admin sign in: ${signInError.message}`);

  const plan = [
    [staffA, [{ company_id: manchester.id, site_id: null }, { company_id: manchester.id, site_id: manchesterSite }]],
    [staffB, [{ company_id: wakefield.id, site_id: wakefieldSite }]],
    [staffC, [{ company_id: sheffield.id, site_id: null }, { company_id: sheffield.id, site_id: sheffieldSite }]],
  ];
  for (const [staff, scopes] of plan) {
    const active = await must(
      admin.from("manager_user_assignments").select("id").eq("manager_profile_id", mark.id).eq("customer_user_profile_id", staff.id).eq("is_active", true),
      "assignment lookup"
    );
    if (active.length) continue;
    await must(
      anon.rpc("create_manager_assignment", { p_manager_profile_id: mark.id, p_customer_user_profile_id: staff.id, p_scopes: scopes }),
      `assign ${staff.username}`
    );
  }

  const paintShop = await ensureSite(manchester.id, "Manchester Paint Shop");
  await ensureCert(manchester.id, paintShop, "Manchester paint shop extraction test", "2026-06-01", adminUser.id);

  console.log("Staging manager demo ready.");
  console.log(`  Admin:   stagingadmin (Carbodyshop OAK numbers: ${manchester.customer_id_readable}, ${wakefield.customer_id_readable}, ${sheffield.customer_id_readable})`);
  console.log("  Manager: carbodymark");
  console.log("  Staff:   staffmanchester, staffwakefield, staffsheffield, unrelatedstaff");
}

main().catch((err) => {
  console.error(`FAIL: ${err.message}`);
  process.exit(1);
});
