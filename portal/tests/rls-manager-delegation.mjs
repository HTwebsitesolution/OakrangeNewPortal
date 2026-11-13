/**
 * Manager-to-user delegated access: RLS and trigger integration checks.
 *
 * Usage (never point this at production; it creates and deletes fixture data):
 *   PORTAL_ENV_FILE=.env.staging.local node tests/rls-manager-delegation.mjs
 *
 * Scenario: Mark (site_manager) is assigned Staff A, B and C from three separately named
 * Carbodyshop companies. "Unrelated Motors" is a second customer group Mark must never see.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "../scripts/load-env-local.mjs";

loadEnvLocal();

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PRODUCTION_REF = "dptzwrrydxicehgjnbxf";

if (!url || !serviceKey || !anonKey) {
  const msg =
    "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY";
  if (process.env.REQUIRE_RLS_TESTS === "1") {
    console.error(msg);
    process.exit(1);
  }
  console.warn("SKIP:", msg);
  process.exit(0);
}
if (url.includes(PRODUCTION_REF) && process.env.ALLOW_PRODUCTION_FIXTURES !== "1") {
  console.error("Refusing to create delegation fixtures on the production project.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const password = `Delegation-${suffix}-A1b2c3`;
const authUserIds = [];
const companyIds = [];
let passed = 0;

function check(cond, msg) {
  if (!cond) throw new Error(msg);
  passed += 1;
  console.log(`  ok  ${msg}`);
}

async function expectError(promise, msg, pattern) {
  const { error } = await promise;
  check(Boolean(error) && (!pattern || pattern.test(error.message)), `${msg}${error ? "" : " (no error returned)"}`);
}

async function createCompany(name) {
  const { data, error } = await admin.from("companies").insert({ company_name: `${name} ${suffix}` }).select("id").single();
  if (error) throw new Error(`company ${name}: ${error.message}`);
  companyIds.push(data.id);
  return data.id;
}

async function createSite(companyId, name) {
  const { data, error } = await admin.from("sites").insert({ company_id: companyId, site_name: `${name} ${suffix}` }).select("id").single();
  if (error) throw new Error(`site ${name}: ${error.message}`);
  return data.id;
}

async function createUser(label, role, companyId) {
  const email = `deleg-${label}-${suffix}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`user ${label}: ${error.message}`);
  authUserIds.push(data.user.id);
  const { data: profile } = await admin.from("profiles").select("id").eq("auth_user_id", data.user.id).single();
  const { error: upErr } = await admin
    .from("profiles")
    .update({ role, company_id: companyId, is_active: true, full_name: label })
    .eq("id", profile.id);
  if (upErr) throw new Error(`profile ${label}: ${upErr.message}`);
  return { id: profile.id, email };
}

async function grant(userId, companyId, siteId = null) {
  const { error } = await admin.from("user_site_access").insert({
    user_id: userId,
    company_id: companyId,
    site_id: siteId,
    access_type: siteId ? "site" : "company",
  });
  if (error) throw new Error(`grant: ${error.message}`);
}

async function createCert(companyId, siteId, title, issueDate, extra = {}) {
  const { data, error } = await admin
    .from("certificate_documents")
    .insert({
      company_id: companyId,
      site_id: siteId,
      original_file_name: `${title}.pdf`,
      display_title: title,
      download_file_name: `${title}.pdf`,
      storage_path: `certificates/${companyId}/${siteId ?? "company"}/${title.replace(/\W+/g, "-")}-${suffix}.pdf`,
      issue_date: issueDate,
      published_at: new Date().toISOString(),
      status: "active",
      ...extra,
    })
    .select("id")
    .single();
  if (error) throw new Error(`cert ${title}: ${error.message}`);
  return data.id;
}

async function signIn(email) {
  const anon = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function visibleCertIds(client) {
  const { data, error } = await client
    .from("certificate_documents")
    .select("id")
    .eq("status", "active")
    .not("published_at", "is", null);
  if (error) throw new Error(error.message);
  return new Set(data.map((r) => r.id));
}

function sameSet(actual, expected) {
  return actual.size === expected.length && expected.every((id) => actual.has(id));
}

async function cleanup() {
  if (companyIds.length) await admin.from("companies").delete().in("id", companyIds);
  for (const id of authUserIds.slice().reverse()) await admin.auth.admin.deleteUser(id);
}

try {
  console.log("Setting up fixtures…");
  const manchester = await createCompany("Carbodyshop Manchester");
  const wakefield = await createCompany("Carbodyshop Wakefield");
  const sheffield = await createCompany("Carbodyshop Sheffield");
  const unrelated = await createCompany("Unrelated Motors");

  const manchesterSite = await createSite(manchester, "Manchester Bodyshop");
  const wakefieldSite = await createSite(wakefield, "Wakefield Bodyshop");
  const sheffieldSite = await createSite(sheffield, "Sheffield Bodyshop");
  const unrelatedSite = await createSite(unrelated, "Unrelated Depot");

  const adminUser = await createUser("admin", "oakrange_admin", null);
  const mark = await createUser("Mark", "site_manager", manchester);
  const staffA = await createUser("StaffA", "customer_user", manchester);
  const staffB = await createUser("StaffB", "customer_user", wakefield);
  const staffC = await createUser("StaffC", "customer_user", sheffield);
  const otherManager = await createUser("OtherManager", "site_manager", unrelated);
  const unrelatedUser = await createUser("UnrelatedUser", "customer_user", unrelated);

  await grant(staffA.id, manchester);
  await grant(staffB.id, wakefield, wakefieldSite);
  await grant(staffC.id, sheffield);
  await grant(unrelatedUser.id, unrelated);

  const certManchesterCompany = await createCert(manchester, null, "Manchester company-level", "2026-01-10");
  const certManchesterSite = await createCert(manchester, manchesterSite, "Manchester calibration", "2026-03-01");
  const certWakefieldSite = await createCert(wakefield, wakefieldSite, "Wakefield calibration", "2026-02-01");
  const certWakefieldCompany = await createCert(wakefield, null, "Wakefield company-level", "2026-02-05");
  const certSheffieldSite = await createCert(sheffield, sheffieldSite, "Sheffield calibration", "2026-04-01");
  const certUnrelated = await createCert(unrelated, unrelatedSite, "Unrelated calibration", "2026-05-01");
  const certManchesterDraft = await createCert(manchester, manchesterSite, "Manchester draft", "2026-06-01", { published_at: null });

  const clientAdmin = await signIn(adminUser.email);
  const clientMark = await signIn(mark.email);
  const clientA = await signIn(staffA.email);
  const clientB = await signIn(staffB.email);
  const clientUnrelated = await signIn(unrelatedUser.email);

  console.log("\nBefore assignment");
  check((await visibleCertIds(clientMark)).size === 0, "Mark sees no certificates before any assignment");

  console.log("\nAssignment rules (tests 1-3)");
  const scopesA = [{ company_id: manchester, site_id: null }, { company_id: manchester, site_id: manchesterSite }];
  const scopesB = [{ company_id: wakefield, site_id: wakefieldSite }];
  const scopesC = [{ company_id: sheffield, site_id: null }, { company_id: sheffield, site_id: sheffieldSite }];

  await expectError(
    clientMark.rpc("create_manager_assignment", { p_manager_profile_id: mark.id, p_customer_user_profile_id: staffA.id, p_scopes: scopesA }),
    "A manager cannot create assignments",
    /insufficient_privilege|permission|row-level/i
  );
  await expectError(
    clientMark.from("manager_user_assignments").insert({ manager_profile_id: mark.id, customer_user_profile_id: staffA.id }),
    "A manager cannot insert assignment rows directly",
    /row-level security/i
  );

  const createAssignment = (managerId, userId, scopes) =>
    clientAdmin.rpc("create_manager_assignment", {
      p_manager_profile_id: managerId,
      p_customer_user_profile_id: userId,
      p_scopes: scopes,
    });

  const { data: assignA, error: eA } = await createAssignment(mark.id, staffA.id, scopesA);
  check(!eA && assignA, `Admin assigns Staff A (Manchester) to Mark${eA ? `: ${eA.message}` : ""}`);
  const { data: assignB, error: eB } = await createAssignment(mark.id, staffB.id, scopesB);
  check(!eB && assignB, `Admin assigns Staff B (Wakefield) to Mark${eB ? `: ${eB.message}` : ""}`);
  const { data: assignC, error: eC } = await createAssignment(mark.id, staffC.id, scopesC);
  check(!eC && assignC, `Admin assigns Staff C (Sheffield) to Mark${eC ? `: ${eC.message}` : ""}`);

  await expectError(createAssignment(mark.id, staffA.id, scopesA), "Duplicate active assignment is rejected", /duplicate|unique/i);
  await expectError(createAssignment(mark.id, mark.id, scopesA), "Self-assignment is rejected", /not_self|customer_user/i);
  await expectError(createAssignment(mark.id, otherManager.id, scopesA), "A site manager cannot be assigned (no chains or circular delegation)", /customer_user/i);
  await expectError(createAssignment(mark.id, adminUser.id, scopesA), "An admin cannot be assigned", /customer_user/i);
  await expectError(createAssignment(staffA.id, staffB.id, scopesB), "A customer_user cannot be made a manager", /site_manager/i);
  await expectError(createAssignment(adminUser.id, staffB.id, scopesB), "An admin cannot be a delegated manager", /site_manager/i);
  await expectError(
    createAssignment(otherManager.id, staffB.id, [{ company_id: wakefield, site_id: null }]),
    "Scope outside the user's own grants is rejected (Staff B has site-only access)",
    /outside_assigned_user_access/i
  );
  await expectError(
    createAssignment(otherManager.id, staffA.id, [{ company_id: manchester, site_id: unrelatedSite }]),
    "Scope with a site from another company is rejected",
    /site_company_mismatch/i
  );
  await expectError(createAssignment(otherManager.id, staffA.id, []), "Assignment with no approved scope is rejected", /requires_scope/i);
  const { count: otherCount } = await admin
    .from("manager_user_assignments")
    .select("id", { count: "exact", head: true })
    .eq("manager_profile_id", otherManager.id);
  check(otherCount === 0, "Rejected attempts left no partial assignment rows");

  console.log("\nMark's combined view (tests 4-9)");
  const expectedMark = [certManchesterCompany, certManchesterSite, certWakefieldSite, certSheffieldSite];
  const markCerts = await visibleCertIds(clientMark);
  check(sameSet(markCerts, expectedMark), "Mark sees exactly the approved certificates from all three branches");
  check(!markCerts.has(certWakefieldCompany), "Mark does not see Wakefield company-level documents (Staff B is site-only)");
  check(!markCerts.has(certUnrelated), "Mark does not see the unrelated company's certificate");
  check(!markCerts.has(certManchesterDraft), "Mark does not see unpublished certificates");

  const { data: markCompanies } = await clientMark.from("companies").select("id");
  check(
    sameSet(new Set(markCompanies.map((c) => c.id)), [manchester, wakefield, sheffield]),
    "Mark sees the three branch companies and nothing else"
  );
  const { data: markSites } = await clientMark.from("sites").select("id");
  check(
    sameSet(new Set(markSites.map((s) => s.id)), [manchesterSite, wakefieldSite, sheffieldSite]),
    "Mark sees the three branch sites and nothing else"
  );

  const { data: filtered } = await clientMark
    .from("certificate_documents")
    .select("id")
    .eq("company_id", sheffield);
  check(sameSet(new Set(filtered.map((r) => r.id)), [certSheffieldSite]), "Filtering by branch returns only that branch");

  const { data: ordered } = await clientMark
    .from("certificate_documents")
    .select("issue_date")
    .order("issue_date", { ascending: false })
    .order("uploaded_at", { ascending: false });
  const dates = ordered.map((r) => r.issue_date);
  check(dates.join() === [...dates].sort().reverse().join(), "Certificates come back newest first");

  const { data: byIdUnrelated } = await clientMark.from("certificate_documents").select("id").eq("id", certUnrelated);
  check(byIdUnrelated.length === 0, "Mark cannot open the unrelated certificate by id");
  const { data: unrelatedCo } = await clientMark.from("companies").select("id").eq("id", unrelated);
  check(unrelatedCo.length === 0, "Mark cannot read the unrelated company");

  const { data: storageTry } = await clientMark.storage.from("certificates").list(`certificates/${manchester}`);
  check((storageTry ?? []).length === 0, "Mark cannot list private PDF storage directly");

  console.log("\nManager limits (test 10)");
  const { data: markProfiles } = await clientMark.from("profiles").select("id");
  check(markProfiles.length === 1 && markProfiles[0].id === mark.id, "Mark can read only his own profile, not his staff's");
  const { data: markUpdated } = await clientMark.from("profiles").update({ full_name: "Hacked" }).eq("id", staffA.id).select("id");
  check((markUpdated ?? []).length === 0, "Mark cannot edit a staff user's profile");
  const { data: markDeact } = await clientMark.from("profiles").update({ is_active: false }).eq("id", staffB.id).select("id");
  check((markDeact ?? []).length === 0, "Mark cannot deactivate a staff user");
  await expectError(
    clientMark.from("user_site_access").insert({ user_id: mark.id, company_id: unrelated, access_type: "company" }),
    "Mark cannot grant himself access",
    /row-level security/i
  );
  const { data: scopeUpd } = await clientMark
    .from("manager_assignment_scopes")
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq("assignment_id", assignA)
    .select("id");
  check((scopeUpd ?? []).length === 0, "Mark cannot change his approved scopes");
  const { data: team, error: teamErr } = await clientMark.rpc("manager_team_members");
  check(!teamErr && team.length === 3, "Mark's team list shows his three assigned users");
  check(
    Object.keys(team[0]).sort().join() === "assignment_id,company_name,customer_id_readable,member_name",
    "Team list exposes only name and company (no email or username)"
  );
  const { data: staffAssignments } = await clientA.from("manager_user_assignments").select("id");
  check(staffAssignments.length === 0, "Staff users cannot read manager assignments");
  const { data: otherTeam } = await clientA.rpc("manager_team_members");
  check((otherTeam ?? []).length === 0, "A customer user gets an empty team list");

  console.log("\nRevocation (test 11)");
  const now = new Date().toISOString();
  await clientAdmin.from("manager_assignment_scopes").update({ is_active: false, revoked_at: now, revoked_by: adminUser.id }).eq("assignment_id", assignB).eq("is_active", true);
  const { error: revokeErr } = await clientAdmin
    .from("manager_user_assignments")
    .update({ is_active: false, revoked_at: now, revoked_by: adminUser.id })
    .eq("id", assignB);
  check(!revokeErr, "Admin removes Staff B's assignment");
  check(!(await visibleCertIds(clientMark)).has(certWakefieldSite), "Mark loses Wakefield certificates immediately");
  check((await visibleCertIds(clientB)).has(certWakefieldSite), "Staff B keeps their own access");
  await expectError(
    clientAdmin.from("manager_user_assignments").update({ is_active: true, revoked_at: null }).eq("id", assignB),
    "A revoked assignment cannot be silently reactivated",
    /cannot_reactivate/i
  );

  console.log("\nNo silent expansion (test 12)");
  const manchesterSite2 = await createSite(manchester, "Manchester Paint Shop");
  const certManchesterSite2 = await createCert(manchester, manchesterSite2, "Manchester paint shop", "2026-07-01");
  check((await visibleCertIds(clientA)).has(certManchesterSite2), "Staff A automatically sees a new Manchester site (company-wide grant)");
  check(!(await visibleCertIds(clientMark)).has(certManchesterSite2), "Mark does not see the new site without approval");
  await grant(staffA.id, unrelated, unrelatedSite);
  check((await visibleCertIds(clientA)).has(certUnrelated), "Staff A is given extra access to an unrelated site");
  check(!(await visibleCertIds(clientMark)).has(certUnrelated), "Mark still cannot see that unrelated site");
  const { error: approveErr } = await clientAdmin
    .from("manager_assignment_scopes")
    .insert({ assignment_id: assignA, company_id: manchester, site_id: manchesterSite2, approved_by: adminUser.id });
  check(!approveErr, "Admin approves the new Manchester site for Mark");
  check((await visibleCertIds(clientMark)).has(certManchesterSite2), "After approval Mark sees the new site");

  console.log("\nDeactivation (test 13)");
  const sheffieldSite2 = await createSite(sheffield, "Sheffield Annex");
  await admin.from("profiles").update({ is_active: false }).eq("id", staffC.id);
  check((await visibleCertIds(clientMark)).has(certSheffieldSite), "Deactivating Staff C keeps Mark's approved Sheffield access (agreed rule)");
  await expectError(
    clientAdmin.from("manager_assignment_scopes").insert({ assignment_id: assignC, company_id: sheffield, site_id: sheffieldSite2 }),
    "No new scope can be approved for a deactivated user",
    /active_customer_user/i
  );
  await expectError(createAssignment(otherManager.id, staffC.id, scopesC), "A deactivated user cannot be assigned", /customer_user/i);
  await admin.from("profiles").update({ is_active: true }).eq("id", staffC.id);

  await admin.from("sites").update({ status: "inactive" }).eq("id", sheffieldSite);
  check(!(await visibleCertIds(clientMark)).has(certSheffieldSite), "Deactivating a site removes Mark's access to it");
  await admin.from("sites").update({ status: "active" }).eq("id", sheffieldSite);

  await admin.from("companies").update({ status: "inactive" }).eq("id", manchester);
  const afterCompanyOff = await visibleCertIds(clientMark);
  check(!afterCompanyOff.has(certManchesterSite) && !afterCompanyOff.has(certManchesterCompany), "Deactivating a company removes Mark's access to it");
  await admin.from("companies").update({ status: "active" }).eq("id", manchester);

  await admin.from("profiles").update({ is_active: false }).eq("id", mark.id);
  check((await visibleCertIds(clientMark)).size === 0, "A deactivated manager sees nothing");
  await expectError(createAssignment(mark.id, staffB.id, scopesB), "A deactivated manager cannot be given new assignments", /site_manager/i);
  await admin.from("profiles").update({ is_active: true }).eq("id", mark.id);

  await admin.from("profiles").update({ role: "customer_user" }).eq("id", mark.id);
  check((await visibleCertIds(clientMark)).size === 0, "Removing the site_manager role stops delegated access");
  await admin.from("profiles").update({ role: "site_manager" }).eq("id", mark.id);
  check((await visibleCertIds(clientMark)).has(certManchesterSite), "Restoring the role restores approved access only");

  console.log("\nAdmin review (test 14)");
  const { data: allAssignments } = await clientAdmin
    .from("manager_user_assignments")
    .select("id, is_active")
    .eq("manager_profile_id", mark.id);
  check(allAssignments.length === 3 && allAssignments.filter((a) => a.is_active).length === 2, "Admin sees all of Mark's assignments, including the revoked one");

  console.log("\nExisting access unchanged (test 16)");
  const aCerts = await visibleCertIds(clientA);
  check(aCerts.has(certManchesterCompany) && aCerts.has(certManchesterSite), "Staff A (company-wide) still sees Manchester certificates");
  const bCerts = await visibleCertIds(clientB);
  check(bCerts.has(certWakefieldSite) && !bCerts.has(certWakefieldCompany), "Staff B (site-only) still sees only their site");
  const uCerts = await visibleCertIds(clientUnrelated);
  check(sameSet(uCerts, [certUnrelated]), "Unrelated customer sees only their own certificate");
  const { data: probe } = await clientA.rpc("has_delegated_scope", { p_company_id: manchester, p_site_id: null });
  check(probe === false, "The delegation check answers false for non-managers");

  console.log(`\nOK: ${passed} manager delegation checks passed.`);
} catch (err) {
  console.error(`\nFAIL: ${err.message}`);
  process.exitCode = 1;
} finally {
  await cleanup();
}
