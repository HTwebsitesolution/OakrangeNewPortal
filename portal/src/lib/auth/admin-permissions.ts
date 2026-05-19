import type { AdminLevel, SessionProfile } from "@/types/profile";

type AdminActor = Pick<SessionProfile, "role" | "admin_level">;
type AdminTarget = Pick<SessionProfile, "role" | "admin_level">;

export function isOakrangeAdmin(profile: Pick<SessionProfile, "role">): boolean {
  return profile.role === "oakrange_admin";
}

export function isSuperAdmin(profile: AdminActor): boolean {
  return profile.role === "oakrange_admin" && profile.admin_level === "super_admin";
}

export function canManageAdmins(actor: AdminActor): boolean {
  return isSuperAdmin(actor);
}

export function canCreateInternalAdmin(actor: AdminActor): boolean {
  return isSuperAdmin(actor);
}

export function canPromoteToSuperAdmin(actor: AdminActor): boolean {
  return isSuperAdmin(actor);
}

export function canEditInternalAdmin(actor: AdminActor): boolean {
  return isSuperAdmin(actor);
}

/** Normal admins cannot deactivate any internal admin; super admin cannot deactivate another super admin. */
export function canDeactivateAdmin(actor: AdminActor, target: AdminTarget): boolean {
  if (target.role !== "oakrange_admin") return true;
  if (!isSuperAdmin(actor)) return false;
  if (target.admin_level === "super_admin") return false;
  return true;
}

export function canAssignAdminLevel(actor: AdminActor, level: AdminLevel): boolean {
  if (level === "super_admin") return canPromoteToSuperAdmin(actor);
  return canCreateInternalAdmin(actor);
}
