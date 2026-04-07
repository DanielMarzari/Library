"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { api } from "@/lib/api-client";
import { Book } from "@/types/book";
import { BookSearchResult, searchBooks, enrichBook } from "@/lib/bookLookup";

interface IsbnScannerProps {
  onClose: () => void;
  onAdded: (optimisticBook: Partial<Book>) => void;
}

export function IsbnScanner({ onClose, onAdded }: IsbnScannerProps) {
  const [mode, setMode] = useState<"choose" | "camera" | "manual">("choose");
  const [manualIsbn, setManualIsbn] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<BookSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<Book["status"]>("not_read");
  const [source, setSource] = useState("");
  const [introPages, setIntroPages] = useState("");
  const [startPage, setStartPage] = useState("1");
  const [endPage, setEndPage] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [editTopics, setEditTopics] = useState<string[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "isbn-scanner";

  const handleSearch = async (query: string) => {
    const clean = query.trim();
    if (!clean) return;

    setSearching(true);
    setError("");
    setResults([]);
    setSelectedResult(null);

    const found = await searchBooks(clean, 5);
    if (found.length === 0) {
      setError(`No books found for: ${clean}`);
    } else if (found.length === 1) {
      await selectBook(found[0]);
    } else {
      setResults(found);
    }
    setSearching(false);
  };

  const selectBook = async (book: BookSearchResult) => {
    setResults([]);
    setEnriching(true);

    // Enrich with classification data
    const enriched = await enrichBook(book);
    setSelectedResult(enriched);

    // Pre-fill fields
    if (enriched.pages) setEndPage(enriched.pages.toString());
    if (enriched.topics) setEditTopics(enriched.topics);

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
          { fps: 30, qrbox: { width: 300, height: 150 }, aspectRatio: 1.0, disableFlip: false },
          (decodedText) => {
            scanner.stop().catch(() => {});
            scannerRef.current = null;
            handleSearch(decodedText);
          },
          () => {}
        );
      } catch {
        setError("Could not access camera. Try entering ISBN manually.");
        setMode("manual");
      }
    }, 100);
  };

  const stopCamera = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  // Computed reading pages
  const computedReadingPages = (() => {
    const ep = parseInt(endPage) || 0;
    const sp = parseInt(startPage) || 1;
    const ip = parseInt(introPages) || 0;
    if (ep === 0) return null;
    return ep - sp + 1 + ip;
  })();

  const handleAdd = async (book: BookSearchResult) => {
    setSaving(true);

    const ip = parseInt(introPages) || 0;
    const sp = parseInt(startPage) || 1;
    const ep = parseInt(endPage) || null;

    const newBook: Partial<Book> = {
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      cover_url: book.cover_url || undefined,
      description: book.description || undefined,
      pages: book.pages || undefined,
      status,
      source: source.trim() || undefined,
      lcc: book.lcc || undefined,
      ddc: book.ddc || undefined,
      topics: editTopics.length > 0 ? editTopics : undefined,
    };

    onAdded(newBook);

    try {
      await api.books.create({
        title: book.title,
        author: book.author,
        isbn: book.isbn || undefined,
        cover_url: book.cover_url,
        description: book.description,
        pages: book.pages,
        intro_pages: ip || 0,
        start_page: sp,
        end_page: ep,
        status,
        source: source.trim() || undefined,
        lcc: book.lcc || undefined,
        ddc: book.ddc || undefined,
        topics: editTopics.length > 0 ? editTopics : undefined,
      });
    } catch (error) {
      console.error("Error saving book:", error);
    }

    setSaving(false);
  };

  const addTopic = () => {
    const t = topicInput.trim();
    if (t && !editTopics.includes(t)) {
      setEditTopics([...editTopics, t]);
      setTopicInput("");
    }
  };

  const removeTopic = (topic: string) => {
    setEditTopics(editTopics.filter((t) => t !== topic));
  };

  const reset = () => {
    setResults([]);
    setSelectedResult(null);
    setError("");
    setManualIsbn("");
    setSource("");
    setIntroPages("");
    setStartPage("1");
    setEndPage("");
    setEditTopics([]);
    setTopicInput("");
    setMode("choose");
    stopCamera();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">
            {selectedResult ? "Confirm Book" : results.length > 0 ? "Select a Book" : "Scan ISBN"}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl">×</button>
        </div>

        {/* Multiple results picker */}
        {results.length > 1 && !selectedResult && (
          <div className="space-y-2 mb-4">
            <p className="text-xs text-zinc-500 mb-3">Found {results.length} results. Tap to select:</p>
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => selectBook(r)}
                className="w-full flex gap-3 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-left transition-colors"
              >
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
            <button onClick={reset} className="w-full bg-zinc-800 hover:bg-zinc-700 py-2 rounded-lg text-sm font-medium transition-colors mt-2">
              Search Again
            </button>
          </div>
        )}

        {/* Enriching spinner */}
        {enriching && (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-700 border-t-emerald-500" />
            <span className="ml-3 text-sm text-zinc-500">Fetching details...</span>
          </div>
        )}

        {/* Selected book confirmation */}
        {selectedResult && !enriching && (
          <div className="space-y-4">
            <div className="flex gap-4">
              {selectedResult.cover_url ? (
                <img src={selectedResult.cover_url} alt={selectedResult.title} className="w-20 h-30 rounded-md object-cover shadow-lg" />
              ) : (
                <div className="w-20 h-30 rounded-md bg-zinc-800 flex items-center justify-center">
                  <span className="text-zinc-600 text-xs">No Cover</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-zinc-100">{selectedResult.title}</h3>
                {selectedResult.subtitle && <p className="text-xs text-zinc-500 mt-0.5">{selectedResult.subtitle}</p>}
                <p className="text-sm text-zinc-400 mt-0.5">{selectedResult.author}</p>
                <div className="flex flex-wrap gap-2 text-xs text-zinc-600 mt-1">
                  {selectedResult.isbn && <span>ISBN: {selectedResult.isbn}</span>}
                  {selectedResult.pages && <span>{selectedResult.pages} pages</span>}
                </div>
                {(selectedResult.lcc || selectedResult.ddc) && (
                  <div className="flex flex-wrap gap-2 text-[10px] text-zinc-600 mt-1">
                    {selectedResult.lcc && <span>LCC: {selectedResult.lcc}</span>}
                    {selectedResult.ddc && <span>DDC: {selectedResult.ddc}</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Page details */}
            <div>
              <label className="block text-xs text-zinc-500 mb-2">Page Details</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-zinc-600 mb-0.5">Intro (roman)</label>
                  <input
                    type="number"
                    value={introPages}
                    onChange={(e) => setIntroPages(e.target.value)}
                    placeholder="0"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-600 mb-0.5">Start page</label>
                  <input
                    type="number"
                    value={startPage}
                    onChange={(e) => setStartPage(e.target.value)}
                    placeholder="1"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-600 mb-0.5">End page</label>
                  <input
                    type="number"
                    value={endPage}
                    onChange={(e) => setEndPage(e.target.value)}
                    placeholder={selectedResult.pages?.toString() || ""}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>
              {computedReadingPages && (
                <p className="text-xs text-zinc-500 mt-1">
                  Reading pages: <span className="text-zinc-300 font-medium">{computedReadingPages}</span>
                  {selectedResult.pages && (
                    <span className="text-zinc-600"> (of {selectedResult.pages} total)</span>
                  )}
                </p>
              )}
            </div>

            {/* Source */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Source (who/where did you get it?)</label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. Gift from Mom, Library, Amazon..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {/* Topics */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Topics</label>
              {editTopics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {editTopics.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 bg-zinc-800 text-zinc-300 text-xs px-2 py-0.5 rounded-full">
                      {t}
                      <button onClick={() => removeTopic(t)} className="text-zinc-500 hover:text-red-400">×</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTopic(); } }}
                  placeholder="Add a topic..."
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <button onClick={addTopic} className="bg-zinc-700 hover:bg-zinc-600 px-3 py-1.5 rounded-lg text-xs font-medium">
                  Add
                </button>
              </div>
            </div>

            {/* Status picker */}
            <div>
              <label className="block text-xs text-zinc-500 mb-2">Add as:</label>
              <div className="flex gap-2">
                {(["not_read", "reading", "read"] as Book["status"][]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      status === s ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {s === "not_read" ? "Not Read" : s === "reading" ? "Reading" : "Read"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleAdd(selectedResult)}
                disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? "Adding..." : "Add to Library"}
              </button>
              <button onClick={reset} className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors">
                Back
              </button>
            </div>
          </div>
        )}

        {/* Input modes */}
        {!selectedResult && results.length <= 1 && !enriching && (
          <>
            {mode === "choose" && !searching && (
              <div className="space-y-3">
                <button onClick={startCamera} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-3">
                  <span className="text-xl">📷</span> Scan Barcode with Camera
                </button>
                <button onClick={() => setMode("manual")} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-3">
                  <span className="text-xl">⌨️</span> Enter ISBN or Title
                </button>
              </div>
            )}

            {mode === "camera" && (
              <div className="space-y-4">
                <div id={scannerContainerId} className="w-full rounded-xl overflow-hidden bg-black" />
                <p className="text-xs text-zinc-500 text-center">Point your camera at the barcode on the back of a book</p>
                <button onClick={() => { stopCamera(); setMode("manual"); }} className="w-full bg-zinc-800 hover:bg-zinc-700 py-2.5 rounded-lg text-sm font-medium transition-colors">
                  Enter Manually Instead
                </button>
              </div>
            )}

            {mode === "manual" && !searching && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">ISBN or Book Title</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualIsbn}
                      onChange={(e) => setManualIsbn(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSearch(manualIsbn); }}
                      placeholder="e.g. 9780143127550 or Harry Potter"
                      autoFocus
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      onClick={() => handleSearch(manualIsbn)}
                      disabled={!manualIsbn.trim()}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      Search
                    </button>
                  </div>
                </div>
                <button onClick={() => setMode("choose")} className="w-full bg-zinc-800 hover:bg-zinc-700 py-2.5 rounded-lg text-sm font-medium transition-colors">
                  Back
                </button>
              </div>
            )}

            {searching && (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-700 border-t-emerald-500" />
                <span className="ml-3 text-sm text-zinc-500">Looking up book...</span>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="mt-4 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-3 text-sm text-red-400">{error}</div>
        )}
      </div>
    </div>
  );
}
