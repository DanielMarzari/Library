"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Book } from "@/types/book";
import { BookShelf } from "@/components/BookShelf";
import { BookCard } from "@/components/BookCard";
import { BookDetail } from "@/components/BookDetail";
import { AddBookModal } from "@/components/AddBookModal";
import { IsbnScanner } from "@/components/IsbnScanner";

type FilterStatus = "all" | "not_read" | "reading" | "read";
type ViewMode = "shelf" | "list";

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("shelf");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);
      let query = supabase
        .from("books")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
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
          // Keep any optimistic books that haven't been confirmed yet
          setBooks((prev) => {
            const optimistic = prev.filter((b) => b._optimistic);
            const real = data || [];
            // Remove optimistic books that now exist in real data (match by title)
            const stillPending = optimistic.filter(
              (ob) => !real.some((rb) => rb.title === ob.title && rb.author === ob.author)
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

  const refetch = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Optimistic add from scanner: show book immediately, then refetch
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
      setShowScanner(false);

      // Refetch after a short delay to pick up the real DB record
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

  const filterButtons: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "all" },
    { label: "Not Read", value: "not_read" },
    { label: "Reading", value: "reading" },
    { label: "Read", value: "read" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold tracking-tight">My Library</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowScanner(true)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                title="Scan ISBN"
              >
                📷
              </button>
              <button
                onClick={() => setShowAddModal(true)}
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
            <div className="flex gap-2 overflow-x-auto pb-1">
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

            <div className="flex gap-1 bg-zinc-800 rounded-lg p-0.5 ml-2 flex-shrink-0">
              <button
                onClick={() => setViewMode("shelf")}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  viewMode === "shelf"
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
                title="Shelf view"
              >
                📚
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  viewMode === "list"
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
                title="List view"
              >
                ☰
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-700 border-t-emerald-500" />
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📚</p>
            <p className="text-zinc-500 text-lg mb-2">No books yet</p>
            <p className="text-zinc-600 text-sm mb-6">Start building your library</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowScanner(true)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                📷 Scan ISBN
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                + Add Manually
              </button>
            </div>
          </div>
        ) : viewMode === "shelf" ? (
          <BookShelf
            books={books}
            onBookTap={(book) => setSelectedBook(book)}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </main>

      {showAddModal && (
        <AddBookModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            refetch();
          }}
        />
      )}

      {showScanner && (
        <IsbnScanner
          onClose={() => setShowScanner(false)}
          onAdded={handleOptimisticAdd}
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
