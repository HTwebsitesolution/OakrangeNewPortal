/**
 * Stakeholder demo seed: realistic companies, sites, portal users and published
 * certificates (with generated sample PDFs). Idempotent — safe to re-run.
 * Automated tests continue to use: npm run test:phase6:seed
 *
 * Usage: npm run seed:demo
 * Requires portal/.env.local with SUPABASE_SERVICE_ROLE_KEY.
 * Set DEMO_PASSWORD to choose the portal user password; otherwise one is generated
 * and printed. Re-running resets demo users to the printed password.
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !serviceKey) {
  console.error("Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY in portal/.env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD =
  process.env.DEMO_PASSWORD ?? `Oakrange-Demo-${randomBytes(4).toString("hex")}`;
const UPLOADER_EMAIL = "info@oakrange.co.uk";

const DOC_TYPE_LABELS = {
  calibration_certificate: "Calibration Certificate",
  service_report: "Service Report",
  inspection_certificate: "Inspection Certificate",
  repair_certificate: "Repair Certificate",
};

const INSTRUMENTS = {
  torque: { name: "Click-type torque wrench", make: "Norbar", model: "TTi 340", range: "60 - 340 N.m", unit: "N.m", points: [68, 170, 272, 340], tol: 4, tags: ["torque"] },
  torqueSmall: { name: "Adjustable torque wrench", make: "Britool", model: "EVT 1200A", range: "20 - 100 N.m", unit: "N.m", points: [20, 50, 80, 100], tol: 4, tags: ["torque"] },
  multiplier: { name: "Torque multiplier", make: "Norbar", model: "HT-52", range: "300 - 3000 N.m", unit: "N.m", points: [600, 1500, 2400, 3000], tol: 5, tags: ["torque"] },
  pressure: { name: "Digital pressure gauge", make: "Druck", model: "DPI 104", range: "0 - 20 bar", unit: "bar", points: [0, 5, 10, 15, 20], tol: 0.1, tolAbs: true, tags: ["pressure"] },
  tyre: { name: "Tyre inflation pressure gauge", make: "PCL", model: "Accura 2", range: "0 - 10 bar", unit: "bar", points: [2, 4, 6, 8, 10], tol: 0.08, tolAbs: true, tags: ["pressure", "fleet"] },
  hydraulic: { name: "Hydraulic test gauge", make: "WIKA", model: "CPG1500", range: "0 - 400 bar", unit: "bar", points: [0, 100, 200, 300, 400], tol: 0.4, tolAbs: true, tags: ["pressure", "hydraulic"] },
  multimeter: { name: "Digital multimeter", make: "Fluke", model: "87V", range: "0 - 1000 V DC", unit: "V", points: [1, 10, 100, 500, 1000], tol: 0.05, tags: ["electrical"] },
  pat: { name: "Portable appliance tester", make: "Seaward", model: "PrimeTest 250+", range: "Insulation 0 - 299 MOhm", unit: "MOhm", points: [1, 10, 50, 100], tol: 5, tags: ["electrical"] },
  scale: { name: "Platform weighing scale", make: "Avery Weigh-Tronix", model: "ZM405", range: "0 - 600 kg", unit: "kg", points: [0, 100, 300, 500, 600], tol: 0.2, tolAbs: true, tags: ["weighing"] },
  loadcell: { name: "Crane load cell", make: "Straightpoint", model: "Radiolink plus 12t", range: "0 - 12 t", unit: "t", points: [2, 4, 8, 12], tol: 1, tags: ["lifting"] },
  inclinometer: { name: "Digital inclinometer", make: "Mitutoyo", model: "Pro 360", range: "0 - 90 deg", unit: "deg", points: [0, 15, 45, 90], tol: 0.1, tolAbs: true, tags: ["dimensional"] },
  laser: { name: "Rotating laser level", make: "Leica", model: "Rugby 680", range: "Self-levelling +/- 5 deg", unit: "mm/30m", points: [0, 0, 0], tol: 1.5, tolAbs: true, tags: ["survey"] },
  thermometer: { name: "Reference thermometer", make: "Fluke", model: "1524", range: "-50 to +150 deg C", unit: "deg C", points: [-20, 0, 37, 70, 121], tol: 0.1, tolAbs: true, tags: ["temperature"] },
  datalogger: { name: "Temperature data logger", make: "Testo", model: "184 T3", range: "-35 to +70 deg C", unit: "deg C", points: [-20, 2, 8, 25], tol: 0.5, tolAbs: true, tags: ["temperature", "cold chain"] },
};

/** Days from today: negative = past. */
function day(offset) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

const COMPANIES = [
  {
    company_name: "Meridian Logistics Group",
    primary_contact_name: "Sarah Whitfield",
    primary_contact_email: "meridian@example.com",
    phone: "0117 496 0321",
    address_line_1: "Unit 4, Severnside Trading Estate",
    town_city: "Bristol",
    postcode: "BS11 8AP",
    sites: [
      {
        key: "bristol",
        site_name: "Bristol Distribution Centre",
        site_contact_name: "Gareth Morgan",
        phone: "0117 496 0322",
        address_line_1: "Kings Weston Lane, Avonmouth",
        town_city: "Bristol",
        postcode: "BS11 0YS",
        certs: [
          { type: "calibration_certificate", inst: "torque", serial: "TTI340-118742", issue: -21 },
          { type: "calibration_certificate", inst: "pressure", serial: "DPI104-55209", issue: -64 },
          { type: "inspection_certificate", inst: "scale", serial: "ZM405-2291", issue: -118 },
          { type: "calibration_certificate", inst: "multimeter", serial: "87V-40981732", issue: -349 },
        ],
      },
      {
        key: "manchester",
        site_name: "Manchester Hub",
        site_contact_name: "Priya Shah",
        phone: "0161 496 0487",
        address_line_1: "Westinghouse Road, Trafford Park",
        town_city: "Manchester",
        postcode: "M17 1PY",
        certs: [
          { type: "calibration_certificate", inst: "torqueSmall", serial: "EVT1200-30418", issue: -9 },
          { type: "service_report", inst: "tyre", serial: "ACC2-77310", issue: -43, noDue: true },
          { type: "calibration_certificate", inst: "scale", serial: "ZM405-1874", issue: -402 },
        ],
      },
      {
        key: "southampton",
        site_name: "Southampton Port Depot",
        site_contact_name: "Tom Ellison",
        phone: "023 8049 6015",
        address_line_1: "Western Docks, Herbert Walker Avenue",
        town_city: "Southampton",
        postcode: "SO15 1HJ",
        certs: [
          { type: "calibration_certificate", inst: "tyre", serial: "ACC2-81004", issue: -30 },
          { type: "calibration_certificate", inst: "multiplier", serial: "HT52-6620", issue: -197 },
        ],
      },
    ],
    companyCerts: [
      { type: "calibration_certificate", inst: "torque", serial: "TTI340-120055", issue: -6, note: "Mobile workshop van MW-03" },
    ],
  },
  {
    company_name: "Harbourview Construction Ltd",
    primary_contact_name: "Rhys Llewellyn",
    primary_contact_email: "harbourview@example.com",
    phone: "029 2018 0444",
    address_line_1: "Harbourview House, Lloyd George Avenue",
    town_city: "Cardiff",
    postcode: "CF10 4QH",
    sites: [
      {
        key: "cardiff",
        site_name: "Cardiff Bay Development",
        site_contact_name: "Emma Price",
        phone: "029 2018 0451",
        address_line_1: "Plot 7, Ocean Way",
        town_city: "Cardiff",
        postcode: "CF24 5PE",
        certs: [
          { type: "calibration_certificate", inst: "loadcell", serial: "RLP12-09381", issue: -15 },
          { type: "calibration_certificate", inst: "torque", serial: "TTI340-117260", issue: -82 },
          { type: "calibration_certificate", inst: "inclinometer", serial: "PRO360-4412", issue: -344 },
          { type: "calibration_certificate", inst: "laser", serial: "R680-1150387", issue: -160 },
        ],
      },
      {
        key: "swansea",
        site_name: "Swansea Marina Project",
        site_contact_name: "Dylan Evans",
        phone: "01792 480 233",
        address_line_1: "Trawler Road, Maritime Quarter",
        town_city: "Swansea",
        postcode: "SA1 1UN",
        certs: [
          { type: "calibration_certificate", inst: "hydraulic", serial: "CPG1500-702215", issue: -27 },
          { type: "repair_certificate", inst: "torqueSmall", serial: "EVT1200-28807", issue: -51, noDue: true },
        ],
      },
    ],
    companyCerts: [],
  },
  {
    company_name: "Oakfield Healthcare Services",
    primary_contact_name: "Dr Helen Carter",
    primary_contact_email: "oakfield@example.com",
    phone: "0113 496 0710",
    address_line_1: "Oakfield House, Wellington Street",
    town_city: "Leeds",
    postcode: "LS1 4DL",
    sites: [
      {
        key: "leeds",
        site_name: "Oakfield General Hospital - Estates",
        site_contact_name: "Mark Fenwick",
        phone: "0113 496 0722",
        address_line_1: "Beckett Street",
        town_city: "Leeds",
        postcode: "LS9 7TF",
        certs: [
          { type: "calibration_certificate", inst: "thermometer", serial: "1524-3388102", issue: -12 },
          { type: "calibration_certificate", inst: "pat", serial: "PT250-19A0441", issue: -71 },
          { type: "calibration_certificate", inst: "datalogger", serial: "184T3-58830219", issue: -356 },
          { type: "calibration_certificate", inst: "pressure", serial: "DPI104-60117", issue: -389 },
        ],
      },
      {
        key: "harrogate",
        site_name: "Oakfield Community Clinic, Harrogate",
        site_contact_name: "Claire Booth",
        phone: "01423 496 118",
        address_line_1: "Station Parade",
        town_city: "Harrogate",
        postcode: "HG1 1TT",
        certs: [
          { type: "calibration_certificate", inst: "datalogger", serial: "184T3-58830477", issue: -36 },
          { type: "calibration_certificate", inst: "thermometer", serial: "1524-3390215", issue: -140 },
        ],
      },
    ],
    companyCerts: [],
  },
];

const USERS = [
  { email: "meridian@example.com", username: "meridianfleet", company: "Meridian Logistics Group", role: "customer_user", access: "company" },
  { email: "meridian.manager@example.com", username: "meridianmanager", company: "Meridian Logistics Group", role: "site_manager", access: ["bristol", "manchester"] },
  { email: "meridian.southampton@example.com", username: "meridiansoton", company: "Meridian Logistics Group", role: "customer_user", access: ["southampton"] },
  { email: "harbourview@example.com", username: "harbourview", company: "Harbourview Construction Ltd", role: "customer_user", access: "company" },
  { email: "oakfield@example.com", username: "oakfieldestates", company: "Oakfield Healthcare Services", role: "customer_user", access: "company" },
];

// ---------------------------------------------------------------------------
// Minimal single-page PDF writer (Helvetica, WinAnsi, ASCII text only)
// ---------------------------------------------------------------------------

function pdfEscape(text) {
  return String(text).replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7E]/g, "-");
}

function buildPdf(ops) {
  const content = ops.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];
  let out = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefAt = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

function certificatePdf({ certNo, docLabel, company, site, inst, serial, issueDate, dueDate, note }) {
  const ops = [];
  const text = (x, y, s, size = 10, bold = false) =>
    ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${pdfEscape(s)}) Tj ET`);
  const fill = (r, g, b) => ops.push(`${r} ${g} ${b} rg`);
  const stroke = (r, g, b) => ops.push(`${r} ${g} ${b} RG`);
  const rect = (x, y, w, h) => ops.push(`${x} ${y} ${w} ${h} re f`);
  const line = (x1, y1, x2, y2) => ops.push(`${x1} ${y1} m ${x2} ${y2} l S`);

  fill(0.11, 0.17, 0.29);
  rect(0, 772, 595, 70);
  fill(0.93, 0.45, 0.13);
  rect(0, 766, 595, 6);
  fill(1, 1, 1);
  text(40, 812, "OAKRANGE ENGINEERING", 18, true);
  text(40, 792, "Calibration, test and inspection services", 10);
  text(400, 812, docLabel.toUpperCase(), 11, true);
  text(400, 796, `No. ${certNo}`, 10);

  fill(0.11, 0.17, 0.29);
  let y = 735;
  const field = (label, value, x = 40, w = 130) => {
    text(x, y, label, 9, true);
    text(x + w, y, value, 10);
  };
  field("Customer", company.company_name);
  field("Certificate number", certNo, 320, 105);
  y -= 16;
  field("Site", site ? site.site_name : "Company-wide equipment");
  field("Date of issue", issueDate, 320, 105);
  y -= 16;
  const addr = site ?? company;
  field("Address", `${addr.address_line_1}, ${addr.town_city} ${addr.postcode}`);
  y -= 16;
  field("Next due", dueDate ?? "Not applicable", 40);
  y -= 30;

  stroke(0.85, 0.87, 0.9);
  line(40, y + 14, 555, y + 14);
  text(40, y, "Equipment details", 12, true);
  y -= 20;
  field("Description", inst.name);
  y -= 16;
  field("Manufacturer / model", `${inst.make} ${inst.model}`);
  y -= 16;
  field("Serial number", serial);
  y -= 16;
  field("Range", inst.range);
  if (note) {
    y -= 16;
    field("Customer reference", note);
  }
  y -= 30;

  line(40, y + 14, 555, y + 14);
  const isReport = docLabel !== "Calibration Certificate" && docLabel !== "Inspection Certificate";
  if (isReport) {
    text(40, y, docLabel === "Repair Certificate" ? "Repair carried out" : "Work carried out", 12, true);
    y -= 22;
    const lines =
      docLabel === "Repair Certificate"
        ? [
            "Unit received with inconsistent release mechanism at lower settings.",
            "Replaced cam follower and main spring; cleaned and re-lubricated mechanism.",
            "Post-repair verification performed at 20%, 60% and 100% of range - within +/- 4%.",
            "Equipment returned to service.",
          ]
        : [
            "Routine six-monthly service of tyre inflation equipment.",
            "Inspected hoses, chuck and gauge housing - no defects found.",
            "Replaced worn chuck seal; leak test passed at 10 bar for 5 minutes.",
            "Functional check against reference gauge - within tolerance.",
          ];
    for (const l of lines) {
      text(48, y, `-  ${l}`, 10);
      y -= 16;
    }
  } else {
    text(40, y, "Results", 12, true);
    y -= 22;
    const cols = [40, 150, 260, 360, 470];
    ["Nominal", "Reading", "Error", "Tolerance", "Result"].forEach((h, i) => text(cols[i], y, h, 9, true));
    y -= 6;
    line(40, y, 555, y);
    y -= 14;
    inst.points.forEach((p, i) => {
      const tolValue = inst.tolAbs ? inst.tol : Math.max((Math.abs(p) * inst.tol) / 100, 0.01);
      const decimals = tolValue >= 1 ? 1 : tolValue >= 0.05 ? 2 : 3;
      const err = tolValue * [0.18, -0.31, 0.12, -0.22, 0.27][i % 5];
      text(cols[0], y, `${p} ${inst.unit}`, 10);
      text(cols[1], y, `${(p + err).toFixed(decimals)} ${inst.unit}`, 10);
      text(cols[2], y, `${err >= 0 ? "+" : ""}${err.toFixed(decimals)}`, 10);
      text(cols[3], y, inst.tolAbs ? `+/- ${inst.tol} ${inst.unit}` : `+/- ${inst.tol}%`, 10);
      text(cols[4], y, "PASS", 10, true);
      y -= 16;
    });
    y -= 10;
    text(40, y, "Environmental conditions: 20 deg C +/- 2 deg C, 45% RH +/- 10%.", 9);
    y -= 14;
    text(40, y, "Measurements are traceable to national standards.", 9);
  }

  y -= 50;
  line(40, y + 14, 555, y + 14);
  text(40, y, "Calibrated by", 9, true);
  text(130, y, "Calibration Technician", 10);
  y -= 16;
  text(40, y, "Approved by", 9, true);
  text(130, y, "Technical Manager", 10);

  fill(0.45, 0.48, 0.54);
  text(40, 40, "Oakrange Engineering - Sample certificate for demonstration purposes.", 8);
  return buildPdf(ops);
}

// ---------------------------------------------------------------------------
// Database helpers
// ---------------------------------------------------------------------------

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
    const { data } = await admin
      .from("profiles")
      .select("id, username")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (data?.id) return data;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Profile was not created for auth user ${authUserId}`);
}

function pick(obj, keys) {
  return Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));
}

const ADDRESS_FIELDS = ["phone", "address_line_1", "town_city", "postcode"];
const COMPANY_FIELDS = ["company_name", "primary_contact_name", "primary_contact_email", ...ADDRESS_FIELDS];
const SITE_FIELDS = ["site_name", "site_contact_name", ...ADDRESS_FIELDS];

async function ensureCompany(spec) {
  const fields = pick(spec, COMPANY_FIELDS);
  const { data: existing, error } = await admin
    .from("companies")
    .select("id")
    .eq("company_name", fields.company_name)
    .maybeSingle();
  if (error) throw error;
  if (existing) {
    const { error: upErr } = await admin.from("companies").update({ ...fields, status: "active" }).eq("id", existing.id);
    if (upErr) throw upErr;
    return existing.id;
  }
  const { data, error: insErr } = await admin.from("companies").insert(fields).select("id").single();
  if (insErr) throw insErr;
  return data.id;
}

async function ensureSite(companyId, spec) {
  const fields = pick(spec, SITE_FIELDS);
  const { data: existing, error } = await admin
    .from("sites")
    .select("id")
    .eq("company_id", companyId)
    .eq("site_name", fields.site_name)
    .maybeSingle();
  if (error) throw error;
  if (existing) {
    const { error: upErr } = await admin.from("sites").update({ ...fields, status: "active" }).eq("id", existing.id);
    if (upErr) throw upErr;
    return existing.id;
  }
  const { data, error: insErr } = await admin
    .from("sites")
    .insert({ ...fields, company_id: companyId })
    .select("id")
    .single();
  if (insErr) throw insErr;
  return data.id;
}

async function ensureUser(spec, companyId, siteIds, uploaderProfileId) {
  let user = await findAuthUserByEmail(spec.email);
  if (user) {
    const { error } = await admin.auth.admin.updateUserById(user.id, { password: PASSWORD });
    if (error) throw error;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: spec.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: spec.company },
    });
    if (error) throw error;
    user = data.user;
  }

  const profile = await waitForProfile(user.id);
  const update = {
    email: spec.email,
    full_name: spec.company,
    role: spec.role,
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
}

let certSeq = 0;

async function ensureCertificate({ company, companyId, site, siteId, spec, uploaderProfileId }) {
  certSeq += 1;
  const inst = INSTRUMENTS[spec.inst];
  const issueDate = day(spec.issue);
  const dueDate = spec.noDue ? null : day(spec.issue + 365);
  const docLabel = DOC_TYPE_LABELS[spec.type];
  const certNo = `OAK-${issueDate.slice(2, 4)}${String(4100 + certSeq * 37).padStart(5, "0")}`;
  const originalFileName = `${certNo}.pdf`;
  const placeName = site ? site.site_name : company.company_name;
  const displayTitle = `${placeName} - ${docLabel} - ${formatLongDate(issueDate)}`;
  const downloadFileName = `${[
    sanitizeSegment(company.company_name),
    site ? sanitizeSegment(site.site_name) : null,
    docLabel,
    formatLongDate(issueDate),
  ]
    .filter(Boolean)
    .join(" - ")}.pdf`;

  const pdf = certificatePdf({
    certNo,
    docLabel,
    company,
    site,
    inst,
    serial: spec.serial,
    issueDate: formatLongDate(issueDate),
    dueDate: dueDate ? formatLongDate(dueDate) : null,
    note: spec.note,
  });

  const { data: existing, error: findErr } = await admin
    .from("certificate_documents")
    .select("id, storage_path")
    .eq("company_id", companyId)
    .eq("original_file_name", originalFileName)
    .maybeSingle();
  if (findErr) throw findErr;

  const id = existing?.id ?? randomUUID();
  const storagePath = existing?.storage_path ?? `certificates/${companyId}/${siteId ?? "company"}/${id}.pdf`;

  const { error: uploadErr } = await admin.storage
    .from("certificates")
    .upload(storagePath, pdf, { contentType: "application/pdf", upsert: true });
  if (uploadErr) throw uploadErr;

  const uploadedAt = new Date(`${issueDate}T10:30:00Z`);
  uploadedAt.setUTCDate(uploadedAt.getUTCDate() + 1);
  const uploadedIso = (uploadedAt > new Date() ? new Date() : uploadedAt).toISOString();

  const { error } = await admin.from("certificate_documents").upsert(
    {
      id,
      company_id: companyId,
      site_id: siteId,
      document_type: spec.type,
      original_file_name: originalFileName,
      display_title: displayTitle,
      download_file_name: downloadFileName,
      storage_path: storagePath,
      file_size_bytes: pdf.length,
      mime_type: "application/pdf",
      issue_date: issueDate,
      due_date: dueDate,
      uploaded_at: uploadedIso,
      uploaded_by: uploaderProfileId,
      published_at: uploadedIso,
      status: "active",
      notes: spec.note ?? null,
      search_tags: inst.tags,
    },
    { onConflict: "id" }
  );
  if (error) throw error;
  return { displayTitle, dueDate };
}

async function main() {
  const { data: uploader, error: upErr } = await admin
    .from("profiles")
    .select("id")
    .eq("email", UPLOADER_EMAIL)
    .eq("role", "oakrange_admin")
    .maybeSingle();
  if (upErr) throw upErr;
  if (!uploader) throw new Error(`Admin profile ${UPLOADER_EMAIL} not found (used as certificate uploader)`);

  const companyIds = {};
  const siteIdsByCompany = {};
  let certCount = 0;

  for (const company of COMPANIES) {
    const companyId = await ensureCompany(company);
    companyIds[company.company_name] = companyId;
    siteIdsByCompany[company.company_name] = {};
    console.log(`Company: ${company.company_name}`);

    for (const site of company.sites) {
      const siteId = await ensureSite(companyId, site);
      siteIdsByCompany[company.company_name][site.key] = siteId;
      console.log(`  Site: ${site.site_name}`);
      for (const spec of site.certs) {
        const { displayTitle } = await ensureCertificate({
          company,
          companyId,
          site,
          siteId,
          spec,
          uploaderProfileId: uploader.id,
        });
        certCount += 1;
        console.log(`    Certificate: ${displayTitle}`);
      }
    }
    for (const spec of company.companyCerts) {
      const { displayTitle } = await ensureCertificate({
        company,
        companyId,
        site: null,
        siteId: null,
        spec,
        uploaderProfileId: uploader.id,
      });
      certCount += 1;
      console.log(`  Company-level certificate: ${displayTitle}`);
    }
  }

  for (const spec of USERS) {
    await ensureUser(spec, companyIds[spec.company], siteIdsByCompany[spec.company], uploader.id);
    console.log(`User: ${spec.email} (${spec.role})`);
  }

  console.log(`\nDemo data ready: ${COMPANIES.length} companies, ${certCount} certificates, ${USERS.length} portal users.`);
  console.log(`Portal user password: ${PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
