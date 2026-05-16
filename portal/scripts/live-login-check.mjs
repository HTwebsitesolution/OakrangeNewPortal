/**
 * Live UI login + navigation smoke test (real form submit, not cookie injection).
 * Usage: node scripts/live-login-check.mjs
 * Requires dev server on http://localhost:3000
 */
import { chromium } from "playwright";

const BASE = process.env.UI_VERIFY_BASE_URL ?? "http://localhost:3000";
const PASSWORD = "Oakrange-Test-2026-Phase3!";
const ADMIN = "admin@oakrange-test.co.uk";
const PORTAL = "alpha.company@oakrange-test.co.uk";

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

async function assertNoError(page, label) {
  const text = await page.locator("body").innerText();
  if (/Cannot find module|Runtime Error|Application error/i.test(text)) {
    throw new Error(`${label}: runtime error on page`);
  }
}

async function assertAppShell(page, label) {
  const result = await page.evaluate(() => {
    const aside = document.querySelector("aside");
    const sheets = [...document.styleSheets].filter((s) => {
      try {
        return s.href?.includes("/_next/static/css/") && s.cssRules.length > 5;
      } catch {
        return false;
      }
    });
    return {
      cssSheets: sheets.length,
      asideBg: aside ? getComputedStyle(aside).backgroundColor : null,
      hasAside: Boolean(aside),
    };
  });
  const ok =
    result.cssSheets >= 1 &&
    result.hasAside &&
    result.asideBg === "rgb(15, 23, 42)";
  if (!ok) throw new Error(`${label}: layout/CSS check failed — ${JSON.stringify(result)}`);
}

async function liveSignIn(page, email) {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await waitForStyles(page);

  if (!page.url().includes("/login")) {
    throw new Error(`Expected /login after clearCookies, got ${page.url()}`);
  }

  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: /^Sign in$/i }).click();

  await page.waitForURL(/\/(admin|portal)\//, { timeout: 20000 });
  await waitForStyles(page);
  await assertNoError(page, `after login ${email}`);
  await assertAppShell(page, `after login ${email}`);
  console.log(`  LOGIN OK ${email} → ${page.url()}`);
}

async function visit(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await waitForStyles(page);
  await assertNoError(page, path);
  await assertAppShell(page, path);
  console.log(`  OK ${path}`);
}

async function signOut(page) {
  await page.getByRole("button", { name: "Logout" }).click();
  await page.waitForURL(/\/login/, { timeout: 15000 });
  console.log("  LOGOUT OK → /login");
}

async function clickNewCustomer(page) {
  await page.goto(`${BASE}/admin/customers`, { waitUntil: "networkidle" });
  await waitForStyles(page);
  await page.getByRole("link", { name: "New customer" }).click();
  await page.waitForURL(/\/admin\/customers\/new/, { timeout: 15000 });
  await waitForStyles(page);
  await assertNoError(page, "/admin/customers/new (click)");
  await assertAppShell(page, "/admin/customers/new (click)");
  console.log("  OK Customers → New customer (click)");
}

async function main() {
  try {
    const res = await fetch(`${BASE}/login`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    console.error(`Dev server not reachable at ${BASE}. Run: npm run dev:clean`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const failures = [];

  const adminRoutes = [
    "/admin/dashboard",
    "/admin/customers",
    "/admin/customers/new",
    "/admin/sites",
    "/admin/users",
    "/admin/certificates",
    "/admin/audit-logs",
    "/admin/settings",
  ];

  const portalRoutes = [
    "/portal/dashboard",
    "/portal/certificates",
    "/portal/sites",
    "/portal/support",
    "/portal/account",
  ];

  try {
    console.log("\n=== Admin live login ===");
    await liveSignIn(page, ADMIN);
    for (const path of adminRoutes) await visit(page, path);
    await clickNewCustomer(page);
    await signOut(page);

    console.log("\n=== Portal live login ===");
    await liveSignIn(page, PORTAL);
    for (const path of portalRoutes) await visit(page, path);
    await signOut(page);
  } catch (err) {
    failures.push(err.message);
    console.error(`  FAIL: ${err.message}`);
  }

  await browser.close();

  if (failures.length) {
    console.error("\nLive login check failed.");
    process.exit(1);
  }
  console.log("\nLive login check passed — sign-in, navigation, CSS, and logout all OK.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
