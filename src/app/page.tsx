"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Book } from "@/types/book";
import { BookShelf } from "@/components/BookShelf";
import { BookDetail } from "@/components/BookDetail";
import { AddBookSheet } from "@/components/AddBookSheet";
import Link from "next/link";

type FilterStatus = "all" | "not_read" | "reading" | "read" | "favorites";
type SortMode = "recent" | "alpha" | "rating" | "lcc" | "ddc";

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectMode = selectedIds.size > 0;

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);
      let query = supabase
        .from("books")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter === "favorites") {
        query = supabase
          .from("books")
          .select("*")
          .eq("favorite", true)
          .order("created_at", { ascending: false });
      } else if (filter !== "all") {
        query = query.eq("status", filter);
      }

      if (search.trim()) {
        query = query.or(
          `title.ilike.%${search}%,author.ilike.%${search}%`
        );
      }

      const { data, error } = await query;

      if (!ignore) {
        if (error) {
          console.error("Error fetching books:", error);
        } else {
          setBooks((prev) => {
            const optimistic = prev.filter((b) => b._optimistic);
            const real = data || [];
            const stillPending = optimistic.filter(
              (ob) =>
                !real.some(
                  (rb) => rb.title === ob.title && rb.author === ob.author
                )
            );
            return [...stillPending, ...real];
          });
        }
        setLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [filter, search, refreshKey]);

  const sortedBooks = useMemo(() => {
    const sorted = [...books];
    switch (sortMode) {
      case "alpha":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "rating":
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "lcc":
        sorted.sort((a, b) => (a.lcc || "ZZZ").localeCompare(b.lcc || "ZZZ"));
        break;
      case "ddc":
        sorted.sort((a, b) => {
          const aDdc = parseFloat(a.ddc || "9999");
          const bDdc = parseFloat(b.ddc || "9999");
          return aDdc - bDdc;
        });
        break;
      case "recent":
      default:
        // Sort read books by complete_date desc, others by created_at desc
        sorted.sort((a, b) => {
          if (a.status === "read" && b.status === "read") {
            const aDate = a.complete_date || "0";
            const bDate = b.complete_date || "0";
            return bDate.localeCompare(aDate);
          }
          return 0; // preserve DB order for non-read books
        });
        break;
    }
    return sorted;
  }, [books, sortMode]);

  const refetch = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleOptimisticAdd = useCallback(
    (partialBook: Partial<Book>) => {
      const optimisticBook: Book = {
        id: `optimistic-${Date.now()}`,
        title: partialBook.title || "Loading...",
        author: partialBook.author || "",
        isbn: partialBook.isbn,
        cover_url: partialBook.cover_url,
        description: partialBook.description,
        pages: partialBook.pages,
        status: partialBook.status || "not_read",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _optimistic: true,
      };

      setBooks((prev) => [optimisticBook, ...prev]);
      setShowAddSheet(false);
      setTimeout(() => refetch(), 1500);
    },
    [refetch]
  );

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("books").delete().eq("id", id);
    if (!error) {
      setBooks((prev) => prev.filter((b) => b.id !== id));
    }
  };

  const handleStatusChange = async (id: string, status: Book["status"]) => {
    const { error } = await supabase
      .from("books")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) {
      setBooks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status } : b))
      );
    }
  };

  // Multi-select handlers
  const handleStartSelect = useCallback((id: string) => {
    setSelectedIds(new Set([id]));
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} book(s)?`)) return;
    const ids = [...selectedIds];
    const { error } = await supabase.from("books").delete().in("id", ids);
    if (!error) {
      setBooks((prev) => prev.filter((b) => !selectedIds.has(b.id)));
      clearSelection();
    }
  };

  const handleBulkStatus = async (status: Book["status"]) => {
    const ids = [...selectedIds];
    const { error } = await supabase
      .from("books")
      .update({ status, updated_at: new Date().toISOString() })
      .in("id", ids);
    if (!error) {
      setBooks((prev) =>
        prev.map((b) => (selectedIds.has(b.id) ? { ...b, status } : b))
      );
      clearSelection();
    }
  };

  const filterButtons: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "all" },
    { label: "Favorites", value: "favorites" },
    { label: "Not Read", value: "not_read" },
    { label: "Reading", value: "reading" },
    { label: "Read", value: "read" },
  ];

  const sortButtons: { label: string; value: SortMode }[] = [
    { label: "Recent", value: "recent" },
    { label: "A-Z", value: "alpha" },
    { label: "Rating", value: "rating" },
    { label: "LCC", value: "lcc" },
    { label: "DDC", value: "ddc" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold tracking-tight">My Library</h1>
            <div className="flex items-center gap-2">
              <Link
                href="/stats"
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Stats
              </Link>
              <Link
                href="/goals"
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Goals
              </Link>
              <Link
                href="/authors"
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Authors
              </Link>
              <Link
                href="/expertise"
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Skills
              </Link>
              <Link
                href="/recommendations"
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Recs
              </Link>
              <Link
                href="/lending"
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Lending
              </Link>
              <Link
                href="/setup"
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Setup
              </Link>
              <button
                onClick={() => setShowAddSheet(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                + Add
              </button>
            </div>
          </div>

          <input
            type="text"
            placeholder="Search by title or author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent mb-3"
          />

          <div className="flex items-center justify-between">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {filterButtons.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    filter === f.value
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex gap-0.5 bg-zinc-800 rounded-lg p-0.5 ml-2 flex-shrink-0">
              {sortButtons.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSortMode(s.value)}
                  className={`px-2 py-1 rounded text-[10px] transition-colors ${
                    sortMode === s.value
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Bulk action bar */}
      {selectMode && (
        <div className="sticky top-[155px] z-10 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-700 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={clearSelection}
                className="text-zinc-400 hover:text-zinc-200 text-sm"
              >
                Cancel
              </button>
              <span className="text-sm text-zinc-300 font-medium">
                {selectedIds.size} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkStatus("not_read")}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
              >
                Not Read
              </button>
              <button
                onClick={() => handleBulkStatus("reading")}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
              >
                Reading
              </button>
              <button
                onClick={() => handleBulkStatus("read")}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors"
              >
                Read
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-700 border-t-emerald-500" />
          </div>
        ) : sortedBooks.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📚</p>
            <p className="text-zinc-500 text-lg mb-2">No books yet</p>
            <p className="text-zinc-600 text-sm mb-6">
              Start building your library
            </p>
            <button
              onClick={() => setShowAddSheet(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              + Add Book
            </button>
          </div>
        ) : (
          <BookShelf
            books={sortedBooks}
            onBookTap={(book) => setSelectedBook(book)}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onStartSelect={handleStartSelect}
            selectMode={selectMode}
            sortMode={sortMode}
            flatGrid={filter === "all" || filter === "favorites"}
          />
        )}
      </main>

      {showAddSheet && (
        <AddBookSheet
          onClose={() => setShowAddSheet(false)}
          onAdded={handleOptimisticAdd}
          recentSources={[
            ...new Set(
              books.map((b) => b.source).filter(Boolean) as string[]
            ),
          ]}
        />
      )}

      {selectedBook && (
        <BookDetail
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onUpdated={() => {
            setSelectedBook(null);
            refetch();
          }}
          onDeleted={() => {
            setSelectedBook(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
