/**
 * Verifies Tailwind/CSS loads on admin + portal routes (direct + client navigation).
 * Requires ONE dev server on BASE_URL (default http://127.0.0.1:3000) and .env.local.
 *
 * Usage: npm run test:phase9:ui
 */
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.UI_VERIFY_BASE_URL ?? "http://127.0.0.1:3000";
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
}

async function assertOakStyles(page, label) {
  const result = await page.evaluate(() => {
    const aside = document.querySelector("aside");
    const sheets = [...document.styleSheets].filter((s) => {
      try {
        return s.href?.includes("/_next/static/css/") && s.cssRules.length > 5;
      } catch {
        return false;
      }
    });
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const asideBg = aside ? getComputedStyle(aside).backgroundColor : null;
    const navLink = document.querySelector("aside nav a");
    const linkDisplay = navLink ? getComputedStyle(navLink).display : null;
    return {
      cssSheets: sheets.length,
      bodyBg,
      asideBg,
      linkDisplay,
      hasAside: Boolean(aside),
    };
  });

  const navy = "rgb(15, 23, 42)";
  const ok =
    result.cssSheets >= 1 &&
    result.hasAside &&
    result.asideBg === navy &&
    result.linkDisplay === "block";

  if (!ok) {
    throw new Error(
      `${label}: styles missing or layout broken — ${JSON.stringify(result)}`
    );
  }
  console.log(`  OK ${label}`);
}

async function visit(page, path, label = path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await waitForStyles(page);
  await assertOakStyles(page, label);
}

async function main() {
  if (!supabaseUrl || !anonKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }

  try {
    const res = await fetch(`${BASE}/login`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    console.error(
      `Cannot reach ${BASE}. Start a single dev server: npm run dev:clean (in portal/)`
    );
    console.error(err.message);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const failures = [];

  async function runSuite(name, email, routes, clientNavTest) {
    console.log(`\n${name}`);
    const session = await signIn(email);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addCookies(authCookies(session));
    const page = await context.newPage();

    for (const [path, label] of routes) {
      try {
        await visit(page, path, label ?? path);
      } catch (err) {
        failures.push(`${name} ${label ?? path}: ${err.message}`);
        console.error(`  FAIL ${label ?? path}: ${err.message}`);
      }
    }

    if (clientNavTest) {
      try {
        await visit(page, clientNavTest.from, `${clientNavTest.label} (from)`);
        await page.getByRole("link", { name: clientNavTest.linkText }).click();
        await page.waitForURL(`**${clientNavTest.to}**`, { timeout: 15000 });
        await waitForStyles(page);
        await assertOakStyles(page, `${clientNavTest.label} (click nav)`);
      } catch (err) {
        failures.push(`${name} ${clientNavTest.label} click: ${err.message}`);
        console.error(`  FAIL ${clientNavTest.label} click: ${err.message}`);
      }
    }

    await context.close();
  }

  const adminRoutes = [
    ["/admin/dashboard"],
    ["/admin/customers"],
    ["/admin/customers/new"],
    ["/admin/sites"],
    ["/admin/users"],
    ["/admin/users/new"],
    ["/admin/certificates"],
    ["/admin/certificates/upload"],
    ["/admin/expiring-soon"],
    ["/admin/audit-logs"],
    ["/admin/settings"],
  ];

  const portalRoutes = [
    ["/portal/dashboard"],
    ["/portal/certificates"],
    ["/portal/sites"],
    ["/portal/support"],
    ["/portal/account"],
  ];

  await runSuite("Admin", ADMIN, adminRoutes, {
    from: "/admin/customers",
    linkText: "New customer",
    to: "/admin/customers/new",
    label: "New customer",
  });

  await runSuite("Portal", PORTAL, portalRoutes);

  await browser.close();

  if (failures.length) {
    console.error(`\n${failures.length} failure(s). If CSS is missing, run: npm run dev:clean`);
    process.exit(1);
  }
  console.log("\nAll routes passed CSS/layout checks.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
