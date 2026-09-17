"use client";

export const dynamic = "force-dynamic";

// Recommendations shelf — the default browsing view. Matches the main library
// shelf pixel-for-pixel. Editing/adding/refresh-prices live at
// /recommendations/manage.

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { safeCoverUrl } from "@/lib/coverUrl";
import { AppNav } from "@/components/AppNav";

// Build a search URL to a bookstore. Prefer ISBN when available; fall back to
// title + author. sortby=17 = "Lowest Total Price" on AbeBooks.
function storeUrl(
  store: "abe" | "thrift" | "amazon",
  isbn?: string | null,
  title?: string | null,
  author?: string | null,
): string {
  const hasIsbn = !!isbn && isbn.replace(/\D/g, "").length >= 10;
  const q = hasIsbn ? isbn! : [title, author].filter(Boolean).join(" ");
  const enc = encodeURIComponent(q || "");
  switch (store) {
    case "abe":
      return hasIsbn
        ? `https://www.abebooks.com/servlet/SearchResults?isbn=${enc}&sortby=17`
        : `https://www.abebooks.com/servlet/SearchResults?kn=${enc}&sortby=17`;
    case "thrift":
      return `https://www.thriftbooks.com/browse/?b.search=${enc}`;
    case "amazon":
      return `https://www.amazon.com/s?k=${enc}&i=stripbooks`;
  }
}

interface Rec {
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
  lowest_price?: number | null;
  thriftbooks_price?: number | null;
  amazon_price?: number | null;
  item_type?: "book" | "article";
  doi?: string;
  journal?: string;
  created_at: string;
}

type GridSize = "xs" | "small" | "medium" | "large" | "xl";
type SortMode = "recent" | "alpha" | "cheapest_asc"
  | "abe_asc" | "abe_desc" | "thrift_asc" | "thrift_desc" | "amazon_asc" | "amazon_desc";
type GroupBy = "flat" | "topic" | "source";

// Same grid classes as the main shelf
const gridClasses: Record<GridSize, string> = {
  xs:     "grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 2xl:grid-cols-14 gap-2",
  small:  "grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-3",
  medium: "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-4",
  large:  "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-5",
  xl:     "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6",
};

export default function RecommendationsPage() {
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [gridSize, setGridSize] = useState<GridSize>("medium");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [groupBy, setGroupBy] = useState<GroupBy>("flat");
  const [filterTopic, setFilterTopic] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [showTopicMenu, setShowTopicMenu] = useState(false);
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 240;

  // Load
  useEffect(() => {
    (async () => {
      try { setRecs((await api.recommendations.list()) as Rec[]); }
      finally { setLoading(false); }
    })();
  }, []);

  // Persist grid + sort locally so switching pages doesn't reset
  useEffect(() => {
    const g = localStorage.getItem("recs-grid-size") as GridSize | null;
    if (g) setGridSize(g);
    const s = localStorage.getItem("recs-sort") as SortMode | null;
    if (s) setSortMode(s);
  }, []);
  useEffect(() => { localStorage.setItem("recs-grid-size", gridSize); }, [gridSize]);
  useEffect(() => { localStorage.setItem("recs-sort", sortMode); }, [sortMode]);

  const topics = useMemo(() => {
    const counts: Record<string, number> = {};
    recs.forEach(r => { if (r.topic) counts[r.topic] = (counts[r.topic] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [recs]);
  const sources = useMemo(() => {
    const counts: Record<string, number> = {};
    recs.forEach(r => { if (r.recommended_by) counts[r.recommended_by] = (counts[r.recommended_by] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [recs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = recs.filter(r => {
      if (filterTopic && r.topic !== filterTopic) return false;
      if (filterSource && r.recommended_by !== filterSource) return false;
      if (!q) return true;
      return [r.title, r.author || "", r.recommended_by || "", r.topic || "", r.notes || ""]
        .join(" ").toLowerCase().includes(q);
    });
    switch (sortMode) {
      case "alpha": out.sort((a, b) => a.title.localeCompare(b.title)); break;
      case "cheapest_asc": {
        const m = (r: Rec) => Math.min(r.lowest_price ?? Infinity, r.thriftbooks_price ?? Infinity, r.amazon_price ?? Infinity);
        out.sort((a, b) => (m(a) === Infinity ? 9999 : m(a)) - (m(b) === Infinity ? 9999 : m(b)));
        break;
      }
      case "abe_asc":     out.sort((a, b) => (a.lowest_price      ?? 9999) - (b.lowest_price      ?? 9999)); break;
      case "abe_desc":    out.sort((a, b) => (b.lowest_price      ?? 0)    - (a.lowest_price      ?? 0)); break;
      case "thrift_asc":  out.sort((a, b) => (a.thriftbooks_price ?? 9999) - (b.thriftbooks_price ?? 9999)); break;
      case "thrift_desc": out.sort((a, b) => (b.thriftbooks_price ?? 0)    - (a.thriftbooks_price ?? 0)); break;
      case "amazon_asc":  out.sort((a, b) => (a.amazon_price      ?? 9999) - (b.amazon_price      ?? 9999)); break;
      case "amazon_desc": out.sort((a, b) => (b.amazon_price      ?? 0)    - (a.amazon_price      ?? 0)); break;
      case "recent":
      default: out.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    }
    return out;
  }, [recs, search, sortMode, filterTopic, filterSource]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;
  useEffect(() => { setPage(1); }, [search, filterTopic, filterSource, sortMode, groupBy]);

  // Section grouping when groupBy != flat
  const sections = useMemo(() => {
    if (groupBy === "flat") return [{ label: null as string | null, recs: paginated }];
    const key = groupBy === "topic" ? "topic" : "recommended_by";
    const groups: Record<string, Rec[]> = {};
    paginated.forEach(r => {
      const k = (r as any)[key] || "(unspecified)";
      groups[k] = groups[k] || [];
      groups[k].push(r);
    });
    return Object.entries(groups)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([label, recs]) => ({ label, recs }));
  }, [paginated, groupBy]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header — copied from the main / page for a coherent look */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border-custom">
        <div className="w-full px-4 py-3">
          {/* Top row */}
          <div className="flex items-center gap-3 mb-3">
            <AppNav />

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold tracking-tight truncate">Recommendations</h1>
              <p className="text-[10px] text-muted-2">
                {filtered.length.toLocaleString()} of {recs.length.toLocaleString()}
              </p>
            </div>

            {/* Grid size */}
            <div className="hidden sm:flex gap-0.5 bg-surface rounded-lg p-0.5 flex-shrink-0">
              {(["xs", "small", "medium", "large", "xl"] as GridSize[]).map(s => (
                <button
                  key={s}
                  onClick={() => setGridSize(s)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    gridSize === s ? "bg-surface-2 text-foreground" : "text-muted-2 hover:text-muted"
                  }`}
                >
                  {s.charAt(0).toUpperCase()}
                </button>
              ))}
            </div>

            {/* Manage — full list view with add/edit/refresh */}
            <Link
              href="/recommendations/manage"
              className="hidden sm:inline-block bg-surface-2 hover:bg-border-custom text-foreground px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            >
              Manage
            </Link>

            {/* Add — routes to the manage view's add flow */}
            <Link
              href="/recommendations/manage#add"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              + Add
            </Link>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search title, author, source, topic, notes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface border border-border-custom rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-muted-2 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent mb-3"
          />

          {/* Filter row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Topic */}
            <div className="relative">
              <button
                onClick={() => { setShowTopicMenu(v => !v); setShowSourceMenu(false); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                  filterTopic ? "bg-emerald-600 text-white border-emerald-600" : "bg-surface-2 text-muted border-border-custom hover:text-foreground"
                }`}
              >
                {filterTopic ? `#${filterTopic}` : `Topic (${topics.length})`} ▾
              </button>
              {showTopicMenu && (
                <div className="absolute top-full left-0 mt-1 bg-surface border border-border-custom rounded-lg shadow-xl z-20 min-w-[240px] max-h-72 overflow-y-auto">
                  <button
                    onClick={() => { setFilterTopic(null); setShowTopicMenu(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-muted hover:bg-surface-2"
                  >
                    All topics
                  </button>
                  {topics.map(([t, n]) => (
                    <button
                      key={t}
                      onClick={() => { setFilterTopic(t); setShowTopicMenu(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs flex justify-between transition-colors ${
                        filterTopic === t ? "bg-emerald-600/10 text-emerald-400" : "text-foreground hover:bg-surface-2"
                      }`}
                    >
                      <span className="truncate">{t}</span>
                      <span className="text-muted ml-2">{n}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Source */}
            <div className="relative">
              <button
                onClick={() => { setShowSourceMenu(v => !v); setShowTopicMenu(false); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                  filterSource ? "bg-blue-600 text-white border-blue-600" : "bg-surface-2 text-muted border-border-custom hover:text-foreground"
                }`}
              >
                {filterSource ? `@${filterSource}` : `Source (${sources.length})`} ▾
              </button>
              {showSourceMenu && (
                <div className="absolute top-full left-0 mt-1 bg-surface border border-border-custom rounded-lg shadow-xl z-20 min-w-[240px] max-h-72 overflow-y-auto">
                  <button
                    onClick={() => { setFilterSource(null); setShowSourceMenu(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-muted hover:bg-surface-2"
                  >
                    All sources
                  </button>
                  {sources.map(([s, n]) => (
                    <button
                      key={s}
                      onClick={() => { setFilterSource(s); setShowSourceMenu(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs flex justify-between transition-colors ${
                        filterSource === s ? "bg-blue-600/10 text-blue-400" : "text-foreground hover:bg-surface-2"
                      }`}
                    >
                      <span className="truncate">{s}</span>
                      <span className="text-muted ml-2">{n}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {(filterTopic || filterSource) && (
              <button
                onClick={() => { setFilterTopic(null); setFilterSource(null); }}
                className="px-2 py-0.5 rounded text-[10px] text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Clear
              </button>
            )}

            {/* Group by */}
            <div className="flex gap-0.5 bg-surface rounded-lg p-0.5 ml-2">
              {([
                { l: "Flat", v: "flat" as GroupBy },
                { l: "By topic", v: "topic" as GroupBy },
                { l: "By source", v: "source" as GroupBy },
              ]).map(g => (
                <button
                  key={g.v}
                  onClick={() => setGroupBy(g.v)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    groupBy === g.v ? "bg-surface-2 text-foreground" : "text-muted-2 hover:text-muted"
                  }`}
                >
                  {g.l}
                </button>
              ))}
            </div>

            {/* Sort — Recent / A-Z are plain toggles; Cheapest / Abe / Thrift /
                Amazon each cycle through neutral → ↑ → ↓ → neutral on click. */}
            <div className="flex items-center gap-1 ml-auto flex-wrap">
              <span className="text-[10px] text-muted-2 uppercase tracking-wider">Sort:</span>
              {([
                { v: "recent"       as SortMode, l: "Recent" },
                { v: "alpha"        as SortMode, l: "A-Z" },
                { v: "cheapest_asc" as SortMode, l: "Cheapest" },
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
              {([
                { label: "Abe",    key: "abe",    tone: "abe"    as const },
                { label: "Thrift", key: "thrift", tone: "thrift" as const },
                { label: "Amazon", key: "amazon", tone: "amazon" as const },
              ]).map(({ label, key, tone }) => {
                const asc  = `${key}_asc`  as SortMode;
                const desc = `${key}_desc` as SortMode;
                // Arrow convention: ↑ = highest first (numerical DESC),
                // ↓ = lowest first (numerical ASC). Cycle unsorted → ↑ → ↓ → unsorted.
                const cycle = () => {
                  if (sortMode === desc) setSortMode(asc);
                  else if (sortMode === asc) setSortMode("recent");
                  else setSortMode(desc);
                };
                const arrow = sortMode === desc ? " ↑" : sortMode === asc ? " ↓" : "";
                const active = sortMode === asc || sortMode === desc;
                const activeCls =
                  tone === "abe"    ? "bg-emerald-600 text-white"
                : tone === "thrift" ? "bg-blue-600 text-white"
                : tone === "amazon" ? "bg-amber-600 text-white"
                :                     "bg-foreground text-background";
                return (
                  <button
                    key={key}
                    onClick={cycle}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      active ? activeCls : "bg-surface-2 text-muted hover:text-foreground"
                    }`}
                    title={`Click to sort by ${label} price — cycles ${label}, ${label} ↑, ${label} ↓`}
                  >
                    {label}{arrow}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Shelf */}
      <main className="flex-1 w-full px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-border-custom border-t-emerald-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📚</p>
            <p className="text-muted text-sm">No recommendations match your filters</p>
          </div>
        ) : (
          <div className="space-y-8">
            {sections.map(section => (
              <section key={section.label ?? "all"}>
                {section.label && (
                  <div className="flex items-center gap-2 mb-4 px-1">
                    <span className="text-lg">{groupBy === "topic" ? "📗" : "🗣️"}</span>
                    <h2 className="text-lg font-semibold text-foreground">{section.label}</h2>
                    <span className="text-xs text-muted bg-surface-2 px-2 py-0.5 rounded-full">
                      {section.recs.length}
                    </span>
                  </div>
                )}
                <div className={`grid ${gridClasses[gridSize]} px-1`}>
                  {section.recs.map(rec => <ShelfRec key={rec.id} rec={rec} />)}
                </div>
                {/* Wooden shelf edge — same as home */}
                <div className="h-[6px] bg-gradient-to-b from-amber-900/40 to-amber-950/60 rounded-b-sm mt-3 mx-1" />
                <div className="h-[2px] bg-amber-900/20 mx-2" />
              </section>
            ))}

            {hasMore && (
              <div className="text-center pt-2">
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="bg-surface-2 hover:bg-border-custom text-foreground px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Show more ({filtered.length - paginated.length} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Exact visual language from BookShelf's ShelfBook — cover with drop shadow,
// spine, hover lift, title+author below. Adapted for a Rec instead of a Book.
function ShelfRec({ rec }: { rec: Rec }) {
  const cover = rec.cover_url ? safeCoverUrl(rec.cover_url) : null;
  const isArticle = rec.item_type === "article";
  return (
    <button className="group relative focus:outline-none" title={`${rec.title}${rec.author ? " — " + rec.author : ""}`}>
      <div className="relative aspect-[2/3] rounded-md overflow-hidden shadow-lg shadow-black/40 transition-shadow group-hover:shadow-black/60">
        {cover ? (
          <>
            <img
              src={cover}
              alt={rec.title}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).parentElement?.querySelector(".cover-fallback")?.classList.remove("hidden");
              }}
            />
            <div className="cover-fallback hidden w-full h-full bg-gradient-to-br from-border-custom to-surface-2 flex flex-col items-center justify-center p-2 text-center absolute inset-0">
              <span className="text-[10px] font-semibold text-foreground leading-tight line-clamp-3">{rec.title}</span>
              <span className="text-[9px] text-muted mt-1 line-clamp-1">{rec.author}</span>
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-border-custom to-surface-2 flex flex-col items-center justify-center p-2 text-center">
            <span className="text-[10px] font-semibold text-foreground leading-tight line-clamp-3">{rec.title}</span>
            <span className="text-[9px] text-muted mt-1 line-clamp-1">{rec.author}</span>
          </div>
        )}

        {/* Spine shadow — same as home */}
        <div className="absolute inset-y-0 left-0 w-[3px] bg-black/30" />

        {/* "+ Library" corner button (books only) — visible on hover */}
        {!isArticle && (
          <Link
            href={`/?addRec=${rec.id}`}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg transition-opacity"
            title="Add to your library"
          >
            + Library
          </Link>
        )}

        {/* Article badge in the top-left */}
        {isArticle && (
          <div className="absolute top-1 left-1.5 bg-blue-500/90 backdrop-blur-sm rounded px-1 py-0.5">
            <span className="text-[8px] font-semibold text-white uppercase tracking-wider">Article</span>
          </div>
        )}

        {/* Price chips bottom-right (parallels rating stars on home) — click to open store */}
        {(rec.lowest_price != null || rec.thriftbooks_price != null || rec.amazon_price != null) && (
          <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-sm rounded px-1 py-0.5 flex flex-col gap-px items-end">
            {rec.lowest_price != null && (
              <a
                href={storeUrl("abe", rec.isbn, rec.title, rec.author)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[8px] text-emerald-300 hover:text-emerald-200 font-bold"
                title="Open on AbeBooks"
              >
                A ${rec.lowest_price.toFixed(0)}
              </a>
            )}
            {rec.thriftbooks_price != null && (
              <a
                href={storeUrl("thrift", rec.isbn, rec.title, rec.author)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[8px] text-blue-300 hover:text-blue-200 font-bold"
                title="Open on ThriftBooks"
              >
                T ${rec.thriftbooks_price.toFixed(0)}
              </a>
            )}
            {rec.amazon_price != null && (
              <a
                href={storeUrl("amazon", rec.isbn, rec.title, rec.author)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[8px] text-amber-300 hover:text-amber-200 font-bold"
                title="Open on Amazon"
              >
                Z ${rec.amazon_price.toFixed(0)}
              </a>
            )}
          </div>
        )}
      </div>

      <div className="mt-1.5">
        <p className="text-[11px] font-medium text-foreground truncate">{rec.title}</p>
        <p className="text-[10px] text-muted-2 truncate">{rec.author}</p>
      </div>
    </button>
  );
}
