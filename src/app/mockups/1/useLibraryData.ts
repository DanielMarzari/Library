"use client";

// Client-side data hooks for the Bento Pop preview pages.
// Reads from the existing /api/* routes. Falls back to mock data if no DB.
// Every hook exposes `refetch()` so mutations can refresh the UI.

import { useCallback, useEffect, useState } from "react";
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

// ---- helpers ---------------------------------------------------------------

async function safeFetch<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export function bookToMock(b: Book): MockBook {
  const topics = Array.isArray(b.topics) ? b.topics : [];
  return {
    id: b.id,
    title: b.title || "Untitled",
    author: b.author || "Unknown Author",
    year: 0,
    pages: b.pages || 0,
    status: b.status,
    rating: b.rating,
    cover: b.has_cover_blob
      ? `/api/covers/${b.id}?v=1`
      : (b.cover_url && b.cover_url.trim()) || "",
    cover_url: b.cover_url || undefined,
    has_cover_blob: b.has_cover_blob,
    topics,
    source: b.source,
    progress:
      b.status === "reading" && b.pages && b.current_page
        ? Math.min(100, Math.round((b.current_page / b.pages) * 100))
        : undefined,
    current_page: b.current_page,
    complete_date: b.complete_date,
    start_date: b.start_date,
    favorite: b.favorite,
  };
}

// ---- hook factories --------------------------------------------------------

interface Fetched<T> {
  data: T;
  loading: boolean;
  refetch: () => void;
}

function useFetched<T>(path: string, fallback: T): Fetched<T> {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    safeFetch<T>(path, fallback).then((d) => {
      if (cancel) return;
      setData(d);
      setLoading(false);
    });
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick]);

  return { data, loading, refetch };
}

// ---- public hooks ----------------------------------------------------------

export function useBooks(): {
  books: MockBook[];
  loading: boolean;
  usingMock: boolean;
  refetch: () => void;
} {
  const { data, loading, refetch } = useFetched<Book[]>("/api/books?", []);
  const mapped = data.map(bookToMock);
  const usingMock = data.length === 0 && !loading;
  return {
    books: usingMock ? MOCK_BOOKS : mapped,
    loading,
    usingMock,
    refetch,
  };
}

// Stats — `read` defaults to all-time but caller can filter by year.
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

// Books finished in the given calendar year (uses complete_date).
export function booksFinishedInYear(books: MockBook[], year: number): MockBook[] {
  return books.filter(
    (b) =>
      b.status === "read" &&
      b.complete_date &&
      new Date(b.complete_date).getFullYear() === year
  );
}

export function useAuthors() {
  const { data, loading, refetch } = useFetched<LibraryAuthor[]>("/api/authors", []);
  return { authors: data, loading, refetch };
}

export function useRecommendations() {
  const { data, loading, refetch } = useFetched<LibraryRecommendation[]>(
    "/api/recommendations",
    []
  );
  return { recs: data, loading, refetch };
}

export function useLending() {
  const { data, loading, refetch } = useFetched<LibraryLending[]>("/api/lending", []);
  return { lending: data, loading, refetch };
}

export function useLearningGoals() {
  const { data, loading, refetch } = useFetched<LibraryLearningGoal[]>(
    "/api/learning-goals",
    []
  );
  return { goals: data, loading, refetch };
}

export function useReadingGoals() {
  const { data, loading, refetch } = useFetched<LibraryReadingGoal[]>(
    "/api/reading-goals",
    []
  );
  return { goals: data, loading, refetch };
}

export function useReadingUpdates(bookId?: string) {
  const path = `/api/reading-updates${bookId ? `?book_id=${encodeURIComponent(bookId)}` : ""}`;
  const { data, loading, refetch } = useFetched<LibraryReadingUpdate[]>(path, []);
  return { updates: data, loading, refetch };
}
