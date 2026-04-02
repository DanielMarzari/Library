"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Book } from "@/types/book";
import { BookShelf } from "@/components/BookShelf";
import { BookDetail } from "@/components/BookDetail";
import { AddBookSheet } from "@/components/AddBookSheet";
import Link from "next/link";

type FilterStatus = "all" | "not_read" | "reading" | "read" | "favorites";
type SortMode = "recent" | "alpha" | "rating" | "lcc" | "ddc";
type HeaderTab = "filter" | "sort";
type GridSize = "xs" | "small" | "medium" | "large" | "xl";

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Nav + header UI
  const [showNav, setShowNav] = useState(false);
  const [headerTab, setHeaderTab] = useState<HeaderTab>("filter");
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [gridSize, setGridSize] = useState<GridSize>("medium");
  const navRef = useRef<HTMLDivElement>(null);

  // Load persisted preferences
  useEffect(() => {
    const savedTheme = localStorage.getItem("library-theme") as "system" | "light" | "dark" | null;
    if (savedTheme) setTheme(savedTheme);
    const savedGrid = localStorage.getItem("library-grid-size") as GridSize | null;
    if (savedGrid) setGridSize(savedGrid);
  }, []);

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
    localStorage.setItem("library-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("library-grid-size", gridSize);
  }, [gridSize]);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectMode = selectedIds.size > 0;

  // Close nav menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setShowNav(false);
      }
    };
    if (showNav) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showNav]);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      if (refreshKey === 0) setLoading(true);
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

  const navLinkCls = "block px-3 py-2 text-sm text-muted hover:bg-surface-2 rounded-lg transition-colors";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border-custom">
        <div className="w-full px-4 py-3">
          {/* Top row: title, nav toggle, add */}
          <div className="flex items-center gap-3 mb-3">
            <div className="relative" ref={navRef}>
              <button
                onClick={() => setShowNav((v) => !v)}
                className="p-2 rounded-lg bg-surface hover:bg-surface-2 text-muted transition-colors"
                aria-label="Menu"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>

              {showNav && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-surface border border-border-custom rounded-xl shadow-xl p-2 z-50">
                  <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-2 font-semibold">Tracking</p>
                  <Link href="/stats" className={navLinkCls} onClick={() => setShowNav(false)}>Stats</Link>
                  <Link href="/goals" className={navLinkCls} onClick={() => setShowNav(false)}>Goals</Link>
                  <Link href="/reading-list" className={navLinkCls} onClick={() => setShowNav(false)}>Reading List</Link>
                  <Link href="/wrapped" className="block px-3 py-2 text-sm font-medium bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-300 hover:from-purple-600/30 hover:to-pink-600/30 rounded-lg transition-colors" onClick={() => setShowNav(false)}>Wrapped</Link>

                  <div className="border-t border-border-custom my-1.5" />
                  <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-2 font-semibold">Discover</p>
                  <Link href="/authors" className={navLinkCls} onClick={() => setShowNav(false)}>Authors</Link>
                  <Link href="/expertise" className={navLinkCls} onClick={() => setShowNav(false)}>Skills</Link>
                  <Link href="/recommendations" className={navLinkCls} onClick={() => setShowNav(false)}>Recommendations</Link>

                  <div className="border-t border-border-custom my-1.5" />
                  <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-2 font-semibold">Manage</p>
                  <Link href="/lending" className={navLinkCls} onClick={() => setShowNav(false)}>Lending</Link>
                  <Link href="/setup" className={navLinkCls} onClick={() => setShowNav(false)}>Setup</Link>

                  <div className="border-t border-border-custom my-1.5" />
                  <div className="px-3 py-2 space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-2 font-semibold mb-2">Theme</p>
                      <div className="flex gap-1 bg-surface-2 rounded-lg p-0.5">
                        {([["system", "Auto"], ["light", "Light"], ["dark", "Dark"]] as const).map(([val, label]) => (
                          <button
                            key={val}
                            onClick={() => setTheme(val)}
                            className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                              theme === val ? "bg-background text-foreground shadow-sm" : "text-muted-2 hover:text-muted"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-2 font-semibold mb-2">Book Size</p>
                      <div className="flex gap-1 bg-surface-2 rounded-lg p-0.5">
                        {([["xs", "XS"], ["small", "S"], ["medium", "M"], ["large", "L"], ["xl", "XL"]] as const).map(([val, label]) => (
                          <button
                            key={val}
                            onClick={() => setGridSize(val)}
                            className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                              gridSize === val ? "bg-background text-foreground shadow-sm" : "text-muted-2 hover:text-muted"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <h1 className="text-xl font-bold tracking-tight flex-1">My Library</h1>

            <button
              onClick={() => setShowAddSheet(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + Add
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search by title or author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface border border-border-custom rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-muted-2 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent mb-3"
          />

          {/* Filter / Sort toggle row */}
          <div className="flex items-center gap-2">
            {/* Toggle buttons */}
            <div className="flex gap-0.5 bg-surface rounded-lg p-0.5 flex-shrink-0">
              <button
                onClick={() => setHeaderTab("filter")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  headerTab === "filter" ? "bg-surface-2 text-foreground" : "text-muted-2 hover:text-muted"
                }`}
              >
                Filter
              </button>
              <button
                onClick={() => setHeaderTab("sort")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  headerTab === "sort" ? "bg-surface-2 text-foreground" : "text-muted-2 hover:text-muted"
                }`}
              >
                Sort
              </button>
            </div>

            {/* Filter pills */}
            {headerTab === "filter" && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {filterButtons.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      filter === f.value
                        ? "bg-emerald-600 text-white"
                        : "bg-surface text-muted hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            {/* Sort pills */}
            {headerTab === "sort" && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {sortButtons.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSortMode(s.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      sortMode === s.value
                        ? "bg-emerald-600 text-white"
                        : "bg-surface text-muted hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Bulk action bar */}
      {selectMode && (
        <div className="sticky top-[130px] z-10 bg-surface/95 backdrop-blur-md border-b border-border-custom px-4 py-3">
          <div className="w-full flex items-center justify-between">
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
      <main className="flex-1 w-full w-full px-4 py-6">
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
            gridSize={gridSize}
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
            // Background refetch — no loading flash
            refetch();
          }}
          onDeleted={() => {
            setSelectedBook(null);
            refetch();
          }}
          recentSources={[
            ...new Set(
              books.map((b) => b.source).filter(Boolean) as string[]
            ),
          ]}
        />
      )}
    </div>
  );
}
