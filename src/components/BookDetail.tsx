"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Book } from "@/types/book";

interface BookDetailProps {
  book: Book;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

const statusLabels: Record<Book["status"], string> = {
  want_to_read: "Want to Read",
  reading: "Reading",
  read: "Read",
};

export function BookDetail({ book, onClose, onUpdated, onDeleted }: BookDetailProps) {
  const [status, setStatus] = useState(book.status);
  const [rating, setRating] = useState(book.rating || 0);
  const [notes, setNotes] = useState(book.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("books")
      .update({
        status,
        rating: rating || null,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", book.id);

    if (!error) onUpdated();
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Remove this book from your library?")) return;
    const { error } = await supabase.from("books").delete().eq("id", book.id);
    if (!error) onDeleted();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Cover banner */}
        <div className="relative h-48 bg-gradient-to-b from-zinc-800 to-zinc-900 flex items-center justify-center">
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={book.title}
              className="h-40 rounded-lg shadow-xl shadow-black/50 object-cover"
            />
          ) : (
            <div className="h-40 w-28 rounded-lg bg-zinc-700 flex items-center justify-center">
              <span className="text-zinc-500 text-xs">No Cover</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-200 bg-black/40 rounded-full w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Title & Author */}
          <div>
            <h2 className="text-xl font-bold text-zinc-100">{book.title}</h2>
            <p className="text-sm text-zinc-400 mt-1">{book.author}</p>
            {book.isbn && (
              <p className="text-xs text-zinc-600 mt-1">ISBN: {book.isbn}</p>
            )}
          </div>

          {/* Description */}
          {book.description && (
            <p className="text-sm text-zinc-400 leading-relaxed line-clamp-4">
              {book.description}
            </p>
          )}

          {/* Status */}
          <div>
            <label className="block text-xs text-zinc-500 mb-2">Status</label>
            <div className="flex gap-2">
              {(Object.keys(statusLabels) as Book["status"][]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    status === s
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {statusLabels[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-xs text-zinc-500 mb-2">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star === rating ? 0 : star)}
                  className={`text-2xl transition-colors ${
                    star <= rating ? "text-amber-400" : "text-zinc-700 hover:text-zinc-500"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-zinc-500 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Your thoughts on this book..."
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 bg-red-950/30 hover:bg-red-950/50 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
