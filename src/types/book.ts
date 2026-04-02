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
  intro_pages?: number;
  start_page?: number;
  end_page?: number;
  reading_pages?: number; // computed: end_page - start_page + 1 + intro_pages
  start_date?: string;
  complete_date?: string;
  source?: string;
  lcc?: string;
  ddc?: string;
  topics?: string[];
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
