/**
 * Get the best cover image source for a book.
 *
 * Every cover is served through /api/covers/[id], which lazily fetches and
 * caches the remote image as a DB blob on first request. This means an external
 * cover_url only hits the network once — after that it's served from local DB.
 */
export function coverSrc(book: { id: string; cover_url?: string | null; has_cover_blob?: boolean }): string {
  if (book.has_cover_blob) {
    return `/api/covers/${book.id}`;
  }
  if (book.cover_url && book.cover_url.trim()) {
    return `/api/covers/${book.id}`;
  }
  return "";
}

/**
 * Sanitize a raw cover URL (preview before save):
 * - Upgrade http:// to https://
 * - Return empty string for missing values
 */
export function safeCoverUrl(url: string | undefined | null): string {
  if (!url) return "";
  let safe = url.trim();
  if (safe.startsWith("http://")) {
    safe = safe.replace("http://", "https://");
  }
  return safe;
}
