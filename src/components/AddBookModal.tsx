"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Book } from "@/types/book";

interface AddBookModalProps {
  onClose: () => void;
  onAdded: () => void;
}

export function AddBookModal({ onClose, onAdded }: AddBookModalProps) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [status, setStatus] = useState<Book["status"]>("want_to_read");
  const [coverUrl, setCoverUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  // Look up book info from Open Library API
  const lookupBook = async () => {
    const query = isbn.trim() || title.trim();
    if (!query) return;

    setSearching(true);
    try {
      const searchParam = isbn.trim()
        ? `isbn:${isbn.trim()}`
        : title.trim();
      const res = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(searchParam)}&limit=1`
      );
      const data = await res.json();

      if (data.docs && data.docs.length > 0) {
        const book = data.docs[0];
        if (!title) setTitle(book.title || "");
        if (!author) setAuthor(book.author_name?.[0] || "");
        if (book.cover_i) {
          setCoverUrl(`https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`);
        }
      }
    } catch (err) {
      console.error("Lookup failed:", err);
    }
    setSearching(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) return;

    setSaving(true);
    const { error } = await supabase.from("books").insert({
      title: title.trim(),
      author: author.trim(),
      isbn: isbn.trim() || null,
      cover_url: coverUrl.trim() || null,
      status,
    });

    if (error) {
      console.error("Error adding book:", error);
      alert("Failed to add book. Check your Supabase setup.");
    } else {
      onAdded();
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Add a Book</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ISBN Lookup */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              ISBN (optional — auto-fills details)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="e.g. 9780143127550"
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

          {/* Title */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Book title"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Author */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              Author *
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              required
              placeholder="Author name"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Cover URL */}
          {coverUrl && (
            <div className="flex items-center gap-3">
              <img
                src={coverUrl}
                alt="Cover preview"
                className="w-12 h-18 rounded object-cover"
              />
              <span className="text-xs text-zinc-500">Cover found</span>
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Book["status"])}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="want_to_read">Want to Read</option>
              <option value="reading">Reading</option>
              <option value="read">Read</option>
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !title.trim() || !author.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Adding..." : "Add to Library"}
          </button>
        </form>
      </div>
    </div>
  );
}
