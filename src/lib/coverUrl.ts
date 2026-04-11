/**
 * Sanitize a cover URL:
 * - Upgrade http:// to https://
 * - Return empty string for broken/known-bad URLs
 */
export function safeCoverUrl(url: string | undefined | null): string {
  if (!url) return "";
  let safe = url.trim();
  // Upgrade http to https
  if (safe.startsWith("http://")) {
    safe = safe.replace("http://", "https://");
  }
  return safe;
}
