/**
 * Get the best cover image source for a book.
 *
 * Every cover is served through /api/covers/[id], which lazily fetches and
 * caches the remote image as a DB blob on first request. The query string is
 * a short fingerprint of (cover_url, blob-presence) so the browser cache is
 * invalidated when the user swaps in a new URL or the blob is cleared.
 */
export function coverSrc(book: {
  id: string;
  cover_url?: string | null;
  has_cover_blob?: boolean;
}): string {
  const hasAny = book.has_cover_blob || (book.cover_url && book.cover_url.trim());
  if (!hasAny) return "";
  const v = cacheKey(book.cover_url, book.has_cover_blob);
  return `/api/covers/${book.id}?v=${v}`;
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

// Tiny stable hash → 6-char base36 fingerprint. Browsers use the full URL
// (including query string) as their cache key, so as long as this string
// changes when the underlying image source changes, stale caches are bypassed.
function cacheKey(coverUrl: string | null | undefined, hasBlob: boolean | undefined): string {
  const input = `${hasBlob ? "1" : "0"}|${(coverUrl ?? "").trim()}`;
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}
