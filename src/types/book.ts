export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  cover_url?: string;
  description?: string;
  status: "want_to_read" | "reading" | "read";
  rating?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}
