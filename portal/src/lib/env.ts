/**
 * Public Supabase configuration (browser-safe).
 * Use for UI hints only; all authorization is enforced server-side and in the database.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
