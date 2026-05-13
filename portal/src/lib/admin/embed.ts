/** Supabase nested selects may return T or T[] depending on relationship shape. */
export function one<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] as T | undefined) ?? null : x;
}
