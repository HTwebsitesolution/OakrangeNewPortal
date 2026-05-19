/**
 * Verifies admin_level permission rules (no database required).
 * Mirrors portal/src/lib/auth/admin-permissions.ts.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "..", "src", "lib", "auth", "admin-permissions.ts");

function isSuperAdmin(p) {
  return p.role === "oakrange_admin" && p.admin_level === "super_admin";
}

function canCreateInternalAdmin(actor) {
  return isSuperAdmin(actor);
}

function canEditInternalAdmin(actor) {
  return isSuperAdmin(actor);
}

function canDeactivateAdmin(actor, target) {
  if (target.role !== "oakrange_admin") return true;
  if (!isSuperAdmin(actor)) return false;
  if (target.admin_level === "super_admin") return false;
  return true;
}

function canAssignAdminLevel(actor, level) {
  if (level === "super_admin") return isSuperAdmin(actor);
  return canCreateInternalAdmin(actor);
}

const failures = [];

function assert(label, cond) {
  if (!cond) failures.push(label);
}

const superAdmin = { role: "oakrange_admin", admin_level: "super_admin" };
const normalAdmin = { role: "oakrange_admin", admin_level: "admin" };
const customer = { role: "customer_user", admin_level: null };
const superTarget = { role: "oakrange_admin", admin_level: "super_admin" };
const adminTarget = { role: "oakrange_admin", admin_level: "admin" };

assert("super can create internal", canCreateInternalAdmin(superAdmin));
assert("normal cannot create internal", !canCreateInternalAdmin(normalAdmin));
assert("super can edit internal", canEditInternalAdmin(superAdmin));
assert("normal cannot edit internal", !canEditInternalAdmin(normalAdmin));
assert("super can assign super level", canAssignAdminLevel(superAdmin, "super_admin"));
assert("normal cannot assign super level", !canAssignAdminLevel(normalAdmin, "super_admin"));
assert("normal cannot deactivate super", !canDeactivateAdmin(normalAdmin, superTarget));
assert("normal cannot deactivate admin", !canDeactivateAdmin(normalAdmin, adminTarget));
assert("super can deactivate admin", canDeactivateAdmin(superAdmin, adminTarget));
assert("super cannot deactivate super", !canDeactivateAdmin(superAdmin, superTarget));
assert("admin can deactivate customer", canDeactivateAdmin(normalAdmin, customer));

const src = readFileSync(SRC, "utf8");
assert("users.ts uses canCreateInternalAdmin", readFileSync(resolve(__dirname, "..", "src", "actions", "admin", "users.ts"), "utf8").includes("canCreateInternalAdmin"));
assert("migration exists", readFileSync(resolve(__dirname, "..", "supabase", "migrations", "20260519120000_add_admin_level.sql"), "utf8").includes("admin_level"));

if (failures.length) {
  console.error("FAIL admin-level-verify:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("PASS admin-level-verify");
