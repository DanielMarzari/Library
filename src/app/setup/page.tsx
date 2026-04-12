"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Book } from "@/types/book";
import { BookDetail } from "@/components/BookDetail";
import { searchBooks, enrichBook } from "@/lib/bookLookup";
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
      try {
        const data = await api.books.list();
        if (!ignore) {
          setBooks(data || []);
        }
      } catch (error) {
        console.error("Error loading books:", error);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
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

  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });
  const [coverRunning, setCoverRunning] = useState(false);
  const [coverProgress, setCoverProgress] = useState({ done: 0, total: 0, found: 0 });
  const [cachingCovers, setCachingCovers] = useState(false);
  const [cacheResult, setCacheResult] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<string | null>(null);

  const handleBatchReimport = useCallback(async () => {
    if (batchRunning) return;
    setBatchRunning(true);
    const toProcess = filteredBooks.slice(0, 50); // limit batch size
    setBatchProgress({ done: 0, total: toProcess.length });
    for (let i = 0; i < toProcess.length; i++) {
      const book = toProcess[i];
      try {
        const query = book.isbn || book.title;
        const found = await searchBooks(query, 1);
        if (found.length > 0) {
          const enriched = await enrichBook(found[0]);
          const updates: Record<string, unknown> = {};
          if (enriched.cover_url && !book.cover_url) updates.cover_url = enriched.cover_url;
          if (enriched.lcc && !book.lcc) updates.lcc = enriched.lcc;
          if (enriched.ddc && !book.ddc) updates.ddc = enriched.ddc;
          if (enriched.pages && !book.end_page) updates.end_page = enriched.pages;
          if (enriched.pages && !book.pages) updates.pages = enriched.pages;
          if (enriched.topics?.length && (!book.auto_topics || book.auto_topics.length === 0)) updates.auto_topics = enriched.topics;
          if (enriched.isbn && !book.isbn) updates.isbn = enriched.isbn;
          if (Object.keys(updates).length > 0) {
            updates.updated_at = new Date().toISOString();
            await api.books.update(book.id, updates as Partial<Book>);
          }
        }
      } catch (e) {
        // skip failures
      }
      setBatchProgress({ done: i + 1, total: toProcess.length });
      // Rate limit
      await new Promise((r) => setTimeout(r, 500));
    }
    setBatchRunning(false);
    setRefreshKey((k) => k + 1);
  }, [filteredBooks, batchRunning]);

  const handleFetchCovers = useCallback(async () => {
    if (coverRunning) return;
    const noCover = books.filter((b) => !b.cover_url && b.isbn);
    if (noCover.length === 0) return;
    setCoverRunning(true);
    setCoverProgress({ done: 0, total: noCover.length, found: 0 });
    let found = 0;
    for (let i = 0; i < noCover.length; i++) {
      const book = noCover[i];
      try {
        const url = `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg?default=false`;
        const res = await fetch(url, { method: "HEAD" });
        if (res.ok) {
          const coverUrl = `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`;
          await api.books.update(book.id, { cover_url: coverUrl });
          found++;
        }
      } catch {}
      setCoverProgress({ done: i + 1, total: noCover.length, found });
      await new Promise((r) => setTimeout(r, 300));
    }
    setCoverRunning(false);
    setRefreshKey((k) => k + 1);
  }, [books, coverRunning]);

  const handleMigrate = useCallback(async () => {
    setMigrating(true);
    setMigrateResult(null);
    try {
      const res = await fetch("/api/migrate");
      const data = await res.json();
      setMigrateResult(data.success ? "✓ Done" : "Some failed");
    } catch {
      setMigrateResult("Error");
    } finally {
      setMigrating(false);
    }
  }, []);

  const handleCacheCovers = useCallback(async () => {
    setCachingCovers(true);
    setCacheResult(null);
    try {
      const res = await fetch("/api/cache-covers", { method: "POST" });
      const data = await res.json();
      setCacheResult(`${data.cached} cached, ${data.failed} failed`);
    } catch {
      setCacheResult("Error running cache");
    } finally {
      setCachingCovers(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border-custom border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border-custom">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold tracking-tight">
              Complete Setup
            </h1>
            <div className="flex items-center gap-3">
              <button
                onClick={handleFetchCovers}
                disabled={coverRunning || books.filter((b) => !b.cover_url && b.isbn).length === 0}
                className="bg-surface-2 hover:bg-border-custom text-foreground px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {coverRunning ? (
                  <><div className="animate-spin rounded-full h-3 w-3 border border-border-custom border-t-emerald-500" /> {coverProgress.done}/{coverProgress.total} ({coverProgress.found} found)</>
                ) : (
                  <>🖼️ Fetch Covers</>
                )}
              </button>
              <button
                onClick={handleBatchReimport}
                disabled={batchRunning || filteredBooks.length === 0}
                className="bg-surface-2 hover:bg-border-custom text-foreground px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {batchRunning ? (
                  <><div className="animate-spin rounded-full h-3 w-3 border border-border-custom border-t-emerald-500" /> {batchProgress.done}/{batchProgress.total}</>
                ) : (
                  <>🔄 Batch Reimport</>
                )}
              </button>
              <button
                onClick={handleCacheCovers}
                disabled={cachingCovers}
                className="bg-surface-2 hover:bg-border-custom text-foreground px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {cachingCovers ? (
                  <><div className="animate-spin rounded-full h-3 w-3 border border-border-custom border-t-emerald-500" /> Caching...</>
                ) : cacheResult ? (
                  <>{cacheResult}</>
                ) : (
                  <>💾 Cache Covers</>
                )}
              </button>
              <button
                onClick={handleMigrate}
                disabled={migrating}
                className="bg-surface-2 hover:bg-border-custom text-foreground px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {migrating ? (
                  <><div className="animate-spin rounded-full h-3 w-3 border border-border-custom border-t-emerald-500" /> Migrating...</>
                ) : migrateResult ? (
                  <>{migrateResult}</>
                ) : (
                  <>🔧 Run Migration</>
                )}
              </button>
              <Link
                href="/"
                className="text-muted hover:text-foreground text-sm font-medium transition-colors"
              >
                Back to Library
              </Link>
            </div>
          </div>
          <p className="text-sm text-muted mb-4">
            Books missing data — tap to edit and fill in details.
          </p>

          {/* Filter by missing field */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedField("any")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedField === "any"
                  ? "bg-amber-600 text-white"
                  : "bg-surface-2 text-muted hover:text-foreground"
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
                    : "bg-surface-2 text-muted hover:text-foreground"
                }`}
              >
                {FIELD_LABELS[f]} ({fieldCounts[f]})
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <p className="text-xs text-muted-2 mb-4">
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
                className="w-full flex items-center gap-3 bg-surface border border-border-custom rounded-xl p-3 hover:border-border-custom transition-colors text-left"
              >
                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="w-10 h-14 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-14 rounded bg-surface-2 flex items-center justify-center flex-shrink-0">
                    <span className="text-muted-2 text-[8px]">No Cover</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {book.title}
                  </p>
                  <p className="text-xs text-muted truncate">
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
            <p className="text-muted text-lg">All books are complete!</p>
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
