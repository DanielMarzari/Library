"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Book } from "@/types/book";
import { AppNav } from "@/components/AppNav";
import { AddBookSheet } from "@/components/AddBookSheet";
import { BookDetail } from "@/components/BookDetail";

/**
 * Journal articles in the library, kept apart from the book shelf.
 *
 * They want a different display and a different judgement: an article has a
 * journal, a volume and a year rather than a cover and a page count, and it is
 * read in one sitting rather than tracked across weeks. Mixed into a grid of
 * spines they were invisible.
 */
type SortMode = "recent" | "alpha" | "author" | "year" | "journal";
type StatusFilter = "all" | "not_read" | "reading" | "read";

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [openArticle, setOpenArticle] = useState<Book | null>(null);

  const load = useCallback(async () => {
    try {
      const all = await api.books.list({ sort: "created_at DESC" });
      setArticles(all.filter(b => b.item_type === "article"));
    } catch (e) {
      console.error("Error loading articles:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const recentSources = useMemo(
    () => [...new Set(articles.map(a => a.source).filter((s): s is string => !!s))].slice(0, 8),
    [articles]
  );

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = articles.filter(a => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!q) return true;
      return [a.title, a.author, a.journal, a.doi, (a.topics || []).join(" ")]
        .filter(Boolean).join(" ").toLowerCase().includes(q);
    });
    switch (sortMode) {
      case "alpha":   out.sort((a, b) => a.title.localeCompare(b.title)); break;
      case "author":  out.sort((a, b) => (a.author || "").localeCompare(b.author || "")); break;
      // Unknown years sort last either way rather than pretending to be year 0.
      case "year":    out.sort((a, b) => (b.publication_year ?? -Infinity) - (a.publication_year ?? -Infinity)); break;
      case "journal": out.sort((a, b) => (a.journal || "~").localeCompare(b.journal || "~")); break;
      default:        out.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    }
    return out;
  }, [articles, search, sortMode, statusFilter]);

  const counts = useMemo(() => ({
    all: articles.length,
    not_read: articles.filter(a => a.status === "not_read").length,
    reading: articles.filter(a => a.status === "reading").length,
    read: articles.filter(a => a.status === "read").length,
  }), [articles]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border-custom">
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center gap-3">
            <AppNav />
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight">Articles</h1>
              <p className="text-[11px] text-muted-2">
                {articles.length.toLocaleString()} in your library
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/recommendations"
                className="hidden sm:inline-block bg-surface-2 hover:bg-border-custom text-foreground px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                Recommended
              </Link>
              <button
                onClick={() => setShowAdd(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                + Add
              </button>
            </div>
          </div>

          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title, author, journal, DOI…"
            className="w-full bg-surface border border-border-custom rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-0.5 bg-surface rounded-lg p-0.5">
              {([
                { v: "all" as const,      l: "All" },
                { v: "not_read" as const, l: "Unread" },
                { v: "reading" as const,  l: "Reading" },
                { v: "read" as const,     l: "Read" },
              ]).map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => setStatusFilter(v)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    statusFilter === v ? "bg-surface-2 text-foreground" : "text-muted-2 hover:text-muted"
                  }`}
                >
                  {l} <span className="text-muted-2">{counts[v]}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 ml-auto">
              <span className="text-[10px] text-muted-2 uppercase tracking-wider">Sort:</span>
              {([
                { v: "recent" as SortMode,  l: "Added" },
                { v: "alpha" as SortMode,   l: "A-Z" },
                { v: "author" as SortMode,  l: "Author" },
                { v: "year" as SortMode,    l: "Year" },
                { v: "journal" as SortMode, l: "Journal" },
              ]).map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => setSortMode(v)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    sortMode === v ? "bg-foreground text-background" : "bg-surface-2 text-muted hover:text-foreground"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border border-border-custom border-t-emerald-500" />
          </div>
        ) : shown.length === 0 ? (
          <div className="text-center py-20 max-w-md mx-auto">
            <p className="text-5xl mb-3">📄</p>
            <p className="text-sm text-muted mb-1">
              {articles.length === 0 ? "No articles yet." : "Nothing matches that."}
            </p>
            {articles.length === 0 && (
              <p className="text-xs text-muted-2">
                Add one by DOI and the citation fills itself in from Crossref — or type it
                in by hand, which is what anything published before the 2000s needs.
              </p>
            )}
          </div>
        ) : (
          // A list, not a grid. Articles have no cover worth showing, and the
          // citation is the thing you actually scan for.
          <ul className="max-w-4xl mx-auto divide-y divide-border-custom">
            {shown.map(a => (
              <li key={a.id}>
                <button
                  onClick={() => setOpenArticle(a)}
                  className="w-full text-left py-3 px-2 hover:bg-surface rounded-lg transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg leading-none mt-0.5" aria-hidden>📄</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground group-hover:text-emerald-400 transition-colors">
                        {a.title}
                      </p>
                      <p className="text-xs text-muted mt-0.5">{a.author}</p>
                      <p className="text-[11px] text-muted-2 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        {a.journal && <span className="italic">{a.journal}</span>}
                        {a.publication_year && <span>{a.publication_year}</span>}
                        {a.doi && <span className="font-mono">{a.doi}</span>}
                        {a.status === "read" && <span className="text-emerald-500">✓ read</span>}
                        {a.status === "reading" && <span className="text-amber-500">reading</span>}
                      </p>
                    </div>
                    {a.url && (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-[11px] text-emerald-500 hover:text-emerald-400 shrink-0 mt-0.5"
                      >
                        open ↗
                      </a>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {showAdd && (
        <AddBookSheet
          startMode="article"
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); load(); }}
          recentSources={recentSources}
        />
      )}

      {openArticle && (
        <BookDetail
          book={openArticle}
          onClose={() => setOpenArticle(null)}
          onUpdated={load}
          onDeleted={() => { setOpenArticle(null); load(); }}
          recentSources={recentSources}
        />
      )}
    </div>
  );
}
