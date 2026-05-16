/**
 * Capture Phase 9 UI screenshots. Requires dev server on BASE_URL and .env.local.
 * Usage: node scripts/capture-phase9-screenshots.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../docs/screenshots/phase9");
const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:3000";
const PASSWORD = "Oakrange-Test-2026-Phase3!";
const ADMIN = "admin@oakrange-test.co.uk";
const PORTAL = "alpha.company@oakrange-test.co.uk";

function loadEnvLocal() {
  const envPath = resolve(__dirname, "../.env.local");
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

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function certId() {
  const manifestPath = resolve(__dirname, "../.phase6-test-manifest.json");
  if (!existsSync(manifestPath)) return null;
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  return manifest.certificates?.["alpha-site1-active"] ?? null;
}

async function signIn(email) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`${email}: ${error.message}`);
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) throw new Error(`No session for ${email}`);
  return session;
}

function authCookies(session) {
  const ref = new URL(supabaseUrl).hostname.split(".")[0];
  const value = encodeURIComponent(JSON.stringify(session));
  return [
    {
      name: `sb-${ref}-auth-token`,
      value,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ];
}

async function shot(page, name) {
  const path = resolve(OUT, name);
  await page.screenshot({ path, fullPage: true });
  console.log("Saved", path);
}

async function waitForStyles(page) {
  await page.waitForFunction(() => {
    const sheet = [...document.styleSheets].find((s) => {
      try {
        return s.href?.includes("/_next/static/css/");
      } catch {
        return false;
      }
    });
    if (!sheet) return false;
    try {
      return sheet.cssRules.length > 10;
    } catch {
      return true;
    }
  }, { timeout: 20000 });
  await page.waitForTimeout(300);
}

async function gotoShot(page, file, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await waitForStyles(page);
  await shot(page, file);
}

async function main() {
  if (!supabaseUrl || !anonKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }

  mkdirSync(OUT, { recursive: true });
  const certificateId = certId();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const loginPage = await context.newPage();
  await loginPage.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await waitForStyles(loginPage);
  await shot(loginPage, "01-login.png");
  await loginPage.close();

  const adminSession = await signIn(ADMIN);
  const adminContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await adminContext.addCookies(authCookies(adminSession));
  const adminPage = await adminContext.newPage();

  for (const [file, path] of [
    ["02-admin-dashboard.png", "/admin/dashboard"],
    ["03-admin-customers.png", "/admin/customers"],
    ["04-admin-certificates.png", "/admin/certificates"],
    ["05-admin-certificates-upload.png", "/admin/certificates/upload"],
    ["06-admin-audit-logs.png", "/admin/audit-logs"],
  ]) {
    await gotoShot(adminPage, file, path);
  }
  await adminContext.close();

  const portalSession = await signIn(PORTAL);
  const portalContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await portalContext.addCookies(authCookies(portalSession));
  const portalPage = await portalContext.newPage();

  for (const [file, path] of [
    ["07-portal-dashboard.png", "/portal/dashboard"],
    ["08-portal-certificates.png", "/portal/certificates"],
    [
      "09-portal-certificate-detail.png",
      certificateId ? `/portal/certificates/${certificateId}` : "/portal/certificates",
    ],
    ["10-portal-sites.png", "/portal/sites"],
  ]) {
    await gotoShot(portalPage, file, path);
  }

  await browser.close();
  console.log("\nDone. Screenshots in", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
