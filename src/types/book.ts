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

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  cover_url?: string;
  has_cover_blob?: boolean;
  description?: string;
  status: BookStatus;
  rating?: number;
  density?: Density;
  volume?: string;
  pages?: number;
  intro_pages?: number;
  start_page?: number;
  end_page?: number;
  reading_pages?: number;
  current_page?: number;
  start_date?: string;
  complete_date?: string;
  /** Most recent reading_updates timestamp — set by the books list query, not
   *  a stored column. Distinct from updated_at, which moves on any edit. */
  last_read_at?: string | null;
  source?: string;
  lcc?: string;
  ddc?: string;
  topics?: string[];
  auto_topics?: string[];
  favorite?: boolean;
  // Article-specific fields (item_type === "article")
  item_type?: ItemType;
  doi?: string;
  journal?: string;
  publication_year?: number;
  url?: string;
  created_at: string;
  updated_at: string;
  _optimistic?: boolean;
}

export interface ReadingUpdate {
  id: string;
  book_id: string;
  pages_read: number;
  current_page: number;
  notes?: string;
  created_at: string;
}
