"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { Book } from "@/types/book";
import { BookSearchResult, searchBooks } from "@/lib/bookLookup";

interface AddBookModalProps {
  onClose: () => void;
  onAdded: () => void;
}

export function AddBookModal({ onClose, onAdded }: AddBookModalProps) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [pages, setPages] = useState("");
  const [status, setStatus] = useState<Book["status"]>("not_read");
  const [coverUrl, setCoverUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<BookSearchResult[]>([]);

  const lookupBook = async () => {
    const query = isbn.trim() || title.trim();
    if (!query) return;

    setSearching(true);
    setResults([]);
    const found = await searchBooks(query, 5);

    if (found.length === 1) {
      applyResult(found[0]);
    } else if (found.length > 1) {
      setResults(found);
    }
    setSearching(false);
  };

  const applyResult = (r: BookSearchResult) => {
    setTitle(r.title);
    setAuthor(r.author);
    if (r.cover_url) setCoverUrl(r.cover_url);
    if (r.pages) setPages(r.pages.toString());
    if (r.isbn) setIsbn(r.isbn);
    setResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) return;

    setSaving(true);
    try {
      await api.books.create({
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim() || undefined,
        cover_url: coverUrl.trim() || undefined,
        pages: pages ? parseInt(pages) : undefined,
        status,
      });
      onAdded();
    } catch (error) {
      console.error("Error adding book:", error);
      alert("Failed to add book.");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Add a Book</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl">×</button>
        </div>

        {/* Search result picker */}
        {results.length > 1 && (
          <div className="space-y-2 mb-4">
            <p className="text-xs text-zinc-500">Multiple results found. Tap one:</p>
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => applyResult(r)}
                className="w-full flex gap-3 p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-left transition-colors"
              >
                {r.cover_url ? (
                  <img src={r.cover_url} alt={r.title} className="w-10 h-14 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-14 rounded bg-zinc-700 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">{r.title}</p>
                  <p className="text-xs text-zinc-400">{r.author}</p>
                  {r.pages && <p className="text-[10px] text-zinc-600">{r.pages} pages</p>}
                </div>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">ISBN or Title (auto-fills details)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="e.g. 9780143127550 or book title"
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <button
                type="button"
                onClick={lookupBook}
                disabled={searching}
                className="bg-zinc-700 hover:bg-zinc-600 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                {searching ? "..." : "Lookup"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Book title"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600" />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Author *</label>
            <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} required placeholder="Author name"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600" />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Pages</label>
            <input type="number" value={pages} onChange={(e) => setPages(e.target.value)} placeholder="Number of pages"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600" />
          </div>

          {coverUrl && (
            <div className="flex items-center gap-3">
              <img src={coverUrl} alt="Cover preview" className="w-12 h-18 rounded object-cover" />
              <span className="text-xs text-zinc-500">Cover found</span>
            </div>
          )}

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as Book["status"])}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600">
              <option value="not_read">Not Read</option>
              <option value="reading">Reading</option>
              <option value="read">Read</option>
            </select>
          </div>

          <button type="submit" disabled={saving || !title.trim() || !author.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? "Adding..." : "Add to Library"}
          </button>
        </form>
      </div>
    </div>
  );
}
