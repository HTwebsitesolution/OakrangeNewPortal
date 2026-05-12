/**
 * Prevent open redirects: only allow same-origin relative paths starting with /.
 */
export function safeRedirectPath(candidate: string | null | undefined): string | null {
  if (!candidate || typeof candidate !== "string") return null;
  const trimmed = candidate.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (trimmed.includes("\\")) return null;
  return trimmed;
}
