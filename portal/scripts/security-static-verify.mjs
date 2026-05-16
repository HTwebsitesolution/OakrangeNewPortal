/**
 * Static security checks for the Oakrange portal (no live server required).
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = join(ROOT, "src");

const failures = [];
const passes = [];

function pass(id, detail = "") {
  passes.push({ id, detail });
  console.log(`PASS  ${id}${detail ? ` — ${detail}` : ""}`);
}

function fail(id, detail = "") {
  failures.push({ id, detail });
  console.error(`FAIL  ${id}${detail ? ` — ${detail}` : ""}`);
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(full, files);
    } else if (/\.(tsx?|jsx?|mjs)$/.test(name)) {
      files.push(full);
    }
  }
  return files;
}

function readAllSource() {
  const files = walk(SRC);
  return files.map((file) => ({ file, text: readFileSync(file, "utf8") }));
}

function main() {
  console.log("Security static verification\n");

  const sources = readAllSource();
  const clientBundles = sources.filter(({ file }) => {
    const rel = file.replace(ROOT, "").replace(/\\/g, "/");
    if (rel.includes("/api/") || rel.endsWith("route.ts")) return false;
    if (rel.includes("/lib/") || rel.includes("/actions/")) return false;
    return rel.includes("/components/") || rel.includes("/app/");
  });

  const serviceRoleInClient = clientBundles.some(({ text }) =>
    /import\s+.*createServiceRoleClient|from\s+["']@\/lib\/supabase\/service-role["']/.test(
      text
    )
  );
  if (serviceRoleInClient) {
    fail("service-role-not-in-client", "Found service role usage in client-facing source");
  } else {
    pass("service-role-not-in-client");
  }

  const nextPublicService = sources.some(({ file, text }) => {
    if (file.replace(/\\/g, "/").includes("/lib/supabase/service-role")) return false;
    return /process\.env\.NEXT_PUBLIC_[A-Z0-9_]*SERVICE[A-Z0-9_]*ROLE/.test(text);
  });
  if (nextPublicService) {
    fail("no-next-public-service-key");
  } else {
    pass("no-next-public-service-key");
  }

  const portalComponents = sources.filter(({ file }) => file.includes("components\\portal") || file.includes("components/portal"));
  const portalLeaksStorage = portalComponents.some(({ text }) =>
    /storage_path|original_file_name/.test(text)
  );
  if (portalLeaksStorage) {
    fail("portal-ui-hides-storage-path");
  } else {
    pass("portal-ui-hides-storage-path");
  }

  const signedUrlRoutes = [
    join(ROOT, "src", "app", "api", "portal", "certificates", "[id]", "signed-url", "route.ts"),
    join(ROOT, "src", "app", "api", "admin", "certificates", "[id]", "signed-url", "route.ts"),
  ];
  for (const routePath of signedUrlRoutes) {
    if (!existsSync(routePath)) {
      fail("signed-url-route-exists", routePath);
      continue;
    }
    const text = readFileSync(routePath, "utf8");
    if (!text.includes("createSignedUrl")) {
      fail("signed-url-uses-storage-api", routePath);
    } else if (
      !/createSignedUrl\([^,]+,\s*(60|120)/.test(text) &&
      !/SIGNED_URL_TTL_SECONDS\s*=\s*(60|120)/.test(text)
    ) {
      fail("signed-url-short-ttl", routePath);
    } else {
      pass("signed-url-short-ttl", routePath.split("src")[1]);
    }
    if (!text.includes("createServiceRoleClient")) {
      fail("signed-url-server-only", routePath);
    }
  }

  const auditLog = join(ROOT, "src", "lib", "audit", "log.ts");
  if (existsSync(auditLog)) {
    const text = readFileSync(auditLog, "utf8");
    if (text.includes("sanitizeAuditMetadata") && text.includes("signed_url")) {
      pass("audit-metadata-sanitized");
    } else {
      fail("audit-metadata-sanitized");
    }
  }

  const middlewarePath = join(ROOT, "src", "middleware.ts");
  if (existsSync(middlewarePath)) {
    pass("middleware-present");
  } else {
    fail("middleware-present");
  }

  const envExample = join(ROOT, ".env.example");
  if (existsSync(envExample)) {
    const text = readFileSync(envExample, "utf8");
    if (text.includes("SUPABASE_SERVICE_ROLE_KEY") && !text.includes("NEXT_PUBLIC_SUPABASE_SERVICE")) {
      pass("env-example-documents-service-role");
    } else {
      fail("env-example-documents-service-role");
    }
  } else {
    fail("env-example-exists");
  }

  console.log(`\n${passes.length} passed, ${failures.length} failed`);
  if (failures.length > 0) process.exit(1);
}

main();
