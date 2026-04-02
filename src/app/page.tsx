"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Book } from "@/types/book";
import { BookCard } from "@/components/BookCard";
import { AddBookModal } from "@/components/AddBookModal";

type FilterStatus = "all" | "want_to_read" | "reading" | "read";

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
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
          setBooks(data || []);
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
    { label: "Want to Read", value: "want_to_read" },
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
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + Add Book
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search by title or author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent mb-3"
          />

          {/* Filter tabs */}
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
            <p className="text-zinc-500 text-lg mb-2">No books yet</p>
            <p className="text-zinc-600 text-sm">
              Tap &quot;+ Add Book&quot; to start building your library
            </p>
          </div>
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

      {/* Add Book Modal */}
      {showAddModal && (
        <AddBookModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
