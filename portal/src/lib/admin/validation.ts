import { isSuperAdmin } from "@/lib/auth/admin-permissions";
import type { AdminLevel, SessionProfile, UserRole } from "@/types/profile";

export type CompanyStatus = "active" | "inactive";
export type SiteStatus = "active" | "inactive";

export const COMPANY_STATUSES: CompanyStatus[] = ["active", "inactive"];
export const SITE_STATUSES: SiteStatus[] = ["active", "inactive"];
export const USER_ROLES: UserRole[] = [
  "oakrange_admin",
  "site_manager",
  "customer_user",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseCompanyStatus(v: string | null | undefined): CompanyStatus {
  return v === "inactive" ? "inactive" : "active";
}

export function parseSiteStatus(v: string | null | undefined): SiteStatus {
  return v === "inactive" ? "inactive" : "active";
}

export function parseUserRole(v: string | null | undefined): UserRole | null {
  if (v === "oakrange_admin" || v === "site_manager" || v === "customer_user") {
    return v;
  }
  return null;
}

export function parseAdminLevel(v: string | null | undefined): AdminLevel | null {
  if (v === "super_admin" || v === "admin") return v;
  return null;
}

export const ADMIN_LEVELS: AdminLevel[] = ["super_admin", "admin"];

/** Roles an actor may assign when creating or editing users. */
export function creatableRolesForActor(actor: SessionProfile): UserRole[] {
  if (isSuperAdmin(actor)) return USER_ROLES;
  return USER_ROLES.filter((r) => r !== "oakrange_admin");
}

export function validateCompanyForm(data: {
  company_name: string;
  status: CompanyStatus;
}): string | null {
  if (!data.company_name?.trim()) return "Company name is required.";
  if (!COMPANY_STATUSES.includes(data.status)) return "Invalid status.";
  return null;
}

export function validateSiteForm(data: { site_name: string; status: SiteStatus }): string | null {
  if (!data.site_name?.trim()) return "Site name is required.";
  if (!SITE_STATUSES.includes(data.status)) return "Invalid status.";
  return null;
}

export function validateUserForm(data: {
  email: string;
  role: UserRole;
  company_id: string | null;
  full_name: string;
}): string | null {
  if (!data.email?.trim()) return "Email is required.";
  if (!EMAIL_RE.test(data.email)) return "Enter a valid email address.";
  if (!data.role) return "Role is required.";
  if (data.role === "site_manager" || data.role === "customer_user") {
    if (!data.company_id?.trim()) {
      return "Company is required for site manager and customer user roles.";
    }
  }
  return null;
}
