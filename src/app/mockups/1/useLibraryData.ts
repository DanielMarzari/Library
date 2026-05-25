"use client";

// Client-side data hooks for the Bento Pop preview pages.
// Reads from the EXISTING /api/* routes — no writes, no DB schema changes.
// Falls back to mock data if the API is unreachable (so the preview never
// breaks if you're viewing it offline / in a static build).

import { useEffect, useState } from "react";
import type { Book, ReadingUpdate } from "@/types/book";
import { MOCK_BOOKS, MOCK_STATS, type MockBook } from "../data";

export interface LibraryAuthor {
  id?: string;
  name: string;
  ethnicity?: string | null;
  nationality?: string | null;
  religious_tradition?: string | null;
  gender?: string | null;
  image_url?: string | null;
  profile_url?: string | null;
}

export interface LibraryRecommendation {
  id: string;
  title: string;
  author?: string;
  isbn?: string;
  cover_url?: string;
  recommended_by?: string;
  notes?: string;
  topic?: string;
  interest?: string;
  year?: number;
  created_at: string;
}

export interface LibraryLending {
  id: string;
  book_id: string;
  borrower_name: string;
  lent_date: string;
  due_date?: string | null;
  returned_date?: string | null;
  notes?: string | null;
}

export interface LibraryLearningGoal {
  id: string;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
}

export interface LibraryReadingGoal {
  id: string;
  year: number;
  target: number;
}

export type LibraryReadingUpdate = ReadingUpdate;

// -- Helper ------------------------------------------------------------------

async function safeFetch<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

// Convert a real Book into the lightweight MockBook shape the preview uses.
export function bookToMock(b: Book): MockBook {
  // Pick a topic — the real DB stores topics as a parsed array.
  const topics = Array.isArray(b.topics) ? b.topics : [];
  return {
    id: b.id,
    title: b.title || "Untitled",
    author: b.author || "Unknown Author",
    year: 0,
    pages: b.pages || 0,
    status: b.status,
    rating: b.rating,
    cover:
      b.has_cover_blob
        ? `/api/covers/${b.id}?v=1`
        : (b.cover_url && b.cover_url.trim()) || "",
    topics,
    source: b.source,
    progress:
      b.status === "reading" && b.pages && b.current_page
        ? Math.min(100, Math.round((b.current_page / b.pages) * 100))
        : undefined,
  };
}

// -- Hooks -------------------------------------------------------------------

export function useBooks(): { books: MockBook[]; loading: boolean; usingMock: boolean } {
  const [state, setState] = useState<{ books: MockBook[]; loading: boolean; usingMock: boolean }>({
    books: MOCK_BOOKS,
    loading: true,
    usingMock: true,
  });

  useEffect(() => {
    let cancel = false;
    safeFetch<Book[]>("/api/books?", []).then((data) => {
      if (cancel) return;
      if (data.length === 0) {
        setState({ books: MOCK_BOOKS, loading: false, usingMock: true });
        return;
      }
      setState({
        books: data.map(bookToMock),
        loading: false,
        usingMock: false,
      });
    });
    return () => {
      cancel = true;
    };
  }, []);

  return state;
}

export function useStats(books: MockBook[]) {
  const finished = books.filter((b) => b.status === "read");
  const reading = books.filter((b) => b.status === "reading");
  const ratings = finished.map((b) => b.rating).filter((r): r is number => !!r);
  return {
    totalBooks: books.length,
    read: finished.length,
    reading: reading.length,
    notRead: books.filter((b) => b.status === "not_read").length,
    avgRating:
      ratings.length > 0
        ? ratings.reduce((s, r) => s + r, 0) / ratings.length
        : MOCK_STATS.avgRating,
    pagesRead: finished.reduce((s, b) => s + (b.pages || 0), 0),
  };
}

export function useAuthors(): { authors: LibraryAuthor[]; loading: boolean } {
  const [state, setState] = useState<{ authors: LibraryAuthor[]; loading: boolean }>({
    authors: [],
    loading: true,
  });
  useEffect(() => {
    let cancel = false;
    safeFetch<LibraryAuthor[]>("/api/authors", []).then((data) => {
      if (!cancel) setState({ authors: data, loading: false });
    });
    return () => {
      cancel = true;
    };
  }, []);
  return state;
}

export function useRecommendations(): {
  recs: LibraryRecommendation[];
  loading: boolean;
} {
  const [state, setState] = useState<{ recs: LibraryRecommendation[]; loading: boolean }>({
    recs: [],
    loading: true,
  });
  useEffect(() => {
    let cancel = false;
    safeFetch<LibraryRecommendation[]>("/api/recommendations", []).then((data) => {
      if (!cancel) setState({ recs: data, loading: false });
    });
    return () => {
      cancel = true;
    };
  }, []);
  return state;
}

export function useLending(): {
  lending: LibraryLending[];
  loading: boolean;
} {
  const [state, setState] = useState<{ lending: LibraryLending[]; loading: boolean }>({
    lending: [],
    loading: true,
  });
  useEffect(() => {
    let cancel = false;
    safeFetch<LibraryLending[]>("/api/lending", []).then((data) => {
      if (!cancel) setState({ lending: data, loading: false });
    });
    return () => {
      cancel = true;
    };
  }, []);
  return state;
}

export function useLearningGoals(): {
  goals: LibraryLearningGoal[];
  loading: boolean;
} {
  const [state, setState] = useState<{ goals: LibraryLearningGoal[]; loading: boolean }>({
    goals: [],
    loading: true,
  });
  useEffect(() => {
    let cancel = false;
    safeFetch<LibraryLearningGoal[]>("/api/learning-goals", []).then((data) => {
      if (!cancel) setState({ goals: data, loading: false });
    });
    return () => {
      cancel = true;
    };
  }, []);
  return state;
}

export function useReadingGoals(): {
  goals: LibraryReadingGoal[];
  loading: boolean;
} {
  const [state, setState] = useState<{ goals: LibraryReadingGoal[]; loading: boolean }>({
    goals: [],
    loading: true,
  });
  useEffect(() => {
    let cancel = false;
    safeFetch<LibraryReadingGoal[]>("/api/reading-goals", []).then((data) => {
      if (!cancel) setState({ goals: data, loading: false });
    });
    return () => {
      cancel = true;
    };
  }, []);
  return state;
}

export function useReadingUpdates(bookId?: string): {
  updates: LibraryReadingUpdate[];
  loading: boolean;
} {
  const [state, setState] = useState<{ updates: LibraryReadingUpdate[]; loading: boolean }>({
    updates: [],
    loading: true,
  });
  useEffect(() => {
    let cancel = false;
    const qs = bookId ? `?book_id=${encodeURIComponent(bookId)}` : "";
    safeFetch<LibraryReadingUpdate[]>(`/api/reading-updates${qs}`, []).then((data) => {
      if (!cancel) setState({ updates: data, loading: false });
    });
    return () => {
      cancel = true;
    };
  }, [bookId]);
  return state;
}
