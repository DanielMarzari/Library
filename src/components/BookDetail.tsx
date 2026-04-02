"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Book, ReadingUpdate } from "@/types/book";
import { enrichBook, searchBooks } from "@/lib/bookLookup";

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
  const [introPages, setIntroPages] = useState(book.intro_pages?.toString() || "0");
  const [startPage, setStartPage] = useState(book.start_page?.toString() || "1");
  const [endPage, setEndPage] = useState(book.end_page?.toString() || "");
  const [status, setStatus] = useState(book.status);
  const [rating, setRating] = useState(book.rating || 0);
  const [startDate, setStartDate] = useState(book.start_date || "");
  const [completeDate, setCompleteDate] = useState(book.complete_date || "");
  const [source, setSource] = useState(book.source || "");
  const [volume, setVolume] = useState(book.volume || "");
  const [lcc, setLcc] = useState(book.lcc || "");
  const [ddc, setDdc] = useState(book.ddc || "");
  const [editTopics, setEditTopics] = useState<string[]>(book.topics || []);
  const [topicInput, setTopicInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [updates, setUpdates] = useState<ReadingUpdate[]>([]);
  const [showAddUpdate, setShowAddUpdate] = useState(false);
  const [currentPage, setCurrentPage] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");

  useEffect(() => {
    if (book.status === "reading" || status === "reading") loadUpdates();
  }, [book.id, book.status, status]);

  const loadUpdates = async () => {
    const { data } = await supabase.from("reading_updates").select("*").eq("book_id", book.id).order("created_at", { ascending: false });
    if (data) setUpdates(data);
  };

  const computedReadingPages = (() => {
    const ep = parseInt(endPage) || 0;
    const sp = parseInt(startPage) || 1;
    const ip = parseInt(introPages) || 0;
    return ep > 0 ? ep - sp + 1 + ip : null;
  })();

  // Refresh data from Open Library
  const handleRefresh = async () => {
    setRefreshing(true);
    const query = book.isbn || book.title;
    const found = await searchBooks(query, 1);
    if (found.length > 0) {
      const enriched = await enrichBook(found[0]);
      if (enriched.cover_url && !coverUrl) setCoverUrl(enriched.cover_url);
      if (enriched.lcc && !lcc) setLcc(enriched.lcc);
      if (enriched.ddc && !ddc) setDdc(enriched.ddc);
      if (enriched.pages && !pages) setPages(enriched.pages.toString());
      if (enriched.pages && !endPage) setEndPage(enriched.pages.toString());
      if (enriched.topics?.length && editTopics.length === 0) setEditTopics(enriched.topics);
    }
    setRefreshing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("books").update({
      title: title.trim(), author: author.trim(),
      cover_url: coverUrl.trim() || null,
      pages: pages ? parseInt(pages) : null,
      intro_pages: parseInt(introPages) || 0,
      start_page: parseInt(startPage) || 1,
      end_page: endPage ? parseInt(endPage) : null,
      status, rating: rating || null,
      start_date: startDate || null, complete_date: completeDate || null,
      source: source.trim() || null, volume: volume.trim() || null,
      lcc: lcc.trim() || null, ddc: ddc.trim() || null,
      topics: editTopics.length > 0 ? editTopics : null,
      updated_at: new Date().toISOString(),
    }).eq("id", book.id);
    if (!error) { setEditing(false); onUpdated(); }
    setSaving(false);
  };

  const handleStatusChange = async (newStatus: Book["status"]) => {
    setStatus(newStatus);
    if (newStatus === "reading" && !startDate) setStartDate(new Date().toISOString().split("T")[0]);
    if (newStatus === "read" && !completeDate) setCompleteDate(new Date().toISOString().split("T")[0]);
  };

  const handleAddUpdate = async () => {
    const cp = parseInt(currentPage);
    if (!cp || cp < 0) return;
    const lastPage = updates.length > 0 ? updates[0].current_page : (book.current_page || 0);
    const pagesRead = Math.max(cp - lastPage, 0);
    const { error } = await supabase.from("reading_updates").insert({ book_id: book.id, current_page: cp, pages_read: pagesRead, notes: updateNotes.trim() || null });
    if (!error) {
      // Also update current_page on the book
      await supabase.from("books").update({ current_page: cp, updated_at: new Date().toISOString() }).eq("id", book.id);
      setCurrentPage(""); setUpdateNotes(""); setShowAddUpdate(false); loadUpdates();
    }
  };

  const handleDelete = async () => {
    if (!confirm("Remove this book from your library?")) return;
    const { error } = await supabase.from("books").delete().eq("id", book.id);
    if (!error) onDeleted();
  };

  const addTopic = () => {
    const t = topicInput.trim();
    if (t && !editTopics.includes(t)) { setEditTopics([...editTopics, t]); setTopicInput(""); }
  };

  const readingSpeed = (() => {
    if (updates.length < 2) return null;
    const totalPages = updates.reduce((sum, u) => sum + u.pages_read, 0);
    const first = new Date(updates[updates.length - 1].created_at);
    const last = new Date(updates[0].created_at);
    const days = Math.max((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24), 1);
    return Math.round(totalPages / days);
  })();

  const displayPages = book.reading_pages || computedReadingPages || book.pages;
  const inputCls = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600";
  const numCls = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Cover */}
        <div className="relative h-48 bg-gradient-to-b from-zinc-800 to-zinc-900 flex items-center justify-center">
          {(coverUrl || book.cover_url) ? (
            <img src={coverUrl || book.cover_url} alt={book.title} className="h-40 rounded-lg shadow-xl shadow-black/50 object-cover" />
          ) : (
            <div className="h-40 w-28 rounded-lg bg-zinc-700 flex items-center justify-center"><span className="text-zinc-500 text-xs">No Cover</span></div>
          )}
          <div className="absolute top-3 right-3 flex gap-2">
            <button onClick={() => setEditing(!editing)} className="text-zinc-400 hover:text-zinc-200 bg-black/40 rounded-full w-8 h-8 flex items-center justify-center text-sm">✏️</button>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 bg-black/40 rounded-full w-8 h-8 flex items-center justify-center">×</button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {editing ? (
            <>
              {/* Refresh button */}
              <button onClick={handleRefresh} disabled={refreshing}
                className="w-full bg-zinc-800 hover:bg-zinc-700 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {refreshing ? (
                  <><div className="animate-spin rounded-full h-3 w-3 border border-zinc-600 border-t-emerald-500" /> Refreshing...</>
                ) : (
                  <>🔄 Refresh from Open Library</>
                )}
              </button>

              <div>
                <label className="block text-xs text-zinc-500 mb-1">Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Author</label>
                <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Cover Image URL</label>
                <input type="text" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Volume</label>
                  <input type="text" value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="Vol. 1" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Source</label>
                  <input type="text" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Gift, Library..." className={inputCls} />
                </div>
              </div>

              {/* Page details */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Page Details</label>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-zinc-600 mb-0.5">Total</label>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={pages} onChange={(e) => setPages(e.target.value)} placeholder="—" className={numCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-600 mb-0.5">Intro</label>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={introPages} onChange={(e) => setIntroPages(e.target.value)} placeholder="0" className={numCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-600 mb-0.5">Start</label>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={startPage} onChange={(e) => setStartPage(e.target.value)} placeholder="1" className={numCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-600 mb-0.5">End</label>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={endPage} onChange={(e) => setEndPage(e.target.value)} placeholder="—" className={numCls} />
                  </div>
                </div>
                {computedReadingPages && <p className="text-xs text-zinc-500 mt-1">Reading pages: <span className="text-zinc-300 font-medium">{computedReadingPages}</span></p>}
              </div>

              {/* Classification */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">LCC</label>
                  <input type="text" value={lcc} onChange={(e) => setLcc(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">DDC</label>
                  <input type="text" value={ddc} onChange={(e) => setDdc(e.target.value)} className={inputCls} />
                </div>
              </div>

              {/* Topics */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Topics</label>
                {editTopics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {editTopics.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 bg-zinc-800 text-zinc-300 text-xs px-2 py-0.5 rounded-full">
                        {t}<button onClick={() => setEditTopics(editTopics.filter((x) => x !== t))} className="text-zinc-500 hover:text-red-400">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input type="text" value={topicInput} onChange={(e) => setTopicInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTopic(); } }}
                    placeholder="Add topic..." className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600" />
                  <button onClick={addTopic} className="bg-zinc-700 hover:bg-zinc-600 px-3 py-1.5 rounded-lg text-xs font-medium">Add</button>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Complete Date</label>
                  <input type="date" value={completeDate} onChange={(e) => setCompleteDate(e.target.value)} className={inputCls} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-bold text-zinc-100">{book.title}</h2>
                <p className="text-sm text-zinc-400 mt-1">{book.author}</p>
                {book.volume && <p className="text-xs text-zinc-500 mt-0.5">{book.volume}</p>}
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-zinc-600">
                  {book.isbn && <span>ISBN: {book.isbn}</span>}
                  {displayPages && <span>{displayPages} reading pages</span>}
                  {book.pages && displayPages !== book.pages && <span>({book.pages} total)</span>}
                </div>
                {(book.lcc || book.ddc) && (
                  <div className="flex gap-3 mt-1 text-xs text-zinc-600">
                    {book.lcc && <span>LCC: {book.lcc}</span>}
                    {book.ddc && <span>DDC: {book.ddc}</span>}
                  </div>
                )}
                {book.source && <p className="text-xs text-zinc-600 mt-1">Source: {book.source}</p>}
                {(book.start_date || book.complete_date) && (
                  <div className="flex gap-3 mt-1 text-xs text-zinc-600">
                    {book.start_date && <span>Started: {book.start_date}</span>}
                    {book.complete_date && <span>Finished: {book.complete_date}</span>}
                  </div>
                )}
              </div>
              {book.topics && book.topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {book.topics.map((t) => <span key={t} className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full">{t}</span>)}
                </div>
              )}
              {book.description && <p className="text-sm text-zinc-400 leading-relaxed line-clamp-4">{book.description}</p>}
            </>
          )}

          {/* Status */}
          <div>
            <label className="block text-xs text-zinc-500 mb-2">Status</label>
            <div className="flex gap-2">
              {(Object.keys(statusLabels) as Book["status"][]).map((s) => (
                <button key={s} onClick={() => handleStatusChange(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${status === s ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"}`}>
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
                <button key={star} onClick={() => setRating(star === rating ? 0 : star)}
                  className={`text-2xl transition-colors ${star <= rating ? "text-amber-400" : "text-zinc-700 hover:text-zinc-500"}`}>★</button>
              ))}
            </div>
          </div>

          {/* Reading Updates */}
          {status === "reading" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-zinc-500">Reading Progress</label>
                <button onClick={() => setShowAddUpdate(!showAddUpdate)} className="text-xs text-emerald-500 hover:text-emerald-400">+ Log Progress</button>
              </div>
              {(readingSpeed || (book.current_page && book.current_page > 0)) && (
                <div className="bg-zinc-800/50 rounded-lg px-3 py-2 mb-3 text-xs text-zinc-400">
                  {readingSpeed && <>📊 ~{readingSpeed} pages/day </>}
                  {(displayPages || book.pages) && (
                    <span className={readingSpeed ? "ml-2 text-zinc-500" : ""}>
                      ({updates.length > 0 ? updates[0].current_page : book.current_page || 0}/{displayPages || book.pages} pages)
                    </span>
                  )}
                </div>
              )}
              {(displayPages || book.pages) && (updates.length > 0 || (book.current_page && book.current_page > 0)) && (
                <div className="w-full bg-zinc-800 rounded-full h-2 mb-3">
                  <div className="bg-emerald-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(((updates.length > 0 ? updates[0].current_page : book.current_page || 0) / (displayPages || book.pages || 1)) * 100, 100)}%` }} />
                </div>
              )}
              {showAddUpdate && (
                <div className="bg-zinc-800 rounded-lg p-3 mb-3 space-y-2">
                  <input type="text" inputMode="numeric" pattern="[0-9]*" value={currentPage} onChange={(e) => setCurrentPage(e.target.value)} placeholder="Current page #"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600" />
                  <input type="text" value={updateNotes} onChange={(e) => setUpdateNotes(e.target.value)} placeholder="Quick note (optional)"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600" />
                  <button onClick={handleAddUpdate} disabled={!currentPage}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">Log</button>
                </div>
              )}
              {updates.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {updates.slice(0, 5).map((u) => (
                    <div key={u.id} className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className="text-zinc-600">{new Date(u.created_at).toLocaleDateString()}</span>
                      <span>p.{u.current_page}</span>
                      <span className="text-zinc-700">+{u.pages_read}</span>
                      {u.notes && <span className="text-zinc-600 truncate">{u.notes}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={handleDelete}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 bg-red-950/30 hover:bg-red-950/50 transition-colors">Remove</button>
          </div>
        </div>
      </div>
    </div>
  );
}
