"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { supabase } from "@/lib/supabase";
import { Book } from "@/types/book";
import { BookSearchResult, searchBooks, enrichBook } from "@/lib/bookLookup";

interface AddBookSheetProps {
  onClose: () => void;
  onAdded: (optimisticBook: Partial<Book>) => void;
  recentSources: string[];
}

type Mode = "choose" | "camera" | "isbn" | "manual" | "pick" | "confirm";

export function AddBookSheet({ onClose, onAdded, recentSources }: AddBookSheetProps) {
  const [mode, setMode] = useState<Mode>("choose");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [selected, setSelected] = useState<BookSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchingIsbn, setSearchingIsbn] = useState("");
  const [enriching, setEnriching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Book fields
  const [status, setStatus] = useState<Book["status"]>("not_read");
  const [source, setSource] = useState("");
  const [showSourceSuggestions, setShowSourceSuggestions] = useState(false);
  const [volume, setVolume] = useState("");
  const [introPages, setIntroPages] = useState("");
  const [startPage, setStartPage] = useState("1");
  const [endPage, setEndPage] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [editTopics, setEditTopics] = useState<string[]>([]);

  // Manual entry fields
  const [manTitle, setManTitle] = useState("");
  const [manAuthor, setManAuthor] = useState("");
  const [manIsbn, setManIsbn] = useState("");
  const [manPages, setManPages] = useState("");
  const [manCoverUrl, setManCoverUrl] = useState("");
  const [confirmCoverUrl, setConfirmCoverUrl] = useState("");

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "isbn-scanner";

  const filteredSources = recentSources.filter(
    (s) => s.toLowerCase().includes(source.toLowerCase()) && s !== source
  );

  const handleSearch = async (q: string) => {
    const clean = q.trim();
    if (!clean) return;
    setSearching(true);
    setSearchingIsbn(clean);
    setError("");
    setResults([]);
    setSelected(null);

    const found = await searchBooks(clean, 8);
    if (found.length === 0) {
      setError(`No books found for: ${clean}`);
      setSearchingIsbn(clean); // keep ISBN visible for manual use
      setSearching(false);
    } else {
      setResults(found);
      setMode("pick");
      setSearching(false);
    }
  };

  const selectBook = async (book: BookSearchResult) => {
    setResults([]);
    setEnriching(true);
    setMode("confirm");
    const enriched = await enrichBook(book);
    setSelected(enriched);
    if (enriched.pages) setEndPage(enriched.pages.toString());
    if (enriched.topics) setEditTopics(enriched.topics);
    setConfirmCoverUrl(enriched.cover_url || "");
    setEnriching(false);
  };

  const startCamera = async () => {
    setMode("camera");
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
          ],
          verbose: false,
        });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 15, qrbox: { width: 300, height: 150 }, aspectRatio: 1.0, disableFlip: false },
          (decodedText) => {
            scanner.stop().catch(() => {});
            scannerRef.current = null;
            handleSearch(decodedText);
          },
          () => {}
        );
      } catch {
        setError("Could not access camera.");
        setMode("isbn");
      }
    }, 100);
  };

  const stopCamera = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
  };

  useEffect(() => () => stopCamera(), []);

  const computedReadingPages = (() => {
    const ep = parseInt(endPage) || 0;
    const sp = parseInt(startPage) || 1;
    const ip = parseInt(introPages) || 0;
    return ep > 0 ? ep - sp + 1 + ip : null;
  })();

  const handleAdd = async () => {
    const book = selected;
    if (!book) return;
    setSaving(true);

    const ip = parseInt(introPages) || 0;
    const sp = parseInt(startPage) || 1;
    const ep = parseInt(endPage) || null;

    const coverToUse = confirmCoverUrl.trim() || book.cover_url;
    const newBook: Partial<Book> = {
      title: book.title, author: book.author, isbn: book.isbn,
      cover_url: coverToUse || undefined, description: book.description || undefined,
      pages: book.pages || undefined, status,
      source: source.trim() || undefined, volume: volume.trim() || undefined,
      lcc: book.lcc || undefined, ddc: book.ddc || undefined,
      topics: editTopics.length > 0 ? editTopics : undefined,
    };
    onAdded(newBook);

    await supabase.from("books").insert({
      title: book.title, author: book.author, isbn: book.isbn || null,
      cover_url: coverToUse, description: book.description,
      pages: book.pages, intro_pages: ip || 0, start_page: sp, end_page: ep,
      status, source: source.trim() || null, volume: volume.trim() || null,
      lcc: book.lcc || null, ddc: book.ddc || null,
      topics: editTopics.length > 0 ? editTopics : null,
    });
    setSaving(false);
  };

  const handleManualAdd = async () => {
    if (!manTitle.trim() || !manAuthor.trim()) return;
    setSaving(true);

    const ip = parseInt(introPages) || 0;
    const sp = parseInt(startPage) || 1;
    const ep = parseInt(endPage) || null;

    const coverToUse = manCoverUrl.trim() || null;
    const newBook: Partial<Book> = {
      title: manTitle.trim(), author: manAuthor.trim(), status,
      isbn: manIsbn.trim() || undefined,
      cover_url: coverToUse || undefined,
      source: source.trim() || undefined, volume: volume.trim() || undefined,
      pages: manPages ? parseInt(manPages) : undefined,
    };
    onAdded(newBook);

    await supabase.from("books").insert({
      title: manTitle.trim(), author: manAuthor.trim(), status,
      isbn: manIsbn.trim() || null,
      cover_url: coverToUse,
      pages: manPages ? parseInt(manPages) : null,
      intro_pages: ip || 0, start_page: sp, end_page: ep,
      source: source.trim() || null, volume: volume.trim() || null,
      topics: editTopics.length > 0 ? editTopics : null,
    });
    setSaving(false);
  };

  const addTopic = () => {
    const t = topicInput.trim();
    if (t && !editTopics.includes(t)) { setEditTopics([...editTopics, t]); setTopicInput(""); }
  };

  const reset = () => {
    setResults([]); setSelected(null); setError(""); setQuery("");
    setMode("choose"); stopCamera();
  };

  const inputCls = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600";
  const numInputCls = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600";

  // Shared fields rendered inline (NOT as a sub-component) to avoid focus loss
  const sharedFields = (
    <>
      {/* Source with auto-suggest */}
      <div className="relative">
        <label className="block text-xs text-zinc-500 mb-1">Source</label>
        <input type="text" value={source}
          onChange={(e) => { setSource(e.target.value); setShowSourceSuggestions(true); }}
          onFocus={() => setShowSourceSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSourceSuggestions(false), 200)}
          placeholder="Gift from Mom, Library, Amazon..."
          className={inputCls} />
        {showSourceSuggestions && filteredSources.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden shadow-lg">
            {filteredSources.slice(0, 4).map((s) => (
              <button key={s} onMouseDown={() => { setSource(s); setShowSourceSuggestions(false); }}
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Volume */}
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Volume</label>
        <input type="text" value={volume} onChange={(e) => setVolume(e.target.value)}
          placeholder="e.g. Vol. 1, Part 2..." className={inputCls} />
      </div>

      {/* Page details */}
      <div>
        <label className="block text-xs text-zinc-500 mb-2">Page Details</label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] text-zinc-600 mb-0.5">Intro (roman)</label>
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={introPages}
              onChange={(e) => setIntroPages(e.target.value)} onFocus={(e) => e.target.select()} placeholder="0" className={numInputCls} />
          </div>
          <div>
            <label className="block text-[10px] text-zinc-600 mb-0.5">Start page</label>
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={startPage}
              onChange={(e) => setStartPage(e.target.value)} onFocus={(e) => e.target.select()} placeholder="1" className={numInputCls} />
          </div>
          <div>
            <label className="block text-[10px] text-zinc-600 mb-0.5">End page</label>
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={endPage}
              onChange={(e) => setEndPage(e.target.value)} onFocus={(e) => e.target.select()} placeholder="" className={numInputCls} />
          </div>
        </div>
        {computedReadingPages && (
          <p className="text-xs text-zinc-500 mt-1">Reading pages: <span className="text-zinc-300 font-medium">{computedReadingPages}</span></p>
        )}
      </div>

      {/* Topics */}
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Topics</label>
        {editTopics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {editTopics.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 bg-zinc-800 text-zinc-300 text-xs px-2 py-0.5 rounded-full">
                {t}
                <button onClick={() => setEditTopics(editTopics.filter((x) => x !== t))} className="text-zinc-500 hover:text-red-400">×</button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input type="text" value={topicInput} onChange={(e) => setTopicInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTopic(); } }}
            placeholder="Add a topic..." className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600" />
          <button onClick={addTopic} className="bg-zinc-700 hover:bg-zinc-600 px-3 py-1.5 rounded-lg text-xs font-medium">Add</button>
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="block text-xs text-zinc-500 mb-2">Status</label>
        <div className="flex gap-2">
          {(["not_read", "reading", "read"] as Book["status"][]).map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                status === s ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-400"}`}>
              {s === "not_read" ? "Not Read" : s === "reading" ? "Reading" : "Read"}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">
            {mode === "confirm" ? "Confirm Book" : mode === "pick" ? "Select a Book" : mode === "manual" ? "Add Manually" : "Add a Book"}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl">×</button>
        </div>

        {/* === CHOOSE MODE === */}
        {mode === "choose" && !searching && (
          <div className="space-y-3">
            <button onClick={startCamera}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-3">
              <span className="text-xl">📷</span> Scan Barcode
            </button>
            <button onClick={() => setMode("isbn")}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-3">
              <span className="text-xl">🔍</span> Search by ISBN or Title
            </button>
            <button onClick={() => setMode("manual")}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-3">
              <span className="text-xl">✏️</span> Add Manually
            </button>
          </div>
        )}

        {/* === CAMERA === */}
        {mode === "camera" && (
          <div className="space-y-4">
            <div id={scannerContainerId} className="w-full rounded-xl overflow-hidden bg-black" />
            <p className="text-xs text-zinc-500 text-center">Point camera at the barcode</p>
            <button onClick={() => { stopCamera(); setMode("isbn"); }}
              className="w-full bg-zinc-800 hover:bg-zinc-700 py-2.5 rounded-lg text-sm font-medium transition-colors">
              Enter Manually Instead
            </button>
          </div>
        )}

        {/* === ISBN/TITLE SEARCH === */}
        {mode === "isbn" && !searching && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">ISBN or Book Title</label>
              <div className="flex gap-2">
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearch(query); }}
                  placeholder="e.g. 9780143127550 or The Great Gatsby" autoFocus
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600" />
                <button onClick={() => handleSearch(query)} disabled={!query.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  Search
                </button>
              </div>
            </div>
            <button onClick={() => setMode("choose")} className="w-full bg-zinc-800 hover:bg-zinc-700 py-2.5 rounded-lg text-sm font-medium transition-colors">Back</button>
          </div>
        )}

        {/* === PICK FROM RESULTS === */}
        {mode === "pick" && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 mb-3">Found {results.length} results:</p>
            {results.map((r, i) => (
              <button key={i} onClick={() => selectBook(r)}
                className="w-full flex gap-3 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-left transition-colors">
                {r.cover_url ? (
                  <img src={r.cover_url} alt={r.title} className="w-12 h-18 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-18 rounded bg-zinc-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-zinc-500 text-[8px]">No Cover</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-100 truncate">{r.title}</p>
                  {r.subtitle && <p className="text-xs text-zinc-500 truncate">{r.subtitle}</p>}
                  <p className="text-xs text-zinc-400">{r.author}</p>
                  <div className="flex gap-2 text-[10px] text-zinc-600 mt-0.5">
                    {r.publish_year && <span>{r.publish_year}</span>}
                    {r.pages && <span>{r.pages} pages</span>}
                  </div>
                </div>
              </button>
            ))}
            <button onClick={reset} className="w-full bg-zinc-800 hover:bg-zinc-700 py-2 rounded-lg text-sm font-medium transition-colors mt-2">Search Again</button>
          </div>
        )}

        {/* === CONFIRM SCANNED/SEARCHED BOOK === */}
        {mode === "confirm" && (enriching ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-700 border-t-emerald-500" />
            <span className="ml-3 text-sm text-zinc-500">Fetching details...</span>
          </div>
        ) : selected && (
          <div className="space-y-4">
            <div className="flex gap-4">
              {selected.cover_url ? (
                <img src={selected.cover_url} alt={selected.title} className="w-20 h-30 rounded-md object-cover shadow-lg" />
              ) : (
                <div className="w-20 h-30 rounded-md bg-zinc-800 flex items-center justify-center">
                  <span className="text-zinc-600 text-xs">No Cover</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-zinc-100">{selected.title}</h3>
                {selected.subtitle && <p className="text-xs text-zinc-500 mt-0.5">{selected.subtitle}</p>}
                <p className="text-sm text-zinc-400 mt-0.5">{selected.author}</p>
                <div className="flex flex-wrap gap-2 text-xs text-zinc-600 mt-1">
                  {selected.isbn && <span>ISBN: {selected.isbn}</span>}
                  {selected.pages && <span>{selected.pages} pages</span>}
                </div>
              </div>
            </div>

            {/* Cover URL override */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Cover Image URL</label>
              <input type="url" value={confirmCoverUrl} onChange={(e) => setConfirmCoverUrl(e.target.value)}
                placeholder="https://... (leave blank to use default)" className={inputCls} />
            </div>

            {sharedFields}

            <div className="flex gap-3">
              <button onClick={handleAdd} disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {saving ? "Adding..." : "Add to Library"}
              </button>
              <button onClick={reset} className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors">Back</button>
            </div>
          </div>
        ))}

        {/* === MANUAL ADD === */}
        {mode === "manual" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Title *</label>
              <input type="text" value={manTitle} onChange={(e) => setManTitle(e.target.value)} placeholder="Book title" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Author *</label>
              <input type="text" value={manAuthor} onChange={(e) => setManAuthor(e.target.value)} placeholder="Author name" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">ISBN</label>
              <input type="text" inputMode="numeric" value={manIsbn} onChange={(e) => setManIsbn(e.target.value)} placeholder="978..." className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Total Pages</label>
              <input type="text" inputMode="numeric" pattern="[0-9]*" value={manPages} onChange={(e) => setManPages(e.target.value)} placeholder="Page count" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Cover Image URL</label>
              <input type="url" value={manCoverUrl} onChange={(e) => setManCoverUrl(e.target.value)}
                placeholder="https://..." className={inputCls} />
            </div>

            {sharedFields}

            <div className="flex gap-3">
              <button onClick={handleManualAdd} disabled={saving || !manTitle.trim() || !manAuthor.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {saving ? "Adding..." : "Add to Library"}
              </button>
              <button onClick={() => setMode("choose")} className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors">Back</button>
            </div>
          </div>
        )}

        {/* Loading */}
        {searching && (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-700 border-t-emerald-500" />
              <span className="ml-3 text-sm text-zinc-400">Looking up{searchingIsbn ? ` ISBN ${searchingIsbn}` : " book"}...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 space-y-3">
            <div className="bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-3 text-sm text-red-400">{error}</div>
            {searchingIsbn && (
              <div className="flex gap-2">
                <button onClick={() => { setManIsbn(searchingIsbn); setMode("manual"); setError(""); }}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-2.5 rounded-lg text-sm font-medium transition-colors">
                  Add manually with ISBN {searchingIsbn}
                </button>
                <button onClick={() => { setQuery(searchingIsbn); setMode("isbn"); setError(""); }}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-2.5 rounded-lg text-sm font-medium transition-colors">
                  Search again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
