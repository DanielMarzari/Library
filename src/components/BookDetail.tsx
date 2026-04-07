"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { api } from "@/lib/api-client";
import { Book, ReadingUpdate } from "@/types/book";
import { enrichBook, searchBooks } from "@/lib/bookLookup";

interface BookDetailProps {
  book: Book;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
  recentSources?: string[];
  avgPagesPerDay?: number | null;
}

const statusLabels: Record<Book["status"], string> = {
  not_read: "Not Read",
  reading: "Reading",
  read: "Read",
};

const CONFETTI_COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#a855f7", "#ec4899", "#06b6d4"];

function ConfettiOverlay() {
  const pieces = useRef(
    Array.from({ length: 60 }).map((_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 2 + Math.random() * 2,
      size: 6 + Math.random() * 8,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      rotation: Math.random() * 360,
      drift: ((Math.random() - 0.5) * 120).toFixed(0),
    }))
  ).current;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
      <style>{pieces.map((p, i) =>
        `@keyframes cf-${i}{0%{opacity:1;transform:translateY(0) translateX(0) rotate(0deg)}100%{opacity:0;transform:translateY(100vh) translateX(${p.drift}px) rotate(720deg)}}`
      ).join("")}</style>
      {pieces.map((p, i) => (
        <div key={i} style={{
          position: "absolute", left: `${p.left}%`, top: "-10px",
          width: `${p.size}px`, height: `${p.size * 0.6}px`,
          backgroundColor: p.color, borderRadius: "2px",
          transform: `rotate(${p.rotation}deg)`,
          animation: `cf-${i} ${p.duration}s ease-in ${p.delay}s forwards`,
          opacity: 0,
        }} />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-6xl animate-bounce">🎉</div>
      </div>
    </div>
  );
}

export function BookDetail({ book, onClose, onUpdated, onDeleted, recentSources = [], avgPagesPerDay }: BookDetailProps) {
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
  const [autoTopics, setAutoTopics] = useState<string[]>(book.auto_topics || []);
  const [favorite, setFavorite] = useState(book.favorite || false);
  const [showSourceSuggestions, setShowSourceSuggestions] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [refreshing, setRefreshing] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [updates, setUpdates] = useState<ReadingUpdate[]>([]);
  const [showAddUpdate, setShowAddUpdate] = useState(false);
  const [currentPage, setCurrentPage] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");

  const [showCoverSearch, setShowCoverSearch] = useState(false);
  const [coverOptions, setCoverOptions] = useState<string[]>([]);
  const [coverSearchLoading, setCoverSearchLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    loadUpdates();
  }, [book.id]);

  const loadUpdates = async () => {
    try {
      const data = await api.readingUpdates.list(book.id);
      setUpdates(data);
    } catch (error) {
      console.error("Error loading updates:", error);
    }
  };

  const computedReadingPages = (() => {
    const ep = parseInt(endPage) || 0;
    const sp = parseInt(startPage) || 1;
    const ip = parseInt(introPages) || 0;
    return ep > 0 ? ep - sp + 1 + ip : null;
  })();

  // Auto-update total pages when intro/start/end change
  const recalcPages = (ip: string, sp: string, ep: string) => {
    const epNum = parseInt(ep) || 0;
    const spNum = parseInt(sp) || 1;
    const ipNum = parseInt(ip) || 0;
    if (epNum > 0) {
      setPages((epNum - spNum + 1 + ipNum).toString());
    }
  };

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
      if (enriched.topics?.length && autoTopics.length === 0) setAutoTopics(enriched.topics);
      scheduleAutoSave();
    }
    setRefreshing(false);
  };

  // Duplicate this book
  const handleDuplicate = async () => {
    try {
      const duplicate = {
        title: `${book.title} (copy)`,
        author: book.author,
        isbn: book.isbn || undefined,
        cover_url: book.cover_url || undefined,
        description: book.description || undefined,
        status: "not_read" as const,
        rating: undefined,
        volume: book.volume || undefined,
        pages: book.pages || undefined,
        intro_pages: book.intro_pages || undefined,
        start_page: book.start_page || undefined,
        end_page: book.end_page || undefined,
        start_date: undefined,
        complete_date: undefined,
        source: book.source || undefined,
        lcc: book.lcc || undefined,
        ddc: book.ddc || undefined,
        topics: book.topics || undefined,
        auto_topics: book.auto_topics || undefined,
        favorite: false,
      };
      await api.books.create(duplicate);
      onUpdated();
      onClose();
    } catch (err) {
      console.error("Duplicate error:", err);
    }
  };

  // Ref always holds the latest field values so doSave can read them without re-creating
  const valuesRef = useRef({ title, author, coverUrl, pages, introPages, startPage, endPage, status, rating, startDate, completeDate, source, volume, lcc, ddc, editTopics, autoTopics, favorite });
  valuesRef.current = { title, author, coverUrl, pages, introPages, startPage, endPage, status, rating, startDate, completeDate, source, volume, lcc, ddc, editTopics, autoTopics, favorite };

  // Stable doSave — reads from ref, only depends on book.id
  const doSave = useCallback(async () => {
    const v = valuesRef.current;
    setSaveStatus("saving");
    try {
      await api.books.update(book.id, {
        title: v.title.trim(), author: v.author.trim(),
        cover_url: v.coverUrl.trim() || undefined,
        pages: v.pages ? parseInt(v.pages) : undefined,
        intro_pages: parseInt(v.introPages) || 0,
        start_page: parseInt(v.startPage) || 1,
        end_page: v.endPage ? parseInt(v.endPage) : undefined,
        status: v.status, rating: v.rating || undefined,
        start_date: v.startDate || undefined, complete_date: v.completeDate || undefined,
        source: v.source.trim() || undefined, volume: v.volume.trim() || undefined,
        lcc: v.lcc.trim() || undefined, ddc: v.ddc.trim() || undefined,
        topics: v.editTopics.length > 0 ? v.editTopics : undefined,
        auto_topics: v.autoTopics.length > 0 ? v.autoTopics : undefined,
        favorite: v.favorite,
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1500);
    } catch (error) {
      console.error("Save error:", error);
      setSaveStatus("idle");
    }
  }, [book.id]);

  // Stable scheduleAutoSave — call from onChange handlers
  const scheduleAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(doSave, 1200);
  }, [doSave]);

  const handleStatusChange = (newStatus: Book["status"]) => {
    setStatus(newStatus);
    if (newStatus === "reading" && !startDate) setStartDate(new Date().toISOString().split("T")[0]);
    if (newStatus === "read" && !completeDate) setCompleteDate(new Date().toISOString().split("T")[0]);
    scheduleAutoSave();
  };

  const handleAddUpdate = async () => {
    const cp = parseInt(currentPage);
    if (!cp || cp < 0) return;
    const lastPage = updates.length > 0 ? updates[0].current_page : (book.current_page || 0);
    const pagesRead = Math.max(cp - lastPage, 0);
    try {
      await api.readingUpdates.create({ book_id: book.id, current_page: cp, pages_read: pagesRead, notes: updateNotes.trim() || undefined });
      const bookUpdate: any = { current_page: cp };

      // Auto-set start date on first log if not already reading
      const isFirstLog = updates.length === 0 && (!book.current_page || book.current_page === 0);
      if (isFirstLog && status !== "reading") {
        const today = new Date().toISOString().split("T")[0];
        bookUpdate.status = "reading";
        bookUpdate.start_date = today;
        setStatus("reading");
        setStartDate(today);
      } else if (isFirstLog && !startDate) {
        const today = new Date().toISOString().split("T")[0];
        bookUpdate.start_date = today;
        setStartDate(today);
      }

      // Auto-complete on last page
      const totalPgs = displayPages || book.pages || 0;
      if (totalPgs > 0 && cp >= totalPgs) {
        const today = new Date().toISOString().split("T")[0];
        bookUpdate.status = "read";
        bookUpdate.complete_date = today;
        setStatus("read");
        setCompleteDate(today);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }

      await api.books.update(book.id, bookUpdate);
      setCurrentPage(""); setUpdateNotes(""); setShowAddUpdate(false); loadUpdates();
    } catch (error) {
      console.error("Error adding update:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Remove this book from your library?")) return;
    try {
      await api.books.delete(book.id);
      onDeleted();
    } catch (error) {
      console.error("Error deleting book:", error);
    }
  };

  const searchCovers = async () => {
    setCoverSearchLoading(true);
    const options: string[] = [];

    try {
      // 1. Try ISBN first if available (with ?default=false to get 404 instead of placeholder)
      if (book.isbn) {
        const isbnUrl = `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg?default=false`;
        options.push(isbnUrl);
      }

      // 2. Open Library search by title
      const olSearchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(title || book.title)}&limit=6`;
      const olRes = await fetch(olSearchUrl);
      if (olRes.ok) {
        const olData = await olRes.json();
        if (olData.docs) {
          for (const doc of olData.docs) {
            if (doc.cover_i && options.length < 12) {
              options.push(`https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg?default=false`);
            }
          }
        }
      }

      // 3. Google Books search
      const gbQuery = `${encodeURIComponent(title || book.title)}+${encodeURIComponent(author || book.author)}`;
      const gbUrl = `https://www.googleapis.com/books/v1/volumes?q=${gbQuery}&maxResults=6`;
      const gbRes = await fetch(gbUrl);
      if (gbRes.ok) {
        const gbData = await gbRes.json();
        if (gbData.items) {
          for (const item of gbData.items) {
            if (item.volumeInfo?.imageLinks?.thumbnail && options.length < 12) {
              let imgUrl = item.volumeInfo.imageLinks.thumbnail;
              imgUrl = imgUrl.replace(/zoom=1/, "zoom=3");
              if (!options.includes(imgUrl)) {
                options.push(imgUrl);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error searching for covers:", error);
    }

    // Deduplicate
    const allCandidates = Array.from(new Set(options));

    // Validate Open Library URLs with HEAD requests; Google Books URLs pass through
    const validated: string[] = [];
    await Promise.all(
      allCandidates.map(async (url) => {
        if (url.includes("covers.openlibrary.org")) {
          try {
            const res = await fetch(url, { method: "HEAD" });
            if (res.ok) validated.push(url);
          } catch {
            // skip
          }
        } else {
          validated.push(url);
        }
      })
    );

    setCoverOptions(validated.slice(0, 10));
    setCoverSearchLoading(false);
  };

  const handleCoverSelect = (url: string) => {
    setCoverUrl(url);
    scheduleAutoSave();
    setShowCoverSearch(false);
  };

  const addTopic = () => {
    const t = topicInput.trim();
    if (t && !editTopics.includes(t)) { setEditTopics([...editTopics, t]); setTopicInput(""); scheduleAutoSave(); }
  };

  const readingSpeed = (() => {
    if (updates.length < 2) return null;
    const totalPages = updates.reduce((sum, u) => sum + u.pages_read, 0);
    const first = new Date(updates[updates.length - 1].created_at);
    const last = new Date(updates[0].created_at);
    const days = Math.max((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24), 1);
    return Math.round(totalPages / days);
  })();

  // Aggregate updates by day: sum pages_read, take max current_page, join notes
  const dailyUpdates = useMemo(() => {
    const byDay: Record<string, { date: string; current_page: number; pages_read: number; notes: string[] }> = {};
    // updates are ordered newest-first
    updates.forEach((u) => {
      const dateKey = new Date(u.created_at).toLocaleDateString();
      if (!byDay[dateKey]) {
        byDay[dateKey] = { date: dateKey, current_page: u.current_page, pages_read: 0, notes: [] };
      }
      byDay[dateKey].pages_read += u.pages_read;
      // Keep the highest current_page for that day
      if (u.current_page > byDay[dateKey].current_page) byDay[dateKey].current_page = u.current_page;
      if (u.notes) byDay[dateKey].notes.push(u.notes);
    });
    // Return in newest-first order (same as updates)
    const days = Object.values(byDay);
    days.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return db - da;
    });
    return days;
  }, [updates]);

  const estimatedDays = (() => {
    const pace = readingSpeed || avgPagesPerDay;
    if (!pace || pace <= 0) return null;
    const totalPgs = book.reading_pages || computedReadingPages || book.pages;
    if (!totalPgs) return null;
    const currentPg = updates.length > 0 ? updates[0].current_page : (book.current_page || 0);
    const remaining = totalPgs - currentPg;
    if (remaining <= 0) return null;
    return Math.ceil(remaining / pace);
  })();

  const displayPages = book.reading_pages || computedReadingPages || book.pages;
  const inputCls = "w-full bg-surface-2 border border-border-custom rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600";
  const numCls = "w-full bg-surface-2 border border-border-custom rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (saveTimeoutRef.current) { clearTimeout(saveTimeoutRef.current); doSave(); } onUpdated(); }} />

      {/* Confetti */}
      {showConfetti && <ConfettiOverlay />}

      <div className="relative bg-surface border border-border-custom rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Cover */}
        <div className="relative h-48 bg-gradient-to-b from-surface-2 to-surface flex items-center justify-center">
          <button onClick={() => { setShowCoverSearch(true); searchCovers(); }} className="focus:outline-none hover:opacity-75 transition-opacity" title="Search for cover image">
            {(coverUrl || book.cover_url) ? (
              <img src={coverUrl || book.cover_url} alt={book.title} className="h-40 rounded-lg shadow-xl shadow-black/50 object-cover cursor-pointer" />
            ) : (
              <div className="h-40 w-28 rounded-lg bg-border-custom flex items-center justify-center cursor-pointer hover:bg-surface-2"><span className="text-muted text-xs">No Cover</span></div>
            )}
          </button>
          <div className="absolute top-3 right-3 grid grid-cols-2 gap-1.5">
            <button onClick={() => { setFavorite(!favorite); scheduleAutoSave(); }} className={`bg-black/40 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center text-sm ${favorite ? "text-red-500" : "text-muted hover:text-foreground"}`} title={favorite ? "Remove from favorites" : "Add to favorites"}>
              {favorite ? "❤" : "♡"}
            </button>
            <button onClick={() => setEditing(!editing)} className="text-muted hover:text-foreground bg-black/40 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center" title="Edit">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3a2.85 2.83 0 1 0-4 4L16.5 20.5 22 22l-1.5-5.5Z"/><path d="m9 5-4 4"/></svg>
            </button>
            <a href={`https://annas-archive.gl/search?q=${encodeURIComponent(book.title)}`} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-foreground bg-black/40 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center" title="Find PDF">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            </a>
            <button onClick={handleRefresh} disabled={refreshing} className="text-muted hover:text-foreground bg-black/40 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center disabled:opacity-50" title="Refresh from Open Library">
              {refreshing ? (
                <div className="animate-spin rounded-full h-3.5 w-3.5 border border-border-custom border-t-emerald-500" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
              )}
            </button>
            <button onClick={handleDuplicate} className="text-muted hover:text-foreground bg-black/40 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center" title="Duplicate book">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V4a2 2 0 0 1 2-2h12"/></svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {editing ? (
            <>
              <div>
                <label className="block text-xs text-muted mb-1">Title</label>
                <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); scheduleAutoSave(); }} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Author</label>
                <input type="text" value={author} onChange={(e) => { setAuthor(e.target.value); scheduleAutoSave(); }} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Cover Image URL</label>
                <input type="text" value={coverUrl} onChange={(e) => { setCoverUrl(e.target.value); scheduleAutoSave(); }} placeholder="https://..." className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">Volume</label>
                  <input type="text" value={volume} onChange={(e) => { setVolume(e.target.value); scheduleAutoSave(); }} placeholder="Vol. 1" className={inputCls} />
                </div>
                <div className="relative">
                  <label className="block text-xs text-muted mb-1">Source</label>
                  <input type="text" value={source}
                    onChange={(e) => { setSource(e.target.value); setShowSourceSuggestions(true); scheduleAutoSave(); }}
                    onFocus={() => setShowSourceSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSourceSuggestions(false), 200)}
                    placeholder="Gift, Library..." className={inputCls} />
                  {showSourceSuggestions && recentSources.filter((s) => s.toLowerCase().includes(source.toLowerCase()) && s !== source).length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-surface-2 border border-border-custom rounded-lg overflow-hidden shadow-lg">
                      {recentSources.filter((s) => s.toLowerCase().includes(source.toLowerCase()) && s !== source).slice(0, 5).map((s) => (
                        <button key={s} onMouseDown={() => { setSource(s); setShowSourceSuggestions(false); scheduleAutoSave(); }}
                          className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-border-custom transition-colors">
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Page details */}
              <div>
                <label className="block text-xs text-muted mb-1">Page Details</label>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-muted-2 mb-0.5">Total</label>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={pages} onChange={(e) => { setPages(e.target.value); scheduleAutoSave(); }} onFocus={(e) => e.target.select()} placeholder="—" className={numCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-2 mb-0.5">Intro</label>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={introPages} onChange={(e) => { setIntroPages(e.target.value); recalcPages(e.target.value, startPage, endPage); scheduleAutoSave(); }} onFocus={(e) => e.target.select()} placeholder="0" className={numCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-2 mb-0.5">Start</label>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={startPage} onChange={(e) => { setStartPage(e.target.value); recalcPages(introPages, e.target.value, endPage); scheduleAutoSave(); }} onFocus={(e) => e.target.select()} placeholder="1" className={numCls} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-2 mb-0.5">End</label>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={endPage} onChange={(e) => { setEndPage(e.target.value); recalcPages(introPages, startPage, e.target.value); scheduleAutoSave(); }} onFocus={(e) => e.target.select()} placeholder="—" className={numCls} />
                  </div>
                </div>
                {computedReadingPages && <p className="text-xs text-muted mt-1">Reading pages: <span className="text-foreground font-medium">{computedReadingPages}</span></p>}
              </div>

              {/* Classification */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">LCC</label>
                  <input type="text" value={lcc} onChange={(e) => { setLcc(e.target.value); scheduleAutoSave(); }} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">DDC</label>
                  <input type="text" value={ddc} onChange={(e) => { setDdc(e.target.value); scheduleAutoSave(); }} className={inputCls} />
                </div>
              </div>

              {/* Topics */}
              <div>
                <label className="block text-xs text-muted mb-1">Topics</label>
                {editTopics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {editTopics.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 bg-surface-2 text-foreground text-xs px-2 py-0.5 rounded-full">
                        {t}<button onClick={() => { setEditTopics(editTopics.filter((x) => x !== t)); scheduleAutoSave(); }} className="text-muted hover:text-red-400">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input type="text" value={topicInput} onChange={(e) => setTopicInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTopic(); } }}
                    placeholder="Add topic..." className="flex-1 bg-surface-2 border border-border-custom rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600" />
                  <button onClick={addTopic} className="bg-border-custom hover:bg-muted-2 px-3 py-1.5 rounded-lg text-xs font-medium">Add</button>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); scheduleAutoSave(); }} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Complete Date</label>
                  <input type="date" value={completeDate} onChange={(e) => { setCompleteDate(e.target.value); scheduleAutoSave(); }} className={inputCls} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-bold text-foreground">{book.title}</h2>
                <p className="text-sm text-muted mt-1">{book.author}</p>
                {book.volume && <p className="text-xs text-muted mt-0.5">{book.volume}</p>}
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-2">
                  {book.isbn && <span>ISBN: {book.isbn}</span>}
                  {displayPages && <span>{displayPages} reading pages</span>}
                  {book.pages && displayPages !== book.pages && <span>({book.pages} total)</span>}
                </div>
                {(book.lcc || book.ddc) && (
                  <div className="flex gap-3 mt-1 text-xs text-muted-2">
                    {book.lcc && <span>LCC: {book.lcc}</span>}
                    {book.ddc && <span>DDC: {book.ddc}</span>}
                  </div>
                )}
                {book.source && <p className="text-xs text-muted-2 mt-1">Source: {book.source}</p>}
                {(book.start_date || book.complete_date) && (
                  <div className="flex gap-3 mt-1 text-xs text-muted-2">
                    {book.start_date && <span>Started: {book.start_date}</span>}
                    {book.complete_date && <span>Finished: {book.complete_date}</span>}
                  </div>
                )}
              </div>
              {book.topics && book.topics.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-2 mb-1">Topics</p>
                  <div className="flex flex-wrap gap-1.5">
                    {book.topics.map((t) => <span key={t} className="bg-surface-2 text-muted text-xs px-2 py-0.5 rounded-full">{t}</span>)}
                  </div>
                </div>
              )}
              {book.auto_topics && book.auto_topics.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-2 mb-1">Subjects (Open Library)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {book.auto_topics.map((t) => <span key={t} className="bg-surface-2/50 text-muted text-xs px-2 py-0.5 rounded-full">{t}</span>)}
                  </div>
                </div>
              )}
              {book.description && <p className="text-sm text-muted leading-relaxed line-clamp-4">{book.description}</p>}
            </>
          )}

          {/* Status */}
          <div>
            <label className="block text-xs text-muted mb-2">Status</label>
            <div className="flex gap-2">
              {(Object.keys(statusLabels) as Book["status"][]).map((s) => (
                <button key={s} onClick={() => handleStatusChange(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${status === s ? "bg-emerald-600 text-white" : "bg-surface-2 text-muted hover:text-foreground"}`}>
                  {statusLabels[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-xs text-muted mb-2">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => { setRating(star === rating ? 0 : star); scheduleAutoSave(); }}
                  className={`text-2xl transition-colors ${star <= rating ? "text-amber-400" : "text-muted-2 hover:text-muted"}`}>★</button>
              ))}
            </div>
          </div>

          {/* Reading Progress — always visible if book has pages */}
          {status !== "read" && (displayPages || book.pages) ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-muted">Reading Progress</label>
                <button onClick={() => setShowAddUpdate(!showAddUpdate)} className="text-xs text-emerald-500 hover:text-emerald-400 font-medium">
                  {showAddUpdate ? "Cancel" : "+ Log Page"}
                </button>
              </div>

              {/* Progress bar */}
              {(() => {
                const currentPg = updates.length > 0 ? updates[0].current_page : (book.current_page || 0);
                const totalPgs = displayPages || book.pages || 1;
                const pct = Math.min((currentPg / totalPgs) * 100, 100);
                return (
                  <div className="mb-3">
                    <div className="w-full bg-surface-2 rounded-full h-3 overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full transition-all relative" style={{ width: `${pct}%` }}>
                        {pct > 8 && <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">{Math.round(pct)}%</span>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-muted">p. {currentPg} of {totalPgs}</span>
                      <div className="flex items-center gap-3 text-xs text-muted">
                        {readingSpeed && <span>~{readingSpeed} pg/day</span>}
                        {estimatedDays && <span className="text-emerald-500">Est. {estimatedDays} {estimatedDays === 1 ? "day" : "days"}</span>}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Log form */}
              {showAddUpdate && (
                <div className="bg-surface-2 rounded-lg p-3 mb-3 space-y-2">
                  <input type="text" inputMode="numeric" pattern="[0-9]*" value={currentPage} onChange={(e) => setCurrentPage(e.target.value)}
                    placeholder={`Current page # (of ${displayPages || book.pages || "?"})`}
                    className="w-full bg-surface border border-border-custom rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    autoFocus />
                  <input type="text" value={updateNotes} onChange={(e) => setUpdateNotes(e.target.value)} placeholder="Quick note (optional)"
                    className="w-full bg-surface border border-border-custom rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600" />
                  <button onClick={handleAddUpdate} disabled={!currentPage}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">Log</button>
                </div>
              )}

              {/* Update history — aggregated by day */}
              {dailyUpdates.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {dailyUpdates.slice(0, 7).map((d) => (
                    <div key={d.date} className="flex items-center gap-2 text-xs text-muted">
                      <span className="text-muted-2">{d.date}</span>
                      <span>p.{d.current_page}</span>
                      <span className="text-emerald-600">+{d.pages_read}</span>
                      {d.notes.length > 0 && <span className="text-muted-2 truncate">{d.notes.join("; ")}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : status === "read" && dailyUpdates.length > 0 ? (
            <div>
              <label className="block text-xs text-muted mb-2">Reading Log</label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {dailyUpdates.slice(0, 7).map((d) => (
                  <div key={d.date} className="flex items-center gap-2 text-xs text-muted">
                    <span className="text-muted-2">{d.date}</span>
                    <span>p.{d.current_page}</span>
                    <span className="text-emerald-600">+{d.pages_read}</span>
                    {d.notes.length > 0 && <span className="text-muted-2 truncate">{d.notes.join("; ")}</span>}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted">
              {saveStatus === "saving" && <span className="text-amber-400">Saving...</span>}
              {saveStatus === "saved" && <span className="text-emerald-400">Saved</span>}
            </div>
            <button onClick={handleDelete}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 bg-red-950/30 hover:bg-red-950/50 transition-colors">Remove</button>
          </div>
        </div>

        {/* Cover Search Overlay */}
        {showCoverSearch && (
          <div className="fixed inset-0 z-60 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowCoverSearch(false)} />
            <div className="relative bg-surface border border-border-custom rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border-custom">
                <h3 className="text-lg font-semibold text-foreground">Search Cover Images</h3>
                <button onClick={() => setShowCoverSearch(false)} className="text-muted hover:text-foreground text-xl">×</button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1 p-4">
                {coverSearchLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border border-border-custom border-t-emerald-500" />
                      <p className="text-sm text-muted">Searching for covers...</p>
                    </div>
                  </div>
                ) : coverOptions.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {coverOptions.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleCoverSelect(url)}
                        className="group relative overflow-hidden rounded-lg border border-border-custom hover:border-emerald-600 transition-all hover:shadow-lg hover:shadow-emerald-600/20"
                      >
                        <img src={url} alt={`Cover option ${idx + 1}`} className="w-full h-32 object-cover" onError={(e) => { e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='150'%3E%3Crect fill='%23404040' width='100' height='150'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='12' fill='%23888'%3EImage Error%3C/text%3E%3C/svg%3E"; }} />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <span className="text-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-sm text-muted">No covers found. Try searching again or enter a URL manually.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-border-custom p-4 flex gap-2">
                <button onClick={() => setShowCoverSearch(false)} className="flex-1 bg-surface-2 hover:bg-border-custom text-foreground py-2 rounded-lg text-sm font-medium transition-colors">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
