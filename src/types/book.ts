export type ItemType = "book" | "article";
export type Density = "easy" | "moderate" | "hard" | "technical" | "dense";

/**
 * "paused" is a book you started and deliberately set down — distinct from
 * "reading" (actively in progress) and from "not_read" (never opened). It
 * exists because without it every started book stays "reading" forever, so the
 * shelf fills with books that are neither progressing nor honestly shelved.
 * Pausing preserves start_date and current_page so it can be resumed in place.
 */
export type BookStatus = "not_read" | "reading" | "paused" | "read";

/**
 * How a book is read, and therefore how progress means anything for it.
 *   linear — front to back; progress is a position (p.176 of 240)
 *   range  — out of order (cookbooks, devotionals, reference); progress is the
 *            union of the page spans you've logged
 */
export type ReadingMode = "linear" | "range";

/**
 * Every nullable column arrives from better-sqlite3 as `null`, never
 * `undefined` — and the lookup APIs that feed book creation return `null` too.
 * These fields were typed `?: string`, so assigning a real row to a Book was a
 * type error at ~19 call sites. Suppressing those errors (next.config.ts had
 * ignoreBuildErrors) was the wrong half of the fix: `| null` is simply what the
 * data is.
 */
export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string | null;
  cover_url?: string | null;
  has_cover_blob?: boolean;
  description?: string | null;
  status: BookStatus;
  /** Defaults to 'linear' for every existing book. */
  reading_mode?: ReadingMode | null;
  rating?: number | null;
  density?: Density | null;
  volume?: string | null;
  pages?: number | null;
  intro_pages?: number | null;
  start_page?: number | null;
  end_page?: number | null;
  reading_pages?: number | null;
  current_page?: number | null;
  start_date?: string | null;
  complete_date?: string | null;
  /** Most recent reading_updates timestamp — set by the books list query, not
   *  a stored column. Distinct from updated_at, which moves on any edit. */
  last_read_at?: string | null;
  source?: string | null;
  lcc?: string | null;
  ddc?: string | null;
  topics?: string[];
  auto_topics?: string[];
  favorite?: boolean;
  // Article-specific fields (item_type === "article")
  item_type?: ItemType;
  doi?: string | null;
  journal?: string | null;
  publication_year?: number | null;
  url?: string | null;
  created_at: string;
  updated_at: string;
  _optimistic?: boolean;
}

export interface ReadingUpdate {
  id: string;
  book_id: string;
  pages_read: number;
  /** For a range log this is the span's END page. */
  current_page: number;
  /** Set only on range logs — its presence is what marks one. NULL means linear. */
  range_start?: number | null;
  notes?: string | null;
  created_at: string;
}
