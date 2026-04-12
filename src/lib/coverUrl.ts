/**
 * Get the best cover image source for a book.
 * Prefers cached blob (served from /api/covers/[id]) over external URL.
 */
export function coverSrc(book: { id: string; cover_url?: string | null; has_cover_blob?: boolean }): string {
  if (book.has_cover_blob) {
    return `/api/covers/${book.id}`;
  }
  return safeCoverUrl(book.cover_url);
}

/**
 * Sanitize a cover URL:
 * - Upgrade http:// to https://
 * - Return empty string for broken/known-bad URLs
 */
export function safeCoverUrl(url: string | undefined | null): string {
  if (!url) return "";
  let safe = url.trim();
  if (safe.startsWith("http://")) {
    safe = safe.replace("http://", "https://");
  }
  return safe;
}
