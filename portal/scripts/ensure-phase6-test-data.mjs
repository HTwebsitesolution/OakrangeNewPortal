/**
 * Phase 6 acceptance test data (service role). Idempotent where possible.
 * Usage: node scripts/ensure-phase6-test-data.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TAG = "phase6-test";
const PASSWORD = "Oakrange-Test-2026-Phase3!";

const COMPANIES = {
  alpha: "Test Alpha Transport Ltd",
  beta: "Test Beta Engineering Ltd",
};

const SITES = {
  alpha1: "Alpha Site 1",
  alpha2: "Alpha Site 2",
  beta1: "Beta Site 1",
};

const USERS = [
  { email: "admin@oakrange-test.co.uk", role: "oakrange_admin", company: null, inactive: false, noProfile: false },
  { email: "alpha.company@oakrange-test.co.uk", role: "customer_user", company: "alpha", inactive: false, noProfile: false },
  { email: "alpha.site1@oakrange-test.co.uk", role: "customer_user", company: "alpha", inactive: false, noProfile: false },
  { email: "alpha.manager@oakrange-test.co.uk", role: "site_manager", company: "alpha", inactive: false, noProfile: false },
  { email: "beta.customer@oakrange-test.co.uk", role: "customer_user", company: "beta", inactive: false, noProfile: false },
  { email: "inactive@oakrange-test.co.uk", role: "customer_user", company: "alpha", inactive: true, noProfile: false },
  { email: "noprofile@oakrange-test.co.uk", role: "customer_user", company: null, inactive: false, noProfile: true },
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

if (!url || !serviceKey) {
  console.error("Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY in portal/.env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const pdfBytes = readFileSync(resolve(__dirname, "../tests/fixtures/certificate-valid.pdf"));

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

async function findAuthUserByEmail(email) {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function ensureAuthUser(email) {
  const existing = await findAuthUserByEmail(email);
  if (existing) {
    const { error: pwErr } = await admin.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
    });
    if (pwErr) throw pwErr;
    return existing;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user;
}

async function waitForProfile(authUserId, attempts = 12) {
  for (let i = 0; i < attempts; i++) {
    const { data } = await admin.from("profiles").select("id").eq("auth_user_id", authUserId).maybeSingle();
    if (data?.id) return data.id;
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

async function ensureCompany(name) {
  const { data: existing } = await admin.from("companies").select("id").eq("company_name", name).maybeSingle();
  if (existing?.id) return existing.id;
  const { data, error } = await admin.from("companies").insert({ company_name: name }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function ensureSite(companyId, siteName) {
  const { data: existing } = await admin
    .from("sites")
    .select("id")
    .eq("company_id", companyId)
    .eq("site_name", siteName)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const { data, error } = await admin
    .from("sites")
    .insert({ company_id: companyId, site_name: siteName })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function upsertAccess({ userId, companyId, siteId, accessType, createdBy }) {
  if (accessType === "company") {
    const { data: existing } = await admin
      .from("user_site_access")
      .select("id")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .eq("access_type", "company")
      .maybeSingle();
    if (existing?.id) return existing.id;
    const { data, error } = await admin
      .from("user_site_access")
      .insert({ user_id: userId, company_id: companyId, site_id: null, access_type: "company", created_by: createdBy })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  }
  const { data: existing } = await admin
    .from("user_site_access")
    .select("id")
    .eq("user_id", userId)
    .eq("site_id", siteId)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const { data, error } = await admin
    .from("user_site_access")
    .insert({
      user_id: userId,
      company_id: companyId,
      site_id: siteId,
      access_type: "site",
      created_by: createdBy,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function ensureCertificate(spec, ctx) {
  const { data: existing } = await admin
    .from("certificate_documents")
    .select("id, storage_path")
    .contains("search_tags", [TAG])
    .eq("display_title", spec.displayTitle)
    .maybeSingle();

  const certId = existing?.id ?? randomUUID();
  const storagePath =
    existing?.storage_path ??
    `certificates/${ctx.companyId}/${spec.siteId ?? "company"}/${certId}.pdf`;

  if (!existing?.id) {
    const { error: uploadErr } = await admin.storage
      .from("certificates")
      .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (uploadErr) throw uploadErr;
  }

  const row = {
    id: certId,
    company_id: ctx.companyId,
    site_id: spec.siteId ?? null,
    document_type: "calibration_certificate",
    original_file_name: `random-${certId}.pdf`,
    display_title: spec.displayTitle,
    download_file_name: `${spec.displayTitle}.pdf`,
    storage_path: storagePath,
    file_size_bytes: pdfBytes.length,
    mime_type: "application/pdf",
    issue_date: spec.issueDate,
    due_date: spec.dueDate ?? null,
    uploaded_at: spec.uploadedAt ?? new Date().toISOString(),
    uploaded_by: ctx.adminProfileId,
    published_at: spec.published ? new Date().toISOString() : null,
    status: spec.status ?? "active",
    notes: `${TAG} ${spec.key}`,
    search_tags: [TAG, spec.key],
  };

  const { data, error } = await admin
    .from("certificate_documents")
    .upsert(row, { onConflict: "id" })
    .select("id, key:search_tags")
    .single();
  if (error) throw error;
  return data.id;
}

async function main() {
  const companyAlpha = await ensureCompany(COMPANIES.alpha);
  const companyBeta = await ensureCompany(COMPANIES.beta);
  const siteAlpha1 = await ensureSite(companyAlpha, SITES.alpha1);
  const siteAlpha2 = await ensureSite(companyAlpha, SITES.alpha2);
  const siteBeta1 = await ensureSite(companyBeta, SITES.beta1);

  const companies = { alpha: companyAlpha, beta: companyBeta };
  const sites = { alpha1: siteAlpha1, alpha2: siteAlpha2, beta1: siteBeta1 };

  const profileIds = {};

  for (const spec of USERS) {
    const user = await ensureAuthUser(spec.email);
    let profileId = await waitForProfile(user.id);

    if (spec.noProfile) {
      if (profileId) {
        await admin.from("profiles").delete().eq("id", profileId);
        profileId = null;
      }
      profileIds[spec.email] = null;
      console.log(`Auth only (no profile): ${spec.email}`);
      continue;
    }

    if (!profileId) {
      throw new Error(`Missing profile for ${spec.email}`);
    }

    const company_id = spec.company ? companies[spec.company] : null;
    const { error: upErr } = await admin
      .from("profiles")
      .update({
        role: spec.role,
        company_id,
        is_active: !spec.inactive,
        email: spec.email,
        full_name: spec.email.split("@")[0],
      })
      .eq("id", profileId);
    if (upErr) throw upErr;
    profileIds[spec.email] = profileId;
    console.log(`Profile ready: ${spec.email} (${spec.role})`);
  }

  const adminProfileId = profileIds["admin@oakrange-test.co.uk"];
  const ctx = { adminProfileId, companyId: companyAlpha };

  // Clear old access for phase6 users then re-grant
  for (const email of [
    "alpha.company@oakrange-test.co.uk",
    "alpha.site1@oakrange-test.co.uk",
    "alpha.manager@oakrange-test.co.uk",
    "beta.customer@oakrange-test.co.uk",
  ]) {
    const uid = profileIds[email];
    if (uid) await admin.from("user_site_access").delete().eq("user_id", uid);
  }

  await upsertAccess({
    userId: profileIds["alpha.company@oakrange-test.co.uk"],
    companyId: companyAlpha,
    accessType: "company",
    createdBy: adminProfileId,
  });
  await upsertAccess({
    userId: profileIds["alpha.site1@oakrange-test.co.uk"],
    companyId: companyAlpha,
    siteId: siteAlpha1,
    accessType: "site",
    createdBy: adminProfileId,
  });
  await upsertAccess({
    userId: profileIds["alpha.manager@oakrange-test.co.uk"],
    companyId: companyAlpha,
    siteId: siteAlpha1,
    accessType: "site",
    createdBy: adminProfileId,
  });
  await upsertAccess({
    userId: profileIds["alpha.manager@oakrange-test.co.uk"],
    companyId: companyAlpha,
    siteId: siteAlpha2,
    accessType: "site",
    createdBy: adminProfileId,
  });
  await upsertAccess({
    userId: profileIds["beta.customer@oakrange-test.co.uk"],
    companyId: companyBeta,
    accessType: "company",
    createdBy: adminProfileId,
  });

  const certSpecs = [
    { key: "alpha-site1-active", displayTitle: "P6 Alpha Site 1 Active", siteId: siteAlpha1, issueDate: daysAgo(5), dueDate: daysAgo(-60), published: true, status: "active" },
    { key: "alpha-site2-active", displayTitle: "P6 Alpha Site 2 Active", siteId: siteAlpha2, issueDate: daysAgo(10), dueDate: daysAgo(-90), published: true, status: "active" },
    { key: "alpha-company-level", displayTitle: "P6 Alpha Company Level", siteId: null, issueDate: daysAgo(3), dueDate: daysAgo(-45), published: true, status: "active" },
    { key: "alpha-site1-expired", displayTitle: "P6 Alpha Site 1 Expired", siteId: siteAlpha1, issueDate: daysAgo(400), dueDate: daysAgo(30), published: true, status: "active" },
    { key: "alpha-site1-draft", displayTitle: "P6 Alpha Site 1 Draft", siteId: siteAlpha1, issueDate: daysAgo(1), dueDate: null, published: false, status: "active" },
    { key: "alpha-site1-void", displayTitle: "P6 Alpha Site 1 Void", siteId: siteAlpha1, issueDate: daysAgo(200), dueDate: null, published: true, status: "void" },
    { key: "alpha-site1-replaced", displayTitle: "P6 Alpha Site 1 Replaced", siteId: siteAlpha1, issueDate: daysAgo(300), dueDate: null, published: true, status: "replaced" },
    { key: "alpha-site1-archived", displayTitle: "P6 Alpha Site 1 Archived", siteId: siteAlpha1, issueDate: daysAgo(350), dueDate: null, published: true, status: "archived" },
    { key: "alpha-site1-newer-sort", displayTitle: "P6 Alpha Site 1 Newer Sort", siteId: siteAlpha1, issueDate: daysAgo(2), uploadedAt: new Date().toISOString(), dueDate: daysAgo(-20), published: true, status: "active" },
    { key: "alpha-site1-older-sort", displayTitle: "P6 Alpha Site 1 Older Sort", siteId: siteAlpha1, issueDate: daysAgo(2), uploadedAt: new Date(Date.now() - 86400000 * 5).toISOString(), dueDate: daysAgo(-25), published: true, status: "active" },
    { key: "beta-site1-active", displayTitle: "P6 Beta Site 1 Active", companyId: companyBeta, siteId: siteBeta1, issueDate: daysAgo(7), dueDate: daysAgo(-30), published: true, status: "active" },
  ];

  const ids = {};
  for (const spec of certSpecs) {
    const companyId = spec.companyId ?? companyAlpha;
    ids[spec.key] = await ensureCertificate(spec, { ...ctx, companyId });
  }

  const manifest = {
    password: PASSWORD,
    companies: { alpha: companyAlpha, beta: companyBeta },
    sites,
    profiles: profileIds,
    certificates: ids,
  };

  const outPath = resolve(__dirname, "../.phase6-test-manifest.json");
  await import("node:fs/promises").then((fs) =>
    fs.writeFile(outPath, JSON.stringify(manifest, null, 2))
  );

  console.log("\nPhase 6 test data ready.");
  console.log(`Manifest: ${outPath}`);
  console.log(`Password (all users): ${PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
