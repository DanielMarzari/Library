"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Book } from "@/types/book";
import { BookDetail } from "@/components/BookDetail";
import Link from "next/link";

type MissingField =
  | "lcc"
  | "ddc"
  | "intro_pages"
  | "start_page"
  | "end_page"
  | "auto_topics"
  | "source"
  | "cover_url"
  | "isbn";

const FIELD_LABELS: Record<MissingField, string> = {
  lcc: "LCC",
  ddc: "DDC",
  intro_pages: "Intro Pages",
  start_page: "Start Page",
  end_page: "End Page",
  auto_topics: "Auto Topics",
  source: "Source",
  cover_url: "Cover Image",
  isbn: "ISBN",
};

function isMissing(book: Book, field: MissingField): boolean {
  switch (field) {
    case "lcc":
      return !book.lcc;
    case "ddc":
      return !book.ddc;
    case "intro_pages":
      return book.intro_pages === null || book.intro_pages === undefined;
    case "start_page":
      return book.start_page === null || book.start_page === undefined;
    case "end_page":
      return !book.end_page;
    case "auto_topics":
      return !book.auto_topics || book.auto_topics.length === 0;
    case "source":
      return !book.source;
    case "cover_url":
      return !book.cover_url;
    case "isbn":
      return !book.isbn;
  }
}

export default function SetupPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedField, setSelectedField] = useState<MissingField | "any">(
    "any"
  );
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("title", { ascending: true });
      if (!ignore) {
        if (!error && data) setBooks(data);
        setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const ALL_FIELDS: MissingField[] = [
    "isbn",
    "cover_url",
    "lcc",
    "ddc",
    "intro_pages",
    "start_page",
    "end_page",
    "auto_topics",
    "source",
  ];

  const fieldCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ALL_FIELDS.forEach((f) => {
      counts[f] = books.filter((b) => isMissing(b, f)).length;
    });
    counts["any"] = books.filter((b) =>
      ALL_FIELDS.some((f) => isMissing(b, f))
    ).length;
    return counts;
  }, [books]);

  const filteredBooks = useMemo(() => {
    if (selectedField === "any") {
      return books.filter((b) => ALL_FIELDS.some((f) => isMissing(b, f)));
    }
    return books.filter((b) => isMissing(b, selectedField));
  }, [books, selectedField]);

  const getMissingLabels = (book: Book): string[] => {
    return ALL_FIELDS.filter((f) => isMissing(book, f)).map(
      (f) => FIELD_LABELS[f]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-700 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold tracking-tight">
              Complete Setup
            </h1>
            <Link
              href="/"
              className="text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors"
            >
              Back to Library
            </Link>
          </div>
          <p className="text-sm text-zinc-500 mb-4">
            Books missing data — tap to edit and fill in details.
          </p>

          {/* Filter by missing field */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedField("any")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedField === "any"
                  ? "bg-amber-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Any ({fieldCounts["any"]})
            </button>
            {ALL_FIELDS.map((f) => (
              <button
                key={f}
                onClick={() => setSelectedField(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedField === f
                    ? "bg-amber-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {FIELD_LABELS[f]} ({fieldCounts[f]})
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <p className="text-xs text-zinc-600 mb-4">
          {filteredBooks.length} book{filteredBooks.length !== 1 ? "s" : ""}{" "}
          need attention
        </p>

        <div className="space-y-2">
          {filteredBooks.map((book) => {
            const missing = getMissingLabels(book);
            return (
              <button
                key={book.id}
                onClick={() => setSelectedBook(book)}
                className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3 hover:border-zinc-700 transition-colors text-left"
              >
                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="w-10 h-14 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-14 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <span className="text-zinc-600 text-[8px]">No Cover</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">
                    {book.title}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    {book.author}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {missing.map((m) => (
                      <span
                        key={m}
                        className="bg-amber-600/10 text-amber-500 text-[10px] px-1.5 py-0.5 rounded"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {filteredBooks.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">✅</p>
            <p className="text-zinc-400 text-lg">All books are complete!</p>
          </div>
        )}
      </main>

      {selectedBook && (
        <BookDetail
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onUpdated={() => {
            setSelectedBook(null);
            setRefreshKey((k) => k + 1);
          }}
          onDeleted={() => {
            setSelectedBook(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
