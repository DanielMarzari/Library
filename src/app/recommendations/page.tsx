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
import { GoalChips } from "@/components/GoalChips";

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

// The same person is recorded under several spellings — "Tim Mackie" has 60
// recommendations and "Tim Mackie (BibleProject)" has 1,527. Exact matching
// meant picking either one hid the rest. Compare on the name with any
// parenthetical qualifier stripped, so the variants collapse together.
function sourceKey(s?: string | null): string {
  return (s || "")
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function sourceMatches(recSource: string | undefined, filter: string): boolean {
  return sourceKey(recSource) === sourceKey(filter);
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
  /** Set once a store has actually been searched — see src/lib/db.ts. */
  abe_checked_at?: string | null;
  thrift_checked_at?: string | null;
  amazon_checked_at?: string | null;
  item_type?: "book" | "article";
  doi?: string;
  journal?: string;
  url?: string;
  starred?: number;
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
  const [openRec, setOpenRec] = useState<Rec | null>(null);
  const [starredOnly, setStarredOnly] = useState(false);
  // Goal filter. recGoalIds maps rec id -> the goals it belongs to, so the
  // shelf can narrow to "things that serve the goal I'm working on".
  const [goals, setGoals] = useState<Array<{ id: string; name: string }>>([]);
  const [recGoalIds, setRecGoalIds] = useState<Record<string, string[]>>({});
  const [filterGoal, setFilterGoal] = useState<string | null>(null);
  const [showGoalMenu, setShowGoalMenu] = useState(false);
  const PAGE_SIZE = 240;

  // Remove a rec locally after a delete-or-already-own action.
  const removeRec = (id: string) => {
    setRecs(prev => prev.filter(r => r.id !== id));
    if (openRec?.id === id) setOpenRec(null);
  };

  // Star / unstar a rec. Optimistic update — the API round-trip runs in the
  // background so the UI never feels laggy.
  const toggleStar = (rec: Rec) => {
    const next = rec.starred ? 0 : 1;
    setRecs(prev => prev.map(r => r.id === rec.id ? { ...r, starred: next } : r));
    if (openRec?.id === rec.id) setOpenRec({ ...rec, starred: next });
    fetch(`/api/recommendations/${rec.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ starred: next }),
    }).then(r => {
      // Revert on non-OK too — silent failures were letting the star vanish
      // on reload without any signal in the UI.
      if (!r.ok) throw new Error(`${r.status}`);
    }).catch(() => {
      setRecs(prev => prev.map(r => r.id === rec.id ? { ...r, starred: rec.starred } : r));
    });
  };

  // Load
  useEffect(() => {
    (async () => {
      try { setRecs((await api.recommendations.list()) as Rec[]); }
      finally { setLoading(false); }
    })();
  }, []);

  // Goal memberships, loaded alongside. A failure here only costs the goal
  // filter — the shelf itself still works.
  useEffect(() => {
    (async () => {
      try {
        const [g, memberships] = await Promise.all([
          api.learningGoals.list(),
          api.learningGoalBooks.list(),
        ]);
        setGoals((g || []).map(x => ({ id: x.id, name: x.name })));
        const map: Record<string, string[]> = {};
        for (const m of memberships || []) {
          const rid = (m as any).rec_id;
          if (!rid) continue;
          (map[rid] ||= []).push(m.goal_id);
        }
        setRecGoalIds(map);
      } catch { /* goal filter simply stays empty */ }
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
  // Group name variants under one entry, so the dropdown shows "Tim Mackie
  // 1,587" once rather than two entries that each hide the other's results.
  // The longest spelling wins as the display label since it carries the most
  // information ("Tim Mackie (BibleProject)" over "Tim Mackie").
  const sources = useMemo(() => {
    const byKey: Record<string, { label: string; n: number }> = {};
    recs.forEach(r => {
      if (!r.recommended_by) return;
      const key = sourceKey(r.recommended_by);
      if (!key) return;
      const entry = (byKey[key] ||= { label: r.recommended_by, n: 0 });
      entry.n++;
      if (r.recommended_by.length > entry.label.length) entry.label = r.recommended_by;
    });
    return Object.values(byKey)
      .map(e => [e.label, e.n] as [string, number])
      .sort((a, b) => b[1] - a[1]);
  }, [recs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = recs.filter(r => {
      if (starredOnly && !r.starred) return false;
      if (filterGoal && !(recGoalIds[r.id] || []).includes(filterGoal)) return false;
      if (filterTopic && r.topic !== filterTopic) return false;
      if (filterSource && !sourceMatches(r.recommended_by, filterSource)) return false;
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
  }, [recs, search, sortMode, filterTopic, filterSource, starredOnly, filterGoal, recGoalIds]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;
  useEffect(() => { setPage(1); }, [search, filterTopic, filterSource, sortMode, groupBy, starredOnly, filterGoal]);

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
            {/* Starred filter */}
            <button
              onClick={() => setStarredOnly(v => !v)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors flex items-center gap-1 ${
                starredOnly ? "bg-yellow-500 text-black border-yellow-500" : "bg-surface-2 text-muted border-border-custom hover:text-foreground"
              }`}
              title={starredOnly ? "Showing starred only" : "Filter to starred only"}
            >
              <span aria-hidden>{starredOnly ? "★" : "☆"}</span>
              <span>Starred{starredOnly ? "" : ` (${recs.filter(r => r.starred).length})`}</span>
            </button>

            {/* Goal filter — narrows the shelf to what serves one learning goal.
                Counts come from the membership map so an empty goal is visible
                as empty rather than just missing. */}
            <div className="relative">
              <button
                onClick={() => { setShowGoalMenu(v => !v); setShowTopicMenu(false); setShowSourceMenu(false); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                  filterGoal ? "bg-indigo-600 text-white border-indigo-600" : "bg-surface-2 text-muted border-border-custom hover:text-foreground"
                }`}
              >
                {filterGoal ? goals.find(g => g.id === filterGoal)?.name ?? "Goal" : `Goal (${goals.length})`} ▾
              </button>
              {showGoalMenu && (
                <div className="absolute top-full left-0 mt-1 bg-surface border border-border-custom rounded-lg shadow-xl z-20 min-w-[240px] max-h-72 overflow-y-auto">
                  <button
                    onClick={() => { setFilterGoal(null); setShowGoalMenu(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-muted hover:bg-surface-2"
                  >
                    All goals
                  </button>
                  {goals
                    .map(g => ({ ...g, n: recs.filter(r => (recGoalIds[r.id] || []).includes(g.id)).length }))
                    .filter(g => g.n > 0)
                    .sort((a, b) => b.n - a.n)
                    .map(g => (
                      <button
                        key={g.id}
                        onClick={() => { setFilterGoal(g.id); setShowGoalMenu(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs flex justify-between transition-colors ${
                          filterGoal === g.id ? "bg-indigo-600/10 text-indigo-400" : "text-foreground hover:bg-surface-2"
                        }`}
                      >
                        <span className="truncate">{g.name}</span>
                        <span className="text-muted ml-2">{g.n}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>

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
                  {section.recs.map(rec => (
                    <ShelfRec key={rec.id} rec={rec} onOpen={setOpenRec} onToggleStar={toggleStar} />
                  ))}
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

      {openRec && (
        <RecDetailModal
          rec={openRec}
          onClose={() => setOpenRec(null)}
          onRemove={removeRec}
          onToggleStar={toggleStar}
        />
      )}
    </div>
  );
}

// Exact visual language from BookShelf's ShelfBook — cover with drop shadow,
// spine, hover lift, title+author below. Adapted for a Rec instead of a Book.
function ShelfRec({
  rec,
  onOpen,
  onToggleStar,
}: {
  rec: Rec;
  onOpen: (rec: Rec) => void;
  onToggleStar: (rec: Rec) => void;
}) {
  const cover = rec.cover_url ? safeCoverUrl(rec.cover_url) : null;
  const isArticle = rec.item_type === "article";
  const starred = !!rec.starred;
  // <div role="button"> instead of <button> so the nested price <a>s and any
  // future overlay buttons are valid HTML (nesting interactive elements in a
  // real <button> is invalid).
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(rec)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(rec);
        }
      }}
      className="group relative focus:outline-none cursor-pointer"
    >
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

        {/* Star toggle top-right — always visible when starred, revealed on
            hover otherwise. Stops propagation so tapping it doesn't open the
            detail modal. */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleStar(rec); }}
          className={`absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
            starred
              ? "bg-yellow-400/95 text-black shadow-lg"
              : "bg-black/50 backdrop-blur-sm text-white/80 opacity-0 group-hover:opacity-100 hover:bg-black/70"
          }`}
          title={starred ? "Unstar" : "Star this recommendation"}
          aria-label={starred ? "Unstar" : "Star"}
        >
          {starred ? "★" : "☆"}
        </button>

        {/* Article badge in the top-left */}
        {isArticle && (
          <div className="absolute top-1 left-1.5 bg-blue-500/90 backdrop-blur-sm rounded px-1 py-0.5">
            <span className="text-[8px] font-semibold text-white uppercase tracking-wider">Article</span>
          </div>
        )}

        {/* Price chips bottom-right (parallels rating stars on home) — click to
            open store. All three stores always show. A store with no price
            reads "$-", because "we checked and nobody has it" is information
            the shelf should carry; hiding the row made an unavailable book look
            identical to one nobody had priced yet. */}
        {/* Articles aren't sold by any of these stores, so three "$-" rows would
            be noise rather than information. */}
        {!isArticle && (
        <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-sm rounded px-1 py-0.5 flex flex-col gap-px items-end">
          {([
            { store: "abe" as const,    letter: "A", price: rec.lowest_price,      checked: rec.abe_checked_at,    name: "AbeBooks",    tone: "text-emerald-300 hover:text-emerald-200" },
            { store: "thrift" as const, letter: "T", price: rec.thriftbooks_price, checked: rec.thrift_checked_at, name: "ThriftBooks", tone: "text-blue-300 hover:text-blue-200" },
            { store: "amazon" as const, letter: "Z", price: rec.amazon_price,      checked: rec.amazon_checked_at, name: "Amazon",      tone: "text-amber-300 hover:text-amber-200" },
          ]).map(({ store, letter, price, checked, name, tone }) => (
            <a
              key={store}
              href={storeUrl(store, rec.isbn, rec.title, rec.author)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`text-[8px] font-bold ${price != null ? tone : "text-muted-2 hover:text-muted"}`}
              title={
                price != null
                  ? `Open on ${name}`
                  : checked
                    ? `No copy found on ${name} (checked ${checked.slice(0, 10)}) — open to look yourself`
                    : `Not looked up on ${name} yet — open to look yourself`
              }
            >
              {letter} {price != null ? `$${price.toFixed(0)}` : "$-"}
            </a>
          ))}
        </div>
        )}
      </div>

      <div className="mt-1.5">
        <p className="text-[11px] font-medium text-foreground truncate">{rec.title}</p>
        <p className="text-[10px] text-muted-2 truncate">{rec.author}</p>
      </div>
    </div>
  );
}

// Recommendation detail sheet — opens on tap, shows cover + meta + prices +
// buttons: + Library (routes to /?addRec=… on the home page), I already have
// this (deletes the rec so it stops appearing here).
function RecDetailModal({
  rec,
  onClose,
  onRemove,
  onToggleStar,
}: {
  rec: Rec;
  onClose: () => void;
  onRemove: (id: string) => void;
  onToggleStar: (rec: Rec) => void;
}) {
  const cover = rec.cover_url ? safeCoverUrl(rec.cover_url) : null;
  const isArticle = rec.item_type === "article";
  const starred = !!rec.starred;
  const [busy, setBusy] = useState(false);
  const [confirmOwned, setConfirmOwned] = useState(false);

  // Close on Escape.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const removeRec = async () => {
    setBusy(true);
    try {
      await api.recommendations.delete(rec.id);
      onRemove(rec.id);
    } catch {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border-custom rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col sm:flex-row gap-4 p-5">
          {/* Cover */}
          <div className="flex-shrink-0 mx-auto sm:mx-0">
            <div className="w-32 sm:w-40 aspect-[2/3] rounded-md overflow-hidden shadow-lg bg-surface-2">
              {cover ? (
                <img src={cover} alt={rec.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-border-custom to-surface-2">
                  <span className="text-xs font-semibold text-foreground line-clamp-4">{rec.title}</span>
                </div>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-foreground leading-tight">{rec.title}</h2>
                {rec.author && <p className="text-sm text-muted mt-0.5">{rec.author}</p>}
              </div>
              <div className="flex items-start gap-1 flex-shrink-0">
                <button
                  onClick={() => onToggleStar(rec)}
                  className={`p-1 rounded transition-colors ${
                    starred ? "text-yellow-400 hover:text-yellow-300" : "text-muted-2 hover:text-yellow-400"
                  }`}
                  title={starred ? "Unstar" : "Star this recommendation"}
                  aria-label={starred ? "Unstar" : "Star"}
                >
                  <span className="text-xl leading-none">{starred ? "★" : "☆"}</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-1 -mt-1 -mr-1 text-muted-2 hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Type / year / ISBN badges */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[11px]">
              {isArticle && (
                <span className="px-1.5 py-0.5 bg-blue-500/15 text-blue-300 rounded font-semibold uppercase tracking-wider">Article</span>
              )}
              {rec.year && <span className="text-muted-2">{rec.year}</span>}
              {rec.isbn && <span className="text-muted-2 font-mono">ISBN {rec.isbn}</span>}
            </div>

            {/* Topic / source */}
            <div className="space-y-1 text-xs text-muted mb-3">
              {rec.topic && (
                <div><span className="text-muted-2">Topic:</span> <span className="text-foreground">{rec.topic}</span></div>
              )}
              {rec.recommended_by && (
                <div><span className="text-muted-2">Source:</span> <span className="text-foreground">{rec.recommended_by}</span></div>
              )}
              {isArticle && rec.journal && (
                <div><span className="text-muted-2">Journal:</span> <span className="text-foreground">{rec.journal}</span></div>
              )}
              {isArticle && rec.doi && (
                <div className="truncate"><span className="text-muted-2">DOI:</span> <span className="text-foreground font-mono">{rec.doi}</span></div>
              )}
            </div>

            {/* Learning goals — 477 recommendations already sit in a goal, but
                there was no way to see or set that from the recommendation. */}
            <GoalChips recId={rec.id} className="mb-3" />

            {/* Prices (clickable → store) */}
            {(rec.lowest_price != null || rec.thriftbooks_price != null || rec.amazon_price != null) && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {rec.lowest_price != null && (
                  <a href={storeUrl("abe", rec.isbn, rec.title, rec.author)} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 rounded text-[11px] font-bold transition-colors" title="Open on AbeBooks">
                    Abe ${rec.lowest_price.toFixed(2)}
                  </a>
                )}
                {rec.thriftbooks_price != null && (
                  <a href={storeUrl("thrift", rec.isbn, rec.title, rec.author)} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 rounded text-[11px] font-bold transition-colors" title="Open on ThriftBooks">
                    Thrift ${rec.thriftbooks_price.toFixed(2)}
                  </a>
                )}
                {rec.amazon_price != null && (
                  <a href={storeUrl("amazon", rec.isbn, rec.title, rec.author)} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 rounded text-[11px] font-bold transition-colors" title="Open on Amazon">
                    Amazon ${rec.amazon_price.toFixed(2)}
                  </a>
                )}
              </div>
            )}

            {/* Notes */}
            {rec.notes && (
              <div className="text-sm text-foreground whitespace-pre-wrap mb-4 max-h-40 overflow-y-auto">
                {rec.notes}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border-custom">
              {!isArticle && (
                <Link
                  href={`/?addRec=${rec.id}`}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  + Add to library
                </Link>
              )}
              {isArticle && rec.url && (
                <a
                  href={rec.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Open article
                </a>
              )}
              {confirmOwned ? (
                <>
                  <button
                    onClick={removeRec}
                    disabled={busy}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Yes, remove
                  </button>
                  <button
                    onClick={() => setConfirmOwned(false)}
                    disabled={busy}
                    className="px-3 py-1.5 bg-surface-2 hover:bg-border-custom text-muted rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmOwned(true)}
                  className="px-3 py-1.5 bg-surface-2 hover:bg-border-custom text-foreground rounded-lg text-sm font-medium transition-colors"
                  title="I already own this — remove it from recommendations"
                >
                  I already have this
                </button>
              )}
              <Link
                href={`/recommendations/manage?edit=${rec.id}`}
                className="ml-auto px-3 py-1.5 text-sm text-muted hover:text-foreground transition-colors self-center"
              >
                Edit →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
