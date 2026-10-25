/**
 * Prospect demo: "Oakrange Demo Company" with two sites, real Oakrange report PDFs as
 * certificates, and three portal logins (whole company + one per site). Idempotent.
 *
 * Usage: DEMO_PASSWORD=... node scripts/seed-prospect-demo.mjs <folder-containing-the-pdfs>
 * Requires portal/.env.local with SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const PASSWORD = process.env.DEMO_PASSWORD ?? "";
const PDF_DIR = process.argv[2];

if (!url || !serviceKey) {
  console.error("Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY in portal/.env.local");
  process.exit(1);
}
if (!PASSWORD || !PDF_DIR) {
  console.error("Usage: DEMO_PASSWORD=... node scripts/seed-prospect-demo.mjs <pdf-folder>");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const UPLOADER_EMAIL = "info@oakrange.co.uk";

const COMPANY = {
  company_name: "Oakrange Demo Company",
  primary_contact_name: "Demo Contact",
  primary_contact_email: "demo@example.com",
};

const SITES = [
  {
    key: "anston",
    site_name: "Demo Site Anston",
    town_city: "Anston",
    certs: [
      {
        file: "2711_JF_KE_KM_09042026_PAT.pdf",
        type: "inspection_certificate",
        label: "PAT Testing Report",
        ref: "Report no. 47545",
        issue: "2026-04-09",
        due: "2027-04-09",
        tags: ["pat", "portable appliance testing", "electrical"],
      },
      {
        file: "76_PAT_18042016.pdf",
        type: "inspection_certificate",
        label: "PAT Testing Report",
        ref: "Report no. 2033609",
        issue: "2016-04-13",
        due: "2017-04-13",
        tags: ["pat", "portable appliance testing", "electrical"],
      },
      {
        file: "76_EML_29042016.pdf",
        type: "inspection_certificate",
        label: "Emergency Lighting Test Certificate",
        ref: "Certificate no. 2033703",
        issue: "2016-04-14",
        due: "2017-04-14",
        tags: ["emergency lighting", "bs 5266"],
      },
      {
        file: "2711_09042026.pdf",
        type: "calibration_certificate",
        label: "Small Tool Calibration Report",
        ref: "Certificates A321593E - A321622E (30 tools)",
        issue: "2026-04-09",
        due: "2027-04-09",
        tags: ["calibration", "small tools", "torque", "pressure", "multimeter"],
      },
    ],
  },
  {
    key: "barnsley",
    site_name: "Demo Site Barnsley",
    town_city: "Barnsley",
    certs: [
      {
        file: "76_FW_15042016.pdf",
        type: "inspection_certificate",
        label: "Electrical Installation Condition Report (EICR)",
        ref: "Report no. 2033801",
        issue: "2016-04-15",
        due: "2021-04-18",
        tags: ["eicr", "fixed wire", "electrical"],
      },
      {
        file: "76_FA_29042016.pdf",
        type: "service_report",
        label: "Fire Alarm Inspection and Servicing Report",
        ref: "Certificate no. 2033702",
        issue: "2016-04-14",
        due: "2017-04-14",
        tags: ["fire alarm", "bs 5839"],
      },
    ],
  },
];

const USERS = [
  { email: "demo@example.com", username: "Demo2026", access: "company" },
  { email: "demo.anston@example.com", username: "Anston2026", access: ["anston"] },
  { email: "demo.barnsley@example.com", username: "Barnsley2026", access: ["barnsley"] },
];

function formatLongDate(iso) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`)
  );
}

function sanitizeSegment(value) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ").replace(/\.+$/g, "").replace(/\s+/g, " ").trim();
}

async function findAuthUserByEmail(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) return null;
  }
}

async function waitForProfile(authUserId) {
  for (let i = 0; i < 15; i++) {
    const { data } = await admin.from("profiles").select("id, username").eq("auth_user_id", authUserId).maybeSingle();
    if (data?.id) return data;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Profile was not created for auth user ${authUserId}`);
}

async function ensureCompany() {
  const { data: existing, error } = await admin
    .from("companies")
    .select("id, customer_id_readable")
    .eq("company_name", COMPANY.company_name)
    .maybeSingle();
  if (error) throw error;
  if (existing) {
    const { error: upErr } = await admin.from("companies").update({ ...COMPANY, status: "active" }).eq("id", existing.id);
    if (upErr) throw upErr;
    return existing;
  }
  const { data, error: insErr } = await admin.from("companies").insert(COMPANY).select("id, customer_id_readable").single();
  if (insErr) throw insErr;
  return data;
}

async function ensureSite(companyId, { site_name, town_city }) {
  const { data: existing, error } = await admin
    .from("sites")
    .select("id")
    .eq("company_id", companyId)
    .eq("site_name", site_name)
    .maybeSingle();
  if (error) throw error;
  if (existing) {
    const { error: upErr } = await admin.from("sites").update({ town_city, status: "active" }).eq("id", existing.id);
    if (upErr) throw upErr;
    return existing.id;
  }
  const { data, error: insErr } = await admin
    .from("sites")
    .insert({ company_id: companyId, site_name, town_city })
    .select("id")
    .single();
  if (insErr) throw insErr;
  return data.id;
}

async function ensureCertificate({ companyId, site, siteId, spec, uploaderProfileId }) {
  const pdf = readFileSync(join(PDF_DIR, spec.file));
  const displayTitle = `${site.site_name} - ${spec.label} - ${formatLongDate(spec.issue)}`;
  const downloadFileName = `${[COMPANY.company_name, site.site_name, spec.label, formatLongDate(spec.issue)]
    .map(sanitizeSegment)
    .join(" - ")}.pdf`;

  const { data: existing, error: findErr } = await admin
    .from("certificate_documents")
    .select("id, storage_path, uploaded_at")
    .eq("company_id", companyId)
    .eq("original_file_name", spec.file)
    .maybeSingle();
  if (findErr) throw findErr;

  const id = existing?.id ?? randomUUID();
  const storagePath = existing?.storage_path ?? `certificates/${companyId}/${siteId}/${id}.pdf`;

  const { error: uploadErr } = await admin.storage
    .from("certificates")
    .upload(storagePath, pdf, { contentType: "application/pdf", upsert: true });
  if (uploadErr) throw uploadErr;

  const uploadedAt = existing?.uploaded_at ?? new Date().toISOString();
  const { error } = await admin.from("certificate_documents").upsert(
    {
      id,
      company_id: companyId,
      site_id: siteId,
      document_type: spec.type,
      original_file_name: spec.file,
      display_title: displayTitle,
      download_file_name: downloadFileName,
      storage_path: storagePath,
      file_size_bytes: pdf.length,
      mime_type: "application/pdf",
      issue_date: spec.issue,
      due_date: spec.due,
      uploaded_at: uploadedAt,
      uploaded_by: uploaderProfileId,
      published_at: uploadedAt,
      status: "active",
      notes: spec.ref,
      search_tags: spec.tags,
    },
    { onConflict: "id" }
  );
  if (error) throw error;
  return displayTitle;
}

async function ensureUser(spec, companyId, siteIds, uploaderProfileId) {
  const { data: taken, error: takenErr } = await admin
    .from("profiles")
    .select("email")
    .ilike("username", spec.username)
    .maybeSingle();
  if (takenErr) throw takenErr;
  if (taken && taken.email.toLowerCase() !== spec.email.toLowerCase()) {
    throw new Error(`Username ${spec.username} already belongs to ${taken.email}`);
  }

  let user = await findAuthUserByEmail(spec.email);
  if (user) {
    const { error } = await admin.auth.admin.updateUserById(user.id, { password: PASSWORD });
    if (error) throw error;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: spec.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: COMPANY.company_name },
    });
    if (error) throw error;
    user = data.user;
  }

  const profile = await waitForProfile(user.id);
  const update = {
    email: spec.email,
    full_name: COMPANY.company_name,
    role: "customer_user",
    admin_level: null,
    company_id: companyId,
    is_active: true,
  };
  if (!profile.username) update.username = spec.username;
  const { error: upErr } = await admin.from("profiles").update(update).eq("id", profile.id);
  if (upErr) throw upErr;

  const { error: delErr } = await admin.from("user_site_access").delete().eq("user_id", profile.id);
  if (delErr) throw delErr;
  const grants =
    spec.access === "company"
      ? [{ user_id: profile.id, company_id: companyId, site_id: null, access_type: "company", created_by: uploaderProfileId }]
      : spec.access.map((k) => ({
          user_id: profile.id,
          company_id: companyId,
          site_id: siteIds[k],
          access_type: "site",
          created_by: uploaderProfileId,
        }));
  const { error: grantErr } = await admin.from("user_site_access").insert(grants);
  if (grantErr) throw grantErr;
  return profile.username ?? spec.username;
}

async function main() {
  const missing = SITES.flatMap((s) => s.certs.map((c) => c.file)).filter((f) => !existsSync(join(PDF_DIR, f)));
  if (missing.length) throw new Error(`Missing PDFs in ${PDF_DIR}: ${missing.join(", ")}`);

  const { data: uploader, error: upErr } = await admin
    .from("profiles")
    .select("id")
    .eq("email", UPLOADER_EMAIL)
    .eq("role", "oakrange_admin")
    .maybeSingle();
  if (upErr) throw upErr;
  if (!uploader) throw new Error(`Admin profile ${UPLOADER_EMAIL} not found (used as certificate uploader)`);

  const company = await ensureCompany();
  console.log(`Company: ${COMPANY.company_name} (${company.customer_id_readable})`);

  const siteIds = {};
  for (const site of SITES) {
    siteIds[site.key] = await ensureSite(company.id, site);
    console.log(`  Site: ${site.site_name}`);
    for (const spec of site.certs) {
      const title = await ensureCertificate({
        companyId: company.id,
        site,
        siteId: siteIds[site.key],
        spec,
        uploaderProfileId: uploader.id,
      });
      console.log(`    Certificate: ${title}`);
    }
  }

  for (const spec of USERS) {
    const username = await ensureUser(spec, company.id, siteIds, uploader.id);
    const scope = spec.access === "company" ? "whole company" : spec.access.join(", ");
    console.log(`User: ${username} / ${spec.email} (${scope})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
