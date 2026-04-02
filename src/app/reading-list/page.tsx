"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Book } from "@/types/book";
import Link from "next/link";

interface ReadingListItem {
  id: string;
  book_id: string;
  year: number;
  priority: number;
  added_at: string;
  book: Book;
}

export default function ReadingListPage() {
  const [items, setItems] = useState<ReadingListItem[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  // Fetch reading list and books
  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      setLoading(true);

      // Fetch all books first
      const { data: booksData, error: booksError } = await supabase
        .from("books")
        .select("*");

      if (!ignore && !booksError && booksData) {
        setBooks(booksData as Book[]);
      }

      // Fetch reading list for selected year
      const { data: itemsData, error: itemsError } = await supabase
        .from("reading_list")
        .select("*")
        .eq("year", selectedYear)
        .order("priority", { ascending: true });

      if (!ignore && !itemsError && itemsData) {
        // Enrich with book data
        const enriched = (itemsData as any[]).map((item) => {
          const book = booksData?.find((b) => b.id === item.book_id);
          return {
            ...item,
            book: book || null,
          };
        });
        setItems(enriched.filter((item) => item.book));
      }

      setLoading(false);
    };

    loadData();
    return () => {
      ignore = true;
    };
  }, [selectedYear]);

  // Available books for dropdown (not already on list, status not_read or reading)
  const availableBooks = useMemo(() => {
    const onListIds = new Set(items.map((i) => i.book_id));
    return books
      .filter(
        (b) =>
          !onListIds.has(b.id) &&
          (b.status === "not_read" || b.status === "reading")
      )
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [items, books]);

  const filteredAvailable = useMemo(() => {
    if (!searchQuery.trim()) return availableBooks;
    const q = searchQuery.toLowerCase();
    return availableBooks.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q)
    );
  }, [availableBooks, searchQuery]);

  const currentYearItems = items.filter((i) => i.year === selectedYear);
  const completedCount = currentYearItems.filter(
    (i) => i.book?.status === "read"
  ).length;
  const totalCount = currentYearItems.length;
  const completionPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Get all years that have reading list entries
  const allYears = useMemo(() => {
    const years = new Set([currentYear]);
    items.forEach((i) => years.add(i.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [items, currentYear]);

  const addBookToList = async (bookId: string) => {
    // Find next priority
    const maxPriority = currentYearItems.reduce(
      (max, item) => Math.max(max, item.priority || 0),
      -1
    );

    const { error } = await supabase.from("reading_list").insert({
      book_id: bookId,
      year: selectedYear,
      priority: maxPriority + 1,
      added_at: new Date().toISOString(),
    });

    if (!error) {
      // Optimistically update state
      const book = books.find((b) => b.id === bookId);
      if (book) {
        setItems([
          ...items,
          {
            id: `temp-${Date.now()}`,
            book_id: bookId,
            year: selectedYear,
            priority: maxPriority + 1,
            added_at: new Date().toISOString(),
            book,
          },
        ]);
      }
      setShowAddDropdown(false);
      setSearchQuery("");
    }
  };

  const removeBookFromList = async (itemId: string) => {
    const { error } = await supabase
      .from("reading_list")
      .delete()
      .eq("id", itemId);

    if (!error) {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    }
  };

  const movePriority = async (itemId: string, direction: "up" | "down") => {
    const itemIndex = currentYearItems.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) return;

    if (direction === "up" && itemIndex === 0) return;
    if (direction === "down" && itemIndex === currentYearItems.length - 1)
      return;

    const currentItem = currentYearItems[itemIndex];
    const otherItem =
      currentYearItems[
        direction === "up" ? itemIndex - 1 : itemIndex + 1
      ];

    // Swap priorities
    const newPriority = otherItem.priority;
    const oldPriority = currentItem.priority;

    // Update in DB
    const updates = [
      supabase
        .from("reading_list")
        .update({ priority: newPriority })
        .eq("id", itemId),
      supabase
        .from("reading_list")
        .update({ priority: oldPriority })
        .eq("id", otherItem.id),
    ];

    await Promise.all(updates);

    // Update local state
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === itemId) return { ...i, priority: newPriority };
        if (i.id === otherItem.id) return { ...i, priority: oldPriority };
        return i;
      })
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border-custom">
        <div className="w-full mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Reading List
            </h1>
            <Link
              href="/"
              className="bg-surface-2 hover:bg-border-custom text-foreground px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Back to Library
            </Link>
          </div>

          {/* Year selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {allYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedYear === year
                    ? "bg-emerald-600 text-white"
                    : "bg-surface-2 text-muted hover:text-foreground"
                }`}
              >
                {year}
                {year === currentYear && " (Current)"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full mx-auto w-full px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-border-custom border-t-emerald-500" />
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="bg-surface border border-border-custom rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-muted text-sm mb-1">Progress</p>
                  <p className="text-2xl font-bold text-foreground">
                    {completedCount} of {totalCount}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    {completionPercent}% complete
                  </p>
                </div>
                {totalCount > 0 && (
                  <div className="flex-1 ml-8">
                    <div className="w-full bg-surface-2 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Add book button and dropdown */}
            <div className="mb-6 relative">
              <button
                onClick={() => setShowAddDropdown(!showAddDropdown)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              >
                + Add Book to {selectedYear}
              </button>

              {showAddDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border-custom rounded-lg shadow-xl z-20">
                  <div className="p-3 border-b border-border-custom">
                    <input
                      type="text"
                      placeholder="Search books..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-surface-2 border border-border-custom rounded px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {filteredAvailable.length === 0 ? (
                      <div className="p-4 text-center text-muted text-sm">
                        {availableBooks.length === 0
                          ? "All books are already on a list or have been read"
                          : "No books match your search"}
                      </div>
                    ) : (
                      filteredAvailable.map((book) => (
                        <button
                          key={book.id}
                          onClick={() => addBookToList(book.id)}
                          className="w-full px-4 py-3 text-left border-b border-border-custom last:border-b-0 hover:bg-surface-2/50 transition-colors"
                        >
                          <p className="font-medium text-foreground text-sm">
                            {book.title}
                          </p>
                          <p className="text-xs text-muted">{book.author}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Books list */}
            {currentYearItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-4">📚</p>
                <p className="text-muted text-lg mb-2">
                  No books on your {selectedYear} reading list
                </p>
                <p className="text-muted-2 text-sm">
                  Add some books to get started
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {currentYearItems.map((item, index) => {
                  const isCompleted = item.book?.status === "read";
                  const isReading = item.book?.status === "reading";

                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => setDraggedId(item.id)}
                      onDragEnd={() => setDraggedId(null)}
                      className={`bg-surface border border-border-custom rounded-lg p-4 transition-colors ${
                        draggedId === item.id
                          ? "opacity-50 bg-surface-2"
                          : "hover:border-border-custom"
                      }`}
                    >
                      <div className="flex gap-4">
                        {/* Cover image */}
                        {item.book?.cover_url && (
                          <img
                            src={item.book.cover_url}
                            alt={item.book.title}
                            className="w-24 h-32 object-cover rounded bg-surface-2 flex-shrink-0"
                          />
                        )}

                        {/* Content */}
                        <div className="flex-1 flex flex-col">
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-semibold text-foreground text-sm">
                                  {item.book?.title}
                                </p>
                                <p className="text-xs text-muted">
                                  {item.book?.author}
                                </p>
                              </div>
                              {/* Status badge */}
                              <div className="flex items-center gap-2 ml-2">
                                {isCompleted && (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-emerald-600/20 rounded text-emerald-400 text-xs font-medium">
                                    <svg
                                      className="w-3.5 h-3.5"
                                      viewBox="0 0 16 16"
                                      fill="currentColor"
                                    >
                                      <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 11-1.06-1.06L12.72 4.22a.75.75 0 011.06 0Z" />
                                      <path d="M2.22 9.22a.75.75 0 111.06-1.06L6 10.94l4.72-4.72a.75.75 0 111.06 1.06l-5.25 5.25a.75.75 0 01-1.06 0L2.22 9.22Z" />
                                    </svg>
                                    Complete
                                  </div>
                                )}
                                {isReading && (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-600/20 rounded text-blue-400 text-xs font-medium">
                                    <svg
                                      className="w-3.5 h-3.5 animate-pulse"
                                      viewBox="0 0 16 16"
                                      fill="currentColor"
                                    >
                                      <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7 9V5h2v4H7z" />
                                    </svg>
                                    Reading
                                  </div>
                                )}
                                {!isCompleted && !isReading && (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-surface-2 rounded text-muted text-xs font-medium">
                                    <svg
                                      className="w-3.5 h-3.5"
                                      viewBox="0 0 16 16"
                                      fill="currentColor"
                                    >
                                      <path d="M8 15A7 7 0 108 1a7 7 0 000 14zm0-1A6 6 0 108 2a6 6 0 000 12z" />
                                    </svg>
                                    To Read
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Book info */}
                            {item.book?.pages && (
                              <p className="text-xs text-muted-2 mt-2">
                                {item.book.pages} pages
                              </p>
                            )}

                            {item.book?.rating && (
                              <div className="flex items-center gap-1 mt-2">
                                <span className="text-xs text-muted">
                                  Rating:
                                </span>
                                <span className="text-xs font-medium text-amber-400">
                                  {"★".repeat(item.book.rating)}
                                  {"☆".repeat(5 - item.book.rating)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Controls */}
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-custom">
                            <div className="text-xs text-muted-2">
                              Priority: {index + 1}
                            </div>
                            <div className="flex items-center gap-2">
                              {index > 0 && (
                                <button
                                  onClick={() => movePriority(item.id, "up")}
                                  className="p-1.5 hover:bg-surface-2 rounded transition-colors"
                                  title="Move up"
                                >
                                  <svg
                                    className="w-4 h-4 text-muted"
                                    viewBox="0 0 16 16"
                                    fill="currentColor"
                                  >
                                    <path d="M8 3.5L3.5 8h1.5v3h6v-3h1.5L8 3.5z" />
                                  </svg>
                                </button>
                              )}
                              {index < currentYearItems.length - 1 && (
                                <button
                                  onClick={() => movePriority(item.id, "down")}
                                  className="p-1.5 hover:bg-surface-2 rounded transition-colors"
                                  title="Move down"
                                >
                                  <svg
                                    className="w-4 h-4 text-muted"
                                    viewBox="0 0 16 16"
                                    fill="currentColor"
                                  >
                                    <path d="M8 12.5l4.5-4.5h-1.5v-3h-6v3H3.5l4.5 4.5z" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={() => removeBookFromList(item.id)}
                                className="p-1.5 hover:bg-red-600/20 rounded transition-colors"
                                title="Remove from list"
                              >
                                <svg
                                  className="w-4 h-4 text-red-400"
                                  viewBox="0 0 16 16"
                                  fill="currentColor"
                                >
                                  <path d="M5.5 5.5a.75.75 0 111.06 1.06L8.56 8l-1.5 1.44a.75.75 0 11-1.06-1.06L7.44 8l-1.94-1.94A.75.75 0 015.5 5.5z" />
                                  <path d="M8 15A7 7 0 108 1a7 7 0 000 14zm0-1A6 6 0 108 2a6 6 0 000 12z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
