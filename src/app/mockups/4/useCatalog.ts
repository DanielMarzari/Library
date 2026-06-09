"use client";

import { useEffect, useState } from "react";
import type { Book } from "@/types/book";

export interface CatalogBook {
  id: string;
  title: string;
  author: string;
  authors: string[]; // split on comma for facet
  isbn?: string;
  cover_url?: string;
  has_cover_blob?: boolean;
  description?: string;
  status: Book["status"];
  rating?: number;
  pages?: number;
  source?: string;
  lcc?: string;
  ddc?: string;
  topics: string[];
  auto_topics: string[];
  favorite?: boolean;
  item_type?: string;
  doi?: string;
  journal?: string;
  url?: string;
  publication_year?: number;
  created_at: string;
  updated_at: string;
}

function bookToCatalog(b: Book): CatalogBook {
  const topics = Array.isArray(b.topics) ? b.topics : [];
  const autoTopics = Array.isArray(b.auto_topics) ? b.auto_topics : [];
  const authors = (b.author || "").split(",").map((a) => a.trim()).filter(Boolean);
  return {
    id: b.id,
    title: b.title || "Untitled",
    author: b.author || "Unknown Author",
    authors: authors.length > 0 ? authors : ["Unknown Author"],
    isbn: b.isbn,
    cover_url: b.cover_url,
    has_cover_blob: b.has_cover_blob,
    description: b.description,
    status: b.status,
    rating: b.rating,
    pages: b.pages,
    source: b.source,
    lcc: b.lcc,
    ddc: b.ddc,
    topics,
    auto_topics: autoTopics,
    favorite: b.favorite,
    item_type: b.item_type,
    doi: b.doi,
    journal: b.journal,
    url: b.url,
    publication_year: b.publication_year,
    created_at: b.created_at,
    updated_at: b.updated_at,
  };
}

export function useCatalog(): { books: CatalogBook[]; loading: boolean } {
  const [books, setBooks] = useState<CatalogBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    fetch("/api/books?", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Book[]) => {
        if (cancel) return;
        setBooks(rows.map(bookToCatalog));
        setLoading(false);
      })
      .catch(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  return { books, loading };
}

// Cover URL helper — prefer cached blob over remote URL
export function coverFor(b: CatalogBook): string {
  if (b.has_cover_blob) return `/api/covers/${b.id}?v=1`;
  return (b.cover_url || "").trim();
}

// LCC first-letter → human-readable subject (rough Library of Congress chunks)
export const LCC_SUBJECTS: Record<string, string> = {
  A: "General Works",
  B: "Philosophy & Religion",
  C: "Auxiliary Sciences",
  D: "World History",
  E: "American History",
  F: "American History (local)",
  G: "Geography & Anthropology",
  H: "Social Sciences",
  J: "Political Science",
  K: "Law",
  L: "Education",
  M: "Music",
  N: "Fine Arts",
  P: "Language & Literature",
  Q: "Science",
  R: "Medicine",
  S: "Agriculture",
  T: "Technology",
  U: "Military Science",
  V: "Naval Science",
  Z: "Bibliography & Library Science",
};

export function lccSubject(lcc?: string): string | null {
  if (!lcc) return null;
  const c = lcc.trim().charAt(0).toUpperCase();
  return LCC_SUBJECTS[c] || null;
}
