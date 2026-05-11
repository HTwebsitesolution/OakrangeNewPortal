/**
 * Phase 2 RLS integration checks (run against a Supabase project with migrations applied).
 *
 * Usage:
 *   set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   node tests/rls-phase2.mjs
 *
 * In CI, set these secrets and optionally REQUIRE_RLS_TESTS=1 to fail if env is missing.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

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

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const password = `RlsTest-${suffix}-A1b2c3d4e5f6`;

/** @type {string[]} */
const authUserIds = [];

/** @type {string[]} */
const cleanupCompanyIds = [];

async function cleanup() {
  if (cleanupCompanyIds.length > 0) {
    await admin.from("companies").delete().in("id", cleanupCompanyIds);
  }
  for (const id of authUserIds.slice().reverse()) {
    await admin.auth.admin.deleteUser(id);
  }
}

function sessionClient(accessToken) {
  return createClient(url, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

try {
  // --- Companies & sites (service role setup) ---
  const { data: companyA, error: eA } = await admin
    .from("companies")
    .insert({ company_name: `RLS Co A ${suffix}` })
    .select("id")
    .single();
  assert(!eA && companyA?.id, `insert company A: ${eA?.message}`);

  const { data: companyB, error: eB } = await admin
    .from("companies")
    .insert({ company_name: `RLS Co B ${suffix}` })
    .select("id")
    .single();
  assert(!eB && companyB?.id, `insert company B: ${eB?.message}`);
  cleanupCompanyIds.push(companyA.id, companyB.id);

  const { data: siteA1, error: sA1 } = await admin
    .from("sites")
    .insert({ company_id: companyA.id, site_name: `Site A1 ${suffix}` })
    .select("id")
    .single();
  assert(!sA1 && siteA1?.id, `insert site A1: ${sA1?.message}`);

  const { data: siteA2 } = await admin
    .from("sites")
    .insert({ company_id: companyA.id, site_name: `Site A2 ${suffix}` })
    .select("id")
    .single();

  // --- Auth users ---
  const emailA = `rls-a-${suffix}@example.com`;
  const emailB = `rls-b-${suffix}@example.com`;
  const emailSite = `rls-site-${suffix}@example.com`;
  const emailInactive = `rls-inact-${suffix}@example.com`;
  const emailAdmin = `rls-admin-${suffix}@example.com`;

  const { data: ua, error: uaErr } = await admin.auth.admin.createUser({
    email: emailA,
    password,
    email_confirm: true,
  });
  assert(!uaErr && ua.user?.id, `create user A: ${uaErr?.message}`);
  authUserIds.push(ua.user.id);

  const { data: ub } = await admin.auth.admin.createUser({
    email: emailB,
    password,
    email_confirm: true,
  });
  assert(ub.user?.id, "create user B");
  authUserIds.push(ub.user.id);

  const { data: us } = await admin.auth.admin.createUser({
    email: emailSite,
    password,
    email_confirm: true,
  });
  assert(us.user?.id, "create site user");
  authUserIds.push(us.user.id);

  const { data: ui } = await admin.auth.admin.createUser({
    email: emailInactive,
    password,
    email_confirm: true,
  });
  assert(ui.user?.id, "create inactive user");
  authUserIds.push(ui.user.id);

  const { data: uadm } = await admin.auth.admin.createUser({
    email: emailAdmin,
    password,
    email_confirm: true,
  });
  assert(uadm.user?.id, "create admin user");
  authUserIds.push(uadm.user.id);

  const { data: profA } = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", ua.user.id)
    .single();
  const { data: profB } = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", ub.user.id)
    .single();
  const { data: profSite } = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", us.user.id)
    .single();
  const { data: profInact } = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", ui.user.id)
    .single();
  const { data: profAdmin } = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", uadm.user.id)
    .single();

  assert(profA?.id && profB?.id && profSite?.id && profInact?.id && profAdmin?.id, "profiles");

  await admin
    .from("profiles")
    .update({ role: "oakrange_admin", company_id: null, is_active: true })
    .eq("id", profAdmin.id);

  await admin
    .from("profiles")
    .update({ role: "customer_user", company_id: companyA.id, is_active: true })
    .eq("id", profA.id);

  await admin
    .from("profiles")
    .update({ role: "customer_user", company_id: companyB.id, is_active: true })
    .eq("id", profB.id);

  await admin
    .from("profiles")
    .update({ role: "site_manager", company_id: companyA.id, is_active: true })
    .eq("id", profSite.id);

  await admin
    .from("profiles")
    .update({ role: "customer_user", company_id: companyA.id, is_active: true })
    .eq("id", profInact.id);

  await admin.from("user_site_access").insert({
    user_id: profA.id,
    company_id: companyA.id,
    site_id: null,
    access_type: "company",
    created_by: profAdmin.id,
  });

  await admin.from("user_site_access").insert({
    user_id: profB.id,
    company_id: companyB.id,
    site_id: null,
    access_type: "company",
    created_by: profAdmin.id,
  });

  await admin.from("user_site_access").insert({
    user_id: profSite.id,
    company_id: companyA.id,
    site_id: siteA1.id,
    access_type: "site",
    created_by: profAdmin.id,
  });

  await admin.from("user_site_access").insert({
    user_id: profInact.id,
    company_id: companyA.id,
    site_id: null,
    access_type: "company",
    created_by: profAdmin.id,
  });

  await admin
    .from("profiles")
    .update({ is_active: false })
    .eq("id", profInact.id);

  const storageBase = `certificates/${companyA.id}/${siteA1.id}`;

  const { data: certCompanyLevel, error: cCL } = await admin
    .from("certificate_documents")
    .insert({
      company_id: companyA.id,
      site_id: null,
      original_file_name: "orig.pdf",
      display_title: "Company-level cert",
      download_file_name: "co.pdf",
      storage_path: `certificates/${companyA.id}/company/company-level-${suffix}.pdf`,
      issue_date: "2026-01-01",
      due_date: "2027-01-01",
      uploaded_by: profAdmin.id,
      published_at: new Date().toISOString(),
      status: "active",
    })
    .select("id")
    .single();
  assert(!cCL && certCompanyLevel?.id, `cert company-level: ${cCL?.message}`);

  const { data: certSite1 } = await admin
    .from("certificate_documents")
    .insert({
      company_id: companyA.id,
      site_id: siteA1.id,
      original_file_name: "orig2.pdf",
      display_title: "Site A1 cert",
      download_file_name: "s1.pdf",
      storage_path: `${storageBase}/site1-${suffix}.pdf`,
      issue_date: "2026-02-01",
      uploaded_by: profAdmin.id,
      published_at: new Date().toISOString(),
      status: "active",
    })
    .select("id")
    .single();

  assert(siteA2?.id, "site A2");

  const { data: certSite2 } = await admin
    .from("certificate_documents")
    .insert({
      company_id: companyA.id,
      site_id: siteA2.id,
      original_file_name: "orig3.pdf",
      display_title: "Site A2 cert",
      download_file_name: "s2.pdf",
      storage_path: `certificates/${companyA.id}/${siteA2.id}/site2-${suffix}.pdf`,
      issue_date: "2026-02-15",
      uploaded_by: profAdmin.id,
      published_at: new Date().toISOString(),
      status: "active",
    })
    .select("id")
    .single();

  assert(certSite2?.id, "cert site2");

  const { data: certDraft } = await admin
    .from("certificate_documents")
    .insert({
      company_id: companyA.id,
      site_id: siteA1.id,
      original_file_name: "draft.pdf",
      display_title: "Draft cert",
      download_file_name: "dr.pdf",
      storage_path: `${storageBase}/draft-${suffix}.pdf`,
      issue_date: "2026-03-01",
      uploaded_by: profAdmin.id,
      published_at: null,
      status: "active",
    })
    .select("id")
    .single();

  const { data: certVoid } = await admin
    .from("certificate_documents")
    .insert({
      company_id: companyA.id,
      site_id: siteA1.id,
      original_file_name: "void.pdf",
      display_title: "Void cert",
      download_file_name: "v.pdf",
      storage_path: `${storageBase}/void-${suffix}.pdf`,
      issue_date: "2026-04-01",
      uploaded_by: profAdmin.id,
      published_at: new Date().toISOString(),
      status: "void",
    })
    .select("id")
    .single();

  const { data: certB } = await admin
    .from("certificate_documents")
    .insert({
      company_id: companyB.id,
      site_id: null,
      original_file_name: "b.pdf",
      display_title: "B cert",
      download_file_name: "b.pdf",
      storage_path: `certificates/${companyB.id}/b-${suffix}.pdf`,
      issue_date: "2026-05-01",
      uploaded_by: profAdmin.id,
      published_at: new Date().toISOString(),
      status: "active",
    })
    .select("id")
    .single();

  // --- Sign in as customer A ---
  const anonA = createClient(url, anonKey);
  const { data: signA, error: signAErr } = await anonA.auth.signInWithPassword({
    email: emailA,
    password,
  });
  assert(!signAErr && signA.session?.access_token, `signIn A: ${signAErr?.message}`);
  const clientA = sessionClient(signA.session.access_token);

  const { data: metaB, error: metaBErr } = await clientA
    .from("companies")
    .select("id")
    .eq("id", companyB.id);
  assert(!metaBErr, metaBErr?.message);
  assert(
    (metaB?.length ?? 0) === 0,
    "Customer A cannot read company B row"
  );

  const { data: companyUserSeesSite2 } = await clientA
    .from("certificate_documents")
    .select("id")
    .eq("id", certSite2.id);
  assert(
    (companyUserSeesSite2?.length ?? 0) === 1,
    "Company-level access user should see certificates for all sites"
  );

  const { data: certsB } = await clientA
    .from("certificate_documents")
    .select("id")
    .eq("id", certB.id);
  assert((certsB?.length ?? 0) === 0, "Customer A cannot read company B certificate");

  const { data: siteOnlyRows } = await clientA
    .from("certificate_documents")
    .select("id")
    .in("id", [certCompanyLevel.id, certSite1.id]);
  assert(
    (siteOnlyRows?.length ?? 0) === 2,
    "Company-level access user should see company-level and site certs"
  );

  // --- Site-only user: no company-level cert ---
  const anonS = createClient(url, anonKey);
  const { data: signS, error: signSErr } = await anonS.auth.signInWithPassword({
    email: emailSite,
    password,
  });
  assert(!signSErr && signS.session?.access_token, `signIn site: ${signSErr?.message}`);
  const clientSite = sessionClient(signS.session.access_token);

  const { data: siteOnlyCerts } = await clientSite
    .from("certificate_documents")
    .select("id")
    .in("id", [certCompanyLevel.id, certSite1.id]);
  const ids = new Set((siteOnlyCerts ?? []).map((r) => r.id));
  assert(!ids.has(certCompanyLevel.id), "Site-only user must not see company-level certificate");
  assert(ids.has(certSite1.id), "Site-only user should see assigned site certificate");

  const { data: unassignedSite } = await clientSite
    .from("certificate_documents")
    .select("id")
    .eq("id", certSite2.id);
  assert(
    (unassignedSite?.length ?? 0) === 0,
    "Site-only user must not see unassigned site certificate"
  );

  // --- Inactive user ---
  const anonI = createClient(url, anonKey);
  const { data: signI, error: signIErr } = await anonI.auth.signInWithPassword({
    email: emailInactive,
    password,
  });
  assert(!signIErr && signI.session?.access_token, `signIn inactive: ${signIErr?.message}`);
  const clientI = sessionClient(signI.session.access_token);
  const { data: inactCerts } = await clientI.from("certificate_documents").select("id");
  assert((inactCerts?.length ?? 0) === 0, "Deactivated user must not see certificates");

  // --- Draft / void hidden from customer (company access user A) ---
  const { data: hiddenDraft } = await clientA
    .from("certificate_documents")
    .select("id")
    .eq("id", certDraft.id);
  assert((hiddenDraft?.length ?? 0) === 0, "Draft certificate hidden from customer");

  const { data: hiddenVoid } = await clientA
    .from("certificate_documents")
    .select("id")
    .eq("id", certVoid.id);
  assert((hiddenVoid?.length ?? 0) === 0, "Void certificate hidden from customer");

  // --- Admin sees draft + void + all companies ---
  const anonAdm = createClient(url, anonKey);
  const { data: signAdm, error: signAdmErr } = await anonAdm.auth.signInWithPassword({
    email: emailAdmin,
    password,
  });
  assert(!signAdmErr && signAdm.session?.access_token, `signIn admin: ${signAdmErr?.message}`);
  const clientAdm = sessionClient(signAdm.session.access_token);

  const { data: admDraft } = await clientAdm
    .from("certificate_documents")
    .select("id")
    .eq("id", certDraft.id);
  assert((admDraft?.length ?? 0) === 1, "Admin should see draft certificate");

  const { data: admB } = await clientAdm
    .from("companies")
    .select("id")
    .eq("id", companyB.id);
  assert((admB?.length ?? 0) === 1, "Admin should read company B");

  // --- Customer cannot mutate companies ---
  const { error: insErr } = await clientA.from("companies").insert({
    company_name: "Evil",
  });
  assert(insErr, "Customer A must not insert company");

  console.log("OK: Phase 2 RLS integration checks passed.");
} finally {
  await cleanup();
}
