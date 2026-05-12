export type UserRole = "oakrange_admin" | "site_manager" | "customer_user";

/** Row from public.profiles (session context). */
export type SessionProfile = {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  company_id: string | null;
  is_active: boolean;
};
