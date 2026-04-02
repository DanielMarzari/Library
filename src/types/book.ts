export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  cover_url?: string;
  description?: string;
  status: "not_read" | "reading" | "read";
  rating?: number;
  notes?: string;
  pages?: number;
  start_date?: string;
  complete_date?: string;
  created_at: string;
  updated_at: string;
  _optimistic?: boolean; // client-only flag for loading state
}

export interface ReadingUpdate {
  id: string;
  book_id: string;
  pages_read: number;
  current_page: number;
  notes?: string;
  created_at: string;
}
