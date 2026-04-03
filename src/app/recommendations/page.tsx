"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { searchBooks, enrichBook, BookSearchResult } from "@/lib/bookLookup";
import Link from "next/link";

interface Recommendation {
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
  created_at: string;
}

type SortMode = "recent" | "price_asc" | "price_desc" | "alpha";

interface LibraryBook {
  title: string;
  status: string;
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [allRecs, setAllRecs] = useState<Recommendation[]>([]);
  const [libraryBooks, setLibraryBooks] = useState<LibraryBook[]>([]);
  const [libraryTitles, setLibraryTitles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [recommendedBy, setRecommendedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedResult, setSelectedResult] = useState<BookSearchResult | null>(null);
  const [addingLoading, setAddingLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterTopic, setFilterTopic] = useState<string | null>(null);
  const [excludeTopic, setExcludeTopic] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [excludeSource, setExcludeSource] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showOwned, setShowOwned] = useState(false);
  const [page, setPage] = useState(1);
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [fetchingPrices, setFetchingPrices] = useState(false);
  const [priceProgress, setPriceProgress] = useState({ done: 0, total: 0 });
  const PAGE_SIZE = 60;

  // Load recommendations and library titles
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // Load ALL recommendations (paginated for large sets)
      let allRecsData: Recommendation[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data: batch } = await supabase
          .from("recommendations")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, from + batchSize - 1);
        if (batch && batch.length > 0) {
          allRecsData = [...allRecsData, ...batch];
          if (batch.length < batchSize) break;
          from += batchSize;
        } else break;
      }

      // Load library books
      const { data: books } = await supabase
        .from("books")
        .select("title,status");

      const existingTitles = new Set(
        (books || []).map((b) => b.title.toLowerCase())
      );
      setLibraryTitles(existingTitles);
      setLibraryBooks(books || []);
      setAllRecs(allRecsData);

      const visibleRecs = allRecsData.filter(
        (rec) => !existingTitles.has(rec.title.toLowerCase())
      );
      setRecommendations(visibleRecs);
      setLoading(false);
    };

    loadData();
  }, []);

  // Stats calculations
  const stats = useMemo(() => {
    const timRecs = allRecs.filter(r => r.recommended_by === "Tim Mackie (BibleProject)" || r.recommended_by === "Tim Mackie");
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 40);
    const bookMap = new Map<string, LibraryBook>();
    libraryBooks.forEach(b => bookMap.set(normalize(b.title), b));

    let timOwned = 0, timRead = 0;
    timRecs.forEach(r => {
      const match = bookMap.get(normalize(r.title));
      if (match) {
        timOwned++;
        if (match.status === "read" || match.status === "completed") timRead++;
      }
    });

    const otherRecs = allRecs.filter(r => r.recommended_by !== "Tim Mackie (BibleProject)" && r.recommended_by !== "Tim Mackie");
    let otherOwned = 0, otherRead = 0;
    otherRecs.forEach(r => {
      const match = bookMap.get(normalize(r.title));
      if (match) {
        otherOwned++;
        if (match.status === "read" || match.status === "completed") otherRead++;
      }
    });

    return {
      total: allRecs.length,
      timTotal: timRecs.length,
      timOwned,
      timRead,
      timOwnPct: timRecs.length > 0 ? ((timOwned / timRecs.length) * 100).toFixed(1) : "0",
      timReadPct: timRecs.length > 0 ? ((timRead / timRecs.length) * 100).toFixed(1) : "0",
      otherTotal: otherRecs.length,
      otherOwned,
      otherRead,
    };
  }, [allRecs, libraryBooks]);

  // Search for books
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    setSearching(true);
    try {
      const results = await searchBooks(query, 5);
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Add recommendation
  const handleAddRecommendation = async (book: BookSearchResult | null = null) => {
    const bookToAdd = book || selectedResult;
    if (!bookToAdd || !bookToAdd.title.trim()) {
      alert("Please select or search for a book");
      return;
    }
    setAddingLoading(true);
    try {
      const enrichedBook = await enrichBook(bookToAdd);
      const { data, error } = await supabase
        .from("recommendations")
        .insert({
          title: enrichedBook.title,
          author: enrichedBook.author,
          isbn: enrichedBook.isbn,
          cover_url: enrichedBook.cover_url,
          recommended_by: recommendedBy.trim() || null,
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (!error && data) {
        setRecommendations((prev) => [data, ...prev]);
        setAllRecs((prev) => [data, ...prev]);
        setSearchQuery("");
        setRecommendedBy("");
        setNotes("");
        setSelectedResult(null);
        setSearchResults([]);
        setShowSearchResults(false);
        setShowAddForm(false);
      }
    } catch (error) {
      console.error("Error adding recommendation:", error);
    } finally {
      setAddingLoading(false);
    }
  };

  // Delete recommendation
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("recommendations").delete().eq("id", id);
      if (!error) {
        setRecommendations((prev) => prev.filter((r) => r.id !== id));
        setAllRecs((prev) => prev.filter((r) => r.id !== id));
      }
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  // Helper: get all tags for a recommendation (from topic + notes)
  const getRecTags = useCallback((rec: Recommendation): string[] => {
    const tags: string[] = [];
    if (rec.topic) tags.push(rec.topic);
    // notes sometimes has additional tags (not duplicates of topic)
    if (rec.notes && rec.notes !== rec.topic && rec.notes !== rec.interest) {
      // Split comma-separated notes into individual tags
      rec.notes.split(",").forEach(n => {
        const t = n.trim();
        if (t && t !== rec.topic && !t.startsWith("Mentioned")) tags.push(t);
      });
    }
    return tags;
  }, []);

  // Derived filter data — count tags across topic + notes
  const allTopics = useMemo(() => {
    const counts: Record<string, number> = {};
    recommendations.forEach(r => {
      getRecTags(r).forEach(tag => { counts[tag] = (counts[tag] || 0) + 1; });
    });
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  }, [recommendations, getRecTags]);

  // Collection badges (Mentioned on Podcast, Mentioned in Classroom, etc.)
  const allCollections = useMemo(() => {
    const counts: Record<string, number> = {};
    recommendations.forEach(r => {
      if (r.interest) {
        r.interest.split(",").forEach(i => {
          const t = i.trim();
          if (t && t.startsWith("Mentioned")) counts[t] = (counts[t] || 0) + 1;
        });
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [recommendations]);

  const allSources = useMemo(() => {
    const counts: Record<string, number> = {};
    recommendations.forEach(r => { if (r.recommended_by) counts[r.recommended_by] = (counts[r.recommended_by] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [recommendations]);

  // 3-state filter: null = all, filterTopic = include, excludeTopic = exclude
  const toggleTopicFilter = (topic: string) => {
    if (filterTopic === topic) {
      // Second click: switch to exclude
      setFilterTopic(null);
      setExcludeTopic(topic);
    } else if (excludeTopic === topic) {
      // Third click: clear
      setExcludeTopic(null);
    } else {
      // First click: include
      setFilterTopic(topic);
      setExcludeTopic(null);
    }
  };

  const toggleSourceFilter = (source: string) => {
    if (filterSource === source) {
      setFilterSource(null);
      setExcludeSource(source);
    } else if (excludeSource === source) {
      setExcludeSource(null);
    } else {
      setFilterSource(source);
      setExcludeSource(null);
    }
  };

  const filteredRecs = useMemo(() => {
    const filtered = recommendations.filter(rec => {
      const tags = getRecTags(rec);
      if (filterTopic && !tags.includes(filterTopic)) return false;
      if (excludeTopic && tags.includes(excludeTopic)) return false;
      if (filterSource && rec.recommended_by !== filterSource) return false;
      if (excludeSource && rec.recommended_by === excludeSource) return false;
      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        if (!rec.title.toLowerCase().includes(q) && !(rec.author || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });

    // Apply sort
    switch (sortMode) {
      case "alpha":
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "price_asc":
        filtered.sort((a, b) => (a.lowest_price ?? 9999) - (b.lowest_price ?? 9999));
        break;
      case "price_desc":
        filtered.sort((a, b) => (b.lowest_price ?? 0) - (a.lowest_price ?? 0));
        break;
      case "recent":
      default:
        break;
    }
    return filtered;
  }, [recommendations, filterTopic, excludeTopic, filterSource, excludeSource, searchFilter, getRecTags, sortMode]);

  const paginatedRecs = useMemo(() => {
    return filteredRecs.slice(0, page * PAGE_SIZE);
  }, [filteredRecs, page]);

  // Fetch prices for filtered recommendations that don't have one yet
  const handleFetchPrices = async () => {
    const noPriceRecs = filteredRecs.filter(r => r.lowest_price == null).slice(0, 50);
    if (noPriceRecs.length === 0) return;
    setFetchingPrices(true);
    setPriceProgress({ done: 0, total: noPriceRecs.length });

    for (let i = 0; i < noPriceRecs.length; i++) {
      const rec = noPriceRecs[i];
      try {
        const resp = await fetch("/api/fetch-price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: rec.title, author: rec.author, recId: rec.id }),
        });
        const data = await resp.json();
        if (data.price != null) {
          setRecommendations(prev => prev.map(r => r.id === rec.id ? { ...r, lowest_price: data.price } : r));
        }
      } catch (e) {
        // skip failures
      }
      setPriceProgress({ done: i + 1, total: noPriceRecs.length });
      // Small delay to avoid hammering AbeBooks
      await new Promise(r => setTimeout(r, 800));
    }
    setFetchingPrices(false);
  };

  const hasMore = paginatedRecs.length < filteredRecs.length;

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [filterTopic, excludeTopic, filterSource, excludeSource, searchFilter]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border-custom">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Recommendations</h1>
              <p className="text-xs text-muted mt-0.5">{filteredRecs.length.toLocaleString()} books to explore</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                + Add
              </button>
              <Link
                href="/"
                className="bg-surface-2 hover:bg-border-custom text-foreground px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                ← Library
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-4">
        {/* Stats Cards */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="bg-surface border border-border-custom rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted font-medium">Tim&apos;s Library</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.timTotal.toLocaleString()}</p>
              <p className="text-[10px] text-muted mt-0.5">books in collection</p>
            </div>
            <div className="bg-surface border border-border-custom rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted font-medium">You Own</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <p className="text-2xl font-bold text-emerald-500">{stats.timOwnPct}%</p>
                <p className="text-xs text-muted">({stats.timOwned})</p>
              </div>
              <div className="mt-1.5 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${stats.timOwnPct}%` }} />
              </div>
            </div>
            <div className="bg-surface border border-border-custom rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted font-medium">You&apos;ve Read</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <p className="text-2xl font-bold text-blue-500">{stats.timReadPct}%</p>
                <p className="text-xs text-muted">({stats.timRead})</p>
              </div>
              <div className="mt-1.5 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${stats.timReadPct}%` }} />
              </div>
            </div>
            <div className="bg-surface border border-border-custom rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted font-medium">Other Recs</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.otherTotal}</p>
              <p className="text-[10px] text-muted mt-0.5">
                {stats.otherOwned} owned · {stats.otherRead} read
              </p>
            </div>
          </div>
        )}

        {/* Collapsible Add Form */}
        {showAddForm && (
          <div className="bg-surface border border-border-custom rounded-xl p-4 mb-5 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Add a Recommendation</h2>
              <button onClick={() => setShowAddForm(false)} className="text-muted hover:text-foreground text-sm">✕</button>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by title or ISBN..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full bg-surface-2 border border-border-custom rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                {showSearchResults && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface-2 border border-border-custom rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                    {searching ? (
                      <div className="p-3 text-center text-muted text-sm">Searching...</div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((result, idx) => (
                        <button
                          key={idx}
                          onClick={() => { setSelectedResult(result); setShowSearchResults(false); }}
                          className="w-full text-left px-3 py-2 hover:bg-border-custom border-b border-border-custom last:border-0 transition-colors"
                        >
                          <div className="font-medium text-foreground text-sm">{result.title}</div>
                          <div className="text-xs text-muted">{result.author || "Unknown"}</div>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-muted text-sm">No results</div>
                    )}
                  </div>
                )}
              </div>
              {selectedResult && (
                <div className="flex items-center gap-3 bg-surface-2 rounded-lg p-2.5">
                  {selectedResult.cover_url && (
                    <img src={selectedResult.cover_url} alt="" className="w-10 h-14 object-cover rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{selectedResult.title}</p>
                    <p className="text-xs text-muted">{selectedResult.author}</p>
                  </div>
                  <button onClick={() => setSelectedResult(null)} className="text-muted hover:text-foreground text-xs">✕</button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Recommended by..." value={recommendedBy} onChange={(e) => setRecommendedBy(e.target.value)}
                  className="bg-surface-2 border border-border-custom rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-1 focus:ring-emerald-600" />
                <input type="text" placeholder="Notes..." value={notes} onChange={(e) => setNotes(e.target.value)}
                  className="bg-surface-2 border border-border-custom rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-1 focus:ring-emerald-600" />
              </div>
              <button
                onClick={() => handleAddRecommendation()}
                disabled={!selectedResult || addingLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-border-custom disabled:text-muted text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {addingLoading ? "Adding..." : "+ Add Recommendation"}
              </button>
            </div>
          </div>
        )}

        {/* Search & Sort Bar */}
        <div className="mb-4 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search recommendations..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-surface border border-border-custom rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Sort + Price row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-muted uppercase tracking-wider font-medium">Sort:</span>
            {([
              { label: "Recent", value: "recent" as SortMode },
              { label: "A-Z", value: "alpha" as SortMode },
              { label: "Price ↑", value: "price_asc" as SortMode },
              { label: "Price ↓", value: "price_desc" as SortMode },
            ]).map(s => (
              <button
                key={s.value}
                onClick={() => setSortMode(s.value)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  sortMode === s.value ? "bg-foreground text-background" : "bg-surface-2 text-muted hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              {fetchingPrices ? (
                <span className="text-[10px] text-muted">
                  Fetching prices... {priceProgress.done}/{priceProgress.total}
                </span>
              ) : (
                <button
                  onClick={handleFetchPrices}
                  className="px-2.5 py-1 bg-amber-500/10 text-amber-500 rounded text-[10px] font-medium hover:bg-amber-500/20 transition-colors"
                >
                  Fetch Prices (AbeBooks)
                </button>
              )}
            </div>
          </div>

          {/* Source filter pills */}
          {allSources.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => { setFilterSource(null); setExcludeSource(null); }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${!filterSource && !excludeSource ? "bg-blue-600 text-white" : "bg-surface-2 text-muted hover:text-foreground"}`}
              >
                All Sources
              </button>
              {allSources.slice(0, 8).map(([source, count]) => (
                <button
                  key={source}
                  onClick={() => toggleSourceFilter(source)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    filterSource === source ? "bg-blue-600 text-white" :
                    excludeSource === source ? "bg-red-500/20 text-red-400 line-through" :
                    "bg-surface-2 text-muted hover:text-foreground"
                  }`}
                >
                  {excludeSource === source && "− "}{source} <span className="opacity-60">({count})</span>
                </button>
              ))}
            </div>
          )}

          {/* Collection filter pills (Mentioned on Podcast, etc.) */}
          {allCollections.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allCollections.map(([coll, count]) => (
                <button
                  key={coll}
                  onClick={() => toggleTopicFilter(coll)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    filterTopic === coll ? "bg-amber-600 text-white" :
                    excludeTopic === coll ? "bg-red-500/20 text-red-400 line-through" :
                    "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                  }`}
                >
                  {excludeTopic === coll && "− "}{coll} <span className="opacity-60">({count})</span>
                </button>
              ))}
            </div>
          )}

          {/* Topic filter pills */}
          {allTopics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => { setFilterTopic(null); setExcludeTopic(null); }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${!filterTopic && !excludeTopic ? "bg-emerald-600 text-white" : "bg-surface-2 text-muted hover:text-foreground"}`}
              >
                All Topics
              </button>
              {allTopics.map(([topic, count]) => (
                <button
                  key={topic}
                  onClick={() => toggleTopicFilter(topic)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    filterTopic === topic ? "bg-emerald-600 text-white" :
                    excludeTopic === topic ? "bg-red-500/20 text-red-400 line-through" :
                    "bg-surface-2 text-muted hover:text-foreground"
                  }`}
                >
                  {excludeTopic === topic && "− "}{topic} <span className="opacity-60">({count})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recommendations List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-border-custom border-t-emerald-500" />
          </div>
        ) : filteredRecs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📚</p>
            <p className="text-muted text-sm">
              {searchFilter || filterTopic || filterSource ? "No books match your filters" : "No recommendations yet"}
            </p>
          </div>
        ) : (
          <>
            {/* Compact table/list view for large collections */}
            <div className="bg-surface border border-border-custom rounded-xl overflow-hidden">
              <div className="divide-y divide-border-custom">
                {paginatedRecs.map((rec) => (
                  <div
                    key={rec.id}
                    className="group flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2/50 transition-colors relative"
                  >
                    {/* Cover thumbnail */}
                    {rec.cover_url ? (
                      <img src={rec.cover_url} alt="" className="w-8 h-11 object-cover rounded flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-11 bg-surface-2 rounded flex-shrink-0 flex items-center justify-center">
                        <span className="text-[10px] text-muted">📖</span>
                      </div>
                    )}

                    {/* Title & Author */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{rec.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {rec.author && (
                          <span className="text-xs text-muted truncate">{rec.author}</span>
                        )}
                        {getRecTags(rec).map((tag, i) => (
                          <span
                            key={i}
                            onClick={(e) => { e.stopPropagation(); toggleTopicFilter(tag); }}
                            className="px-1.5 py-0 bg-emerald-500/10 text-emerald-500 rounded text-[9px] font-medium flex-shrink-0 cursor-pointer hover:bg-emerald-500/20"
                          >
                            {tag}
                          </span>
                        ))}
                        {rec.interest && rec.interest.split(",").map(i => i.trim()).filter(i => i.startsWith("Mentioned")).map((coll, i) => (
                          <span
                            key={`c${i}`}
                            className="px-1.5 py-0 bg-amber-500/10 text-amber-500 rounded text-[9px] font-medium flex-shrink-0 hidden sm:inline"
                          >
                            {coll}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Price badge */}
                    {rec.lowest_price != null && (
                      <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded text-[9px] font-bold flex-shrink-0">
                        ${rec.lowest_price.toFixed(0)}
                      </span>
                    )}

                    {/* Source badge */}
                    {rec.recommended_by && (
                      <span className="text-[10px] text-muted hidden md:inline flex-shrink-0 max-w-[120px] truncate">
                        {rec.recommended_by}
                      </span>
                    )}

                    {/* Actions (visible on hover) */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <a
                        href={`https://www.amazon.com/s?k=${encodeURIComponent(rec.title + (rec.author ? " " + rec.author : ""))}&i=stripbooks`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded text-[9px] font-medium hover:bg-amber-500/20 transition-colors"
                      >
                        Amazon
                      </a>
                      <a
                        href={`https://www.abebooks.com/servlet/SearchResults?kn=${encodeURIComponent(rec.title + (rec.author ? " " + rec.author : ""))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-[9px] font-medium hover:bg-emerald-500/20 transition-colors"
                      >
                        Abe
                      </a>
                      <a
                        href={`https://www.thriftbooks.com/browse/?b.search=${encodeURIComponent(rec.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-[9px] font-medium hover:bg-blue-500/20 transition-colors"
                      >
                        Thrift
                      </a>
                      {deleteConfirm === rec.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(rec.id)}
                            className="px-2 py-1 bg-red-600 text-white rounded text-[9px] font-medium"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 bg-surface-2 text-muted rounded text-[9px] font-medium"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(rec.id)}
                          className="px-1.5 py-1 text-muted hover:text-red-400 rounded text-[9px] transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center mt-4">
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="bg-surface-2 hover:bg-border-custom text-foreground px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Show more ({filteredRecs.length - paginatedRecs.length} remaining)
                </button>
              </div>
            )}

            {/* Result count footer */}
            <p className="text-center text-[10px] text-muted mt-3">
              Showing {paginatedRecs.length} of {filteredRecs.length.toLocaleString()} recommendations
            </p>
          </>
        )}
      </main>
    </div>
  );
}
