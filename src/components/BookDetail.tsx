"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Book, ReadingUpdate } from "@/types/book";

interface BookDetailProps {
  book: Book;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

const statusLabels: Record<Book["status"], string> = {
  not_read: "Not Read",
  reading: "Reading",
  read: "Read",
};

export function BookDetail({ book, onClose, onUpdated, onDeleted }: BookDetailProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [coverUrl, setCoverUrl] = useState(book.cover_url || "");
  const [pages, setPages] = useState(book.pages?.toString() || "");
  const [status, setStatus] = useState(book.status);
  const [rating, setRating] = useState(book.rating || 0);
  const [notes, setNotes] = useState(book.notes || "");
  const [startDate, setStartDate] = useState(book.start_date || "");
  const [completeDate, setCompleteDate] = useState(book.complete_date || "");
  const [saving, setSaving] = useState(false);

  // Reading updates
  const [updates, setUpdates] = useState<ReadingUpdate[]>([]);
  const [showAddUpdate, setShowAddUpdate] = useState(false);
  const [currentPage, setCurrentPage] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");

  useEffect(() => {
    if (book.status === "reading") {
      loadUpdates();
    }
  }, [book.id, book.status]);

  const loadUpdates = async () => {
    const { data } = await supabase
      .from("reading_updates")
      .select("*")
      .eq("book_id", book.id)
      .order("created_at", { ascending: false });
    if (data) setUpdates(data);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("books")
      .update({
        title: title.trim(),
        author: author.trim(),
        cover_url: coverUrl.trim() || null,
        pages: pages ? parseInt(pages) : null,
        status,
        rating: rating || null,
        notes: notes.trim() || null,
        start_date: startDate || null,
        complete_date: completeDate || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", book.id);

    if (!error) {
      setEditing(false);
      onUpdated();
    }
    setSaving(false);
  };

  const handleStatusChange = async (newStatus: Book["status"]) => {
    setStatus(newStatus);
    // Auto-set dates
    if (newStatus === "reading" && !startDate) {
      setStartDate(new Date().toISOString().split("T")[0]);
    }
    if (newStatus === "read" && !completeDate) {
      setCompleteDate(new Date().toISOString().split("T")[0]);
    }
  };

  const handleAddUpdate = async () => {
    const cp = parseInt(currentPage);
    if (!cp || cp < 0) return;

    // Calculate pages read since last update
    const lastPage = updates.length > 0 ? updates[0].current_page : 0;
    const pagesRead = Math.max(cp - lastPage, 0);

    const { error } = await supabase.from("reading_updates").insert({
      book_id: book.id,
      current_page: cp,
      pages_read: pagesRead,
      notes: updateNotes.trim() || null,
    });

    if (!error) {
      setCurrentPage("");
      setUpdateNotes("");
      setShowAddUpdate(false);
      loadUpdates();
    }
  };

  const handleDelete = async () => {
    if (!confirm("Remove this book from your library?")) return;
    const { error } = await supabase.from("books").delete().eq("id", book.id);
    if (!error) onDeleted();
  };

  // Compute reading speed from updates
  const readingSpeed = (() => {
    if (updates.length < 2) return null;
    const totalPages = updates.reduce((sum, u) => sum + u.pages_read, 0);
    const firstUpdate = new Date(updates[updates.length - 1].created_at);
    const lastUpdate = new Date(updates[0].created_at);
    const days = Math.max((lastUpdate.getTime() - firstUpdate.getTime()) / (1000 * 60 * 60 * 24), 1);
    return Math.round(totalPages / days);
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Cover banner */}
        <div className="relative h-48 bg-gradient-to-b from-zinc-800 to-zinc-900 flex items-center justify-center">
          {book.cover_url ? (
            <img src={book.cover_url} alt={book.title} className="h-40 rounded-lg shadow-xl shadow-black/50 object-cover" />
          ) : (
            <div className="h-40 w-28 rounded-lg bg-zinc-700 flex items-center justify-center">
              <span className="text-zinc-500 text-xs">No Cover</span>
            </div>
          )}
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={() => setEditing(!editing)}
              className="text-zinc-400 hover:text-zinc-200 bg-black/40 rounded-full w-8 h-8 flex items-center justify-center text-sm"
            >
              ✏️
            </button>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-200 bg-black/40 rounded-full w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {editing ? (
            /* Edit mode */
            <>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Author</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Cover Image URL</label>
                <input
                  type="text"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Pages</label>
                  <input
                    type="number"
                    value={pages}
                    onChange={(e) => setPages(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">ISBN</label>
                  <p className="text-sm text-zinc-400 py-2">{book.isbn || "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Complete Date</label>
                  <input
                    type="date"
                    value={completeDate}
                    onChange={(e) => setCompleteDate(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>
            </>
          ) : (
            /* View mode */
            <>
              <div>
                <h2 className="text-xl font-bold text-zinc-100">{book.title}</h2>
                <p className="text-sm text-zinc-400 mt-1">{book.author}</p>
                <div className="flex gap-3 mt-1 text-xs text-zinc-600">
                  {book.isbn && <span>ISBN: {book.isbn}</span>}
                  {book.pages && <span>{book.pages} pages</span>}
                </div>
                {(book.start_date || book.complete_date) && (
                  <div className="flex gap-3 mt-1 text-xs text-zinc-600">
                    {book.start_date && <span>Started: {book.start_date}</span>}
                    {book.complete_date && <span>Finished: {book.complete_date}</span>}
                  </div>
                )}
              </div>

              {book.description && (
                <p className="text-sm text-zinc-400 leading-relaxed line-clamp-4">
                  {book.description}
                </p>
              )}
            </>
          )}

          {/* Status */}
          <div>
            <label className="block text-xs text-zinc-500 mb-2">Status</label>
            <div className="flex gap-2">
              {(Object.keys(statusLabels) as Book["status"][]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
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

          {/* Reading Updates (only for "reading" books) */}
          {status === "reading" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-zinc-500">Reading Progress</label>
                <button
                  onClick={() => setShowAddUpdate(!showAddUpdate)}
                  className="text-xs text-emerald-500 hover:text-emerald-400"
                >
                  + Log Progress
                </button>
              </div>

              {readingSpeed && (
                <div className="bg-zinc-800/50 rounded-lg px-3 py-2 mb-3 text-xs text-zinc-400">
                  📊 Reading speed: ~{readingSpeed} pages/day
                  {book.pages && updates.length > 0 && (
                    <span className="ml-2 text-zinc-500">
                      ({updates[0].current_page}/{book.pages} pages)
                    </span>
                  )}
                </div>
              )}

              {/* Progress bar */}
              {book.pages && updates.length > 0 && (
                <div className="w-full bg-zinc-800 rounded-full h-2 mb-3">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min((updates[0].current_page / book.pages) * 100, 100)}%`,
                    }}
                  />
                </div>
              )}

              {showAddUpdate && (
                <div className="bg-zinc-800 rounded-lg p-3 mb-3 space-y-2">
                  <input
                    type="number"
                    value={currentPage}
                    onChange={(e) => setCurrentPage(e.target.value)}
                    placeholder="Current page #"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <input
                    type="text"
                    value={updateNotes}
                    onChange={(e) => setUpdateNotes(e.target.value)}
                    placeholder="Quick note (optional)"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <button
                    onClick={handleAddUpdate}
                    disabled={!currentPage}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    Log
                  </button>
                </div>
              )}

              {updates.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {updates.slice(0, 5).map((u) => (
                    <div key={u.id} className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className="text-zinc-600">
                        {new Date(u.created_at).toLocaleDateString()}
                      </span>
                      <span>p.{u.current_page}</span>
                      <span className="text-zinc-700">+{u.pages_read} pages</span>
                      {u.notes && <span className="text-zinc-600 truncate">{u.notes}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
