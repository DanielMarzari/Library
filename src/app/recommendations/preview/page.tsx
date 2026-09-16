"use client";

export const dynamic = "force-dynamic";

// Preview of a shelf-style layout for the recommendations page — cover grid
// with cross-cutting filter chips instead of the current row list. Real data,
// no writes. Nothing on the real /recommendations page changes.

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { safeCoverUrl } from "@/lib/coverUrl";

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
  item_type?: "book" | "article";
  doi?: string;
  journal?: string;
  created_at: string;
}

type GridSize = "xs" | "small" | "medium" | "large";
type SortMode = "recent" | "alpha" | "abe_asc" | "abe_desc" | "thrift_asc" | "thrift_desc";

const gridClasses: Record<GridSize, string> = {
  xs:     "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 2xl:grid-cols-14 gap-2",
  small:  "grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-3",
  medium: "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-4",
  large:  "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-5",
};

export default function RecommendationsPreview() {
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [gridSize, setGridSize] = useState<GridSize>("medium");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [filterTopic, setFilterTopic] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [showTopicMenu, setShowTopicMenu] = useState(false);
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 120;

  useEffect(() => {
    (async () => {
      try {
        const data = await api.recommendations.list();
        setRecs(data as Rec[]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Aggregate topic and source counts for the filter dropdowns.
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
      const hay = [r.title, r.author || "", r.recommended_by || "", r.topic || "", r.notes || ""].join(" ").toLowerCase();
      return hay.includes(q);
    });
    switch (sortMode) {
      case "alpha": out.sort((a, b) => a.title.localeCompare(b.title)); break;
      case "abe_asc": out.sort((a, b) => (a.lowest_price ?? 9999) - (b.lowest_price ?? 9999)); break;
      case "abe_desc": out.sort((a, b) => (b.lowest_price ?? 0) - (a.lowest_price ?? 0)); break;
      case "thrift_asc": out.sort((a, b) => (a.thriftbooks_price ?? 9999) - (b.thriftbooks_price ?? 9999)); break;
      case "thrift_desc": out.sort((a, b) => (b.thriftbooks_price ?? 0) - (a.thriftbooks_price ?? 0)); break;
      case "recent":
      default: out.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    }
    return out;
  }, [recs, search, sortMode, filterTopic, filterSource]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;

  useEffect(() => { setPage(1); }, [search, filterTopic, filterSource, sortMode]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header — same shape as the main library page */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border-custom">
        <div className="max-w-screen-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Recommendations · Preview</h1>
              <p className="text-[10px] text-muted-2 mt-0.5">
                {filtered.length.toLocaleString()} of {recs.length.toLocaleString()} · shelf-style mockup
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/recommendations" className="text-xs text-muted hover:text-foreground">← Current view</Link>
              <Link href="/" className="bg-surface-2 hover:bg-border-custom text-foreground px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">Library</Link>
            </div>
          </div>

          {/* Search + grid-size toggle */}
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              placeholder="Search title, author, source, topic, notes…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-surface border border-border-custom rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
            <div className="flex gap-0.5 bg-surface rounded-lg p-0.5 flex-shrink-0">
              {(["xs", "small", "medium", "large"] as GridSize[]).map(s => (
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
          </div>

          {/* Filter + sort row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Topic filter */}
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

            {/* Source filter */}
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

            {/* Sort */}
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-[10px] text-muted-2 uppercase tracking-wider">Sort:</span>
              {([
                { l: "Recent", v: "recent" as SortMode },
                { l: "A-Z", v: "alpha" as SortMode },
                { l: "Abe↑", v: "abe_asc" as SortMode },
                { l: "Thrift↑", v: "thrift_asc" as SortMode },
              ]).map(s => (
                <button
                  key={s.v}
                  onClick={() => setSortMode(s.v)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    sortMode === s.v ? "bg-foreground text-background" : "bg-surface-2 text-muted hover:text-foreground"
                  }`}
                >
                  {s.l}
                </button>
              ))}
            </div>

            {/* Clear filters */}
            {(filterTopic || filterSource) && (
              <button
                onClick={() => { setFilterTopic(null); setFilterSource(null); }}
                className="px-2 py-0.5 rounded text-[10px] text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-4">
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
          <>
            <div className={`grid ${gridClasses[gridSize]}`}>
              {paginated.map(rec => <RecCover key={rec.id} rec={rec} />)}
            </div>
            {hasMore && (
              <div className="text-center mt-6">
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="bg-surface-2 hover:bg-border-custom text-foreground px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Show more ({filtered.length - paginated.length} remaining)
                </button>
              </div>
            )}
            <p className="text-center text-[10px] text-muted mt-3">
              Showing {paginated.length} of {filtered.length.toLocaleString()}
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function RecCover({ rec }: { rec: Rec }) {
  const cover = rec.cover_url ? safeCoverUrl(rec.cover_url) : null;
  const isArticle = rec.item_type === "article";
  return (
    <button
      type="button"
      className="group relative bg-surface rounded-lg overflow-hidden border border-border-custom hover:border-emerald-500/60 transition-colors text-left flex flex-col"
      title={`${rec.title}${rec.author ? " — " + rec.author : ""}`}
    >
      <div className="aspect-[2/3] bg-surface-2 relative overflow-hidden">
        {cover ? (
          <img src={cover} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
            <span className="text-3xl mb-1">{isArticle ? "📄" : "📖"}</span>
            <span className="text-[10px] text-muted-2 line-clamp-3">{rec.title}</span>
          </div>
        )}
        {/* Article badge */}
        {isArticle && (
          <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-blue-500/90 text-white rounded text-[9px] font-semibold">
            Article
          </span>
        )}
        {/* Price badges (bottom-right stack) */}
        <div className="absolute bottom-1 right-1 flex flex-col gap-0.5 items-end">
          {rec.lowest_price != null && (
            <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[9px] font-bold">A ${rec.lowest_price.toFixed(0)}</span>
          )}
          {rec.thriftbooks_price != null && (
            <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[9px] font-bold">T ${rec.thriftbooks_price.toFixed(0)}</span>
          )}
        </div>
      </div>
      <div className="p-1.5 flex-1 flex flex-col min-w-0">
        <p className="text-[11px] font-medium text-foreground line-clamp-2 leading-snug">{rec.title}</p>
        {rec.author && (
          <p className="text-[10px] text-muted line-clamp-1 mt-0.5">{rec.author}</p>
        )}
        {(rec.topic || rec.recommended_by) && (
          <div className="flex flex-wrap gap-1 mt-1">
            {rec.topic && (
              <span className="px-1 py-0 bg-emerald-500/10 text-emerald-500 rounded text-[9px] font-medium truncate max-w-full">
                {rec.topic}
              </span>
            )}
            {rec.recommended_by && (
              <span className="px-1 py-0 bg-blue-500/10 text-blue-400 rounded text-[9px] font-medium truncate max-w-full">
                @{rec.recommended_by}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
