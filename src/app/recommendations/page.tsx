"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Book } from "@/types/book";
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
  created_at: string;
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [libraryTitles, setLibraryTitles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [recommendedBy, setRecommendedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedResult, setSelectedResult] = useState<BookSearchResult | null>(
    null
  );
  const [addingLoading, setAddingLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterTopic, setFilterTopic] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  // Load recommendations and library titles
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // Load recommendations
      const { data: recs } = await supabase
        .from("recommendations")
        .select("*")
        .order("created_at", { ascending: false });

      if (recs) {
        // Filter out books that already exist in the library
        const { data: books } = await supabase
          .from("books")
          .select("title");

        const existingTitles = new Set(
          (books || []).map((b) => b.title.toLowerCase())
        );
        setLibraryTitles(existingTitles);

        const visibleRecs = recs.filter(
          (rec) => !existingTitles.has(rec.title.toLowerCase())
        );
        setRecommendations(visibleRecs);
      }

      setLoading(false);
    };

    loadData();
  }, []);

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
  const handleAddRecommendation = async (
    book: BookSearchResult | null = null
  ) => {
    const bookToAdd = book || selectedResult;
    if (!bookToAdd || !bookToAdd.title.trim()) {
      alert("Please select or search for a book");
      return;
    }

    if (libraryTitles.has(bookToAdd.title.toLowerCase())) {
      alert("This book is already in your library");
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
        setSearchQuery("");
        setRecommendedBy("");
        setNotes("");
        setSelectedResult(null);
        setSearchResults([]);
        setShowSearchResults(false);
      } else {
        alert("Failed to add recommendation");
      }
    } catch (error) {
      console.error("Error adding recommendation:", error);
      alert("Error adding recommendation");
    } finally {
      setAddingLoading(false);
    }
  };

  // Add to library
  const handleAddToLibrary = async (rec: Recommendation) => {
    try {
      const { error } = await supabase.from("books").insert({
        title: rec.title,
        author: rec.author || "",
        isbn: rec.isbn,
        cover_url: rec.cover_url,
        status: "not_read",
        source: rec.recommended_by
          ? `Recommended by ${rec.recommended_by}`
          : "Recommendation",
      });

      if (!error) {
        // Delete from recommendations
        await supabase.from("recommendations").delete().eq("id", rec.id);
        setRecommendations((prev) =>
          prev.filter((r) => r.id !== rec.id)
        );
      } else {
        alert("Failed to add book to library");
      }
    } catch (error) {
      console.error("Error adding to library:", error);
      alert("Error adding book to library");
    }
  };

  // Delete recommendation
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("recommendations")
        .delete()
        .eq("id", id);

      if (!error) {
        setRecommendations((prev) => prev.filter((r) => r.id !== id));
      }
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  // Derived filter data
  const allTopics = [...new Set(recommendations.map(r => r.topic).filter(Boolean))] as string[];
  const allSources = [...new Set(recommendations.map(r => r.recommended_by).filter(Boolean))] as string[];

  const filteredRecs = recommendations.filter(rec => {
    if (filterTopic && rec.topic !== filterTopic) return false;
    if (filterSource && rec.recommended_by !== filterSource) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      if (!rec.title.toLowerCase().includes(q) && !(rec.author || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border-custom">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold tracking-tight">
              Recommendations <span className="text-muted text-base font-normal">({filteredRecs.length})</span>
            </h1>
            <Link
              href="/"
              className="bg-surface-2 hover:bg-border-custom text-foreground px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              ← Back to Library
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {/* Filters */}
        <div className="mb-6 space-y-3">
          <input
            type="text"
            placeholder="Filter by title or author..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-surface border border-border-custom rounded-lg px-4 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:border-emerald-500"
          />
          {allTopics.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterTopic(null)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!filterTopic ? "bg-emerald-600 text-white" : "bg-surface-2 text-muted hover:text-foreground"}`}
              >
                All Topics
              </button>
              {allTopics.sort().map(topic => (
                <button
                  key={topic}
                  onClick={() => setFilterTopic(filterTopic === topic ? null : topic)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterTopic === topic ? "bg-emerald-600 text-white" : "bg-surface-2 text-muted hover:text-foreground"}`}
                >
                  {topic}
                </button>
              ))}
            </div>
          )}
          {allSources.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterSource(null)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!filterSource ? "bg-blue-600 text-white" : "bg-surface-2 text-muted hover:text-foreground"}`}
              >
                All Sources
              </button>
              {allSources.sort().map(source => (
                <button
                  key={source}
                  onClick={() => setFilterSource(filterSource === source ? null : source)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterSource === source ? "bg-blue-600 text-white" : "bg-surface-2 text-muted hover:text-foreground"}`}
                >
                  {source}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add Recommendation Form */}
        <div className="bg-surface border border-border-custom rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Add a Recommendation
          </h2>

          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <label className="block text-sm font-medium text-foreground mb-2">
                Search by Title or ISBN
              </label>
              <input
                type="text"
                placeholder="Enter book title or ISBN..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full bg-surface-2 border border-border-custom rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
              />

              {/* Search Results Dropdown */}
              {showSearchResults && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-2 border border-border-custom rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                  {searching ? (
                    <div className="p-3 text-center text-muted text-sm">
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((result, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedResult(result);
                          setShowSearchResults(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-border-custom border-b border-border-custom last:border-0 transition-colors"
                      >
                        <div className="font-medium text-foreground text-sm">
                          {result.title}
                        </div>
                        <div className="text-xs text-muted">
                          {result.author || "Unknown author"}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-muted text-sm">
                      No results found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selected Book */}
            {selectedResult && (
              <div className="bg-surface-2 border border-border-custom rounded-lg p-4">
                <div className="flex items-start gap-4">
                  {selectedResult.cover_url && (
                    <img
                      src={selectedResult.cover_url}
                      alt={selectedResult.title}
                      className="w-16 h-24 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm mb-1">
                      {selectedResult.title}
                    </h3>
                    <p className="text-xs text-muted mb-3">
                      {selectedResult.author || "Unknown author"}
                    </p>
                    {selectedResult.description && (
                      <p className="text-xs text-muted line-clamp-2">
                        {selectedResult.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedResult(null)}
                    className="text-muted hover:text-foreground text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Recommended By */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Recommended By
              </label>
              <input
                type="text"
                placeholder="e.g., Sarah, Uncle Mike, Twitter..."
                value={recommendedBy}
                onChange={(e) => setRecommendedBy(e.target.value)}
                className="w-full bg-surface-2 border border-border-custom rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Notes (Why should I read it?)
              </label>
              <textarea
                placeholder="Great for learning about..., Friend loved it because..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full bg-surface-2 border border-border-custom rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent resize-none"
              />
            </div>

            {/* Add Button */}
            <button
              onClick={() => handleAddRecommendation()}
              disabled={!selectedResult || addingLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-border-custom disabled:text-muted text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {addingLoading ? "Adding..." : "+ Add Recommendation"}
            </button>
          </div>
        </div>

        {/* Recommendations List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-border-custom border-t-emerald-500" />
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">💭</p>
            <p className="text-muted text-lg mb-2">No recommendations yet</p>
            <p className="text-muted-2 text-sm">
              Add books people have recommended to you
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecs.map((rec) => (
              <div
                key={rec.id}
                className="bg-surface border border-border-custom rounded-lg overflow-hidden hover:border-border-custom transition-colors flex flex-col"
              >
                {/* Cover Image */}
                {rec.cover_url ? (
                  <img
                    src={rec.cover_url}
                    alt={rec.title}
                    className="w-full h-48 object-cover bg-surface-2"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-surface-2 to-surface flex items-center justify-center">
                    <span className="text-4xl">📖</span>
                  </div>
                )}

                {/* Content */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-foreground text-sm line-clamp-2 mb-1">
                    {rec.title}
                  </h3>

                  {rec.author && (
                    <p className="text-xs text-muted mb-3">{rec.author}</p>
                  )}

                  {/* Topic & Interest pills */}
                  {(rec.topic || rec.interest || rec.year) && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {rec.topic && (
                        <span className="px-2 py-0.5 bg-blue-500/15 text-blue-400 rounded text-[10px] font-medium">{rec.topic}</span>
                      )}
                      {rec.interest && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          rec.interest === "High" ? "bg-emerald-500/15 text-emerald-400" :
                          rec.interest === "Average" ? "bg-amber-500/15 text-amber-400" :
                          "bg-surface-2 text-muted"
                        }`}>{rec.interest}</span>
                      )}
                      {rec.year && (
                        <span className="px-2 py-0.5 bg-surface-2 text-muted rounded text-[10px]">{rec.year}</span>
                      )}
                    </div>
                  )}

                  {rec.recommended_by && (
                    <div className="mb-2">
                      <p className="text-xs text-muted mb-1">
                        Recommended by:
                      </p>
                      <p className="text-xs text-emerald-400 font-medium">
                        {rec.recommended_by}
                      </p>
                    </div>
                  )}

                  {rec.notes && (
                    <div className="mb-3">
                      <p className="text-xs text-muted mb-1">Notes:</p>
                      <p className="text-xs text-foreground line-clamp-2">
                        {rec.notes}
                      </p>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="mt-auto pt-3 border-t border-border-custom flex gap-2">
                    <button
                      onClick={() => handleAddToLibrary(rec)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                    >
                      Add to Library
                    </button>

                    <button
                      onClick={() => setDeleteConfirm(rec.id)}
                      className="px-3 py-2 rounded-lg text-xs font-medium bg-surface-2 text-muted hover:bg-border-custom hover:text-foreground transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Delete Confirmation */}
                {deleteConfirm === rec.id && (
                  <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center z-10 flex flex-col gap-2 p-4">
                    <p className="text-sm text-foreground text-center">
                      Remove this recommendation?
                    </p>
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={() => handleDelete(rec.id)}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 bg-border-custom hover:bg-surface-2 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
