export type UserRole = "oakrange_admin" | "site_manager" | "customer_user";

/** Internal Oakrange admin tier when role is oakrange_admin. */
export type AdminLevel = "super_admin" | "admin";

/** Row from public.profiles (session context). */
export type SessionProfile = {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  /** Set when role is oakrange_admin; null for portal users. */
  admin_level: AdminLevel | null;
  company_id: string | null;
  is_active: boolean;
};
