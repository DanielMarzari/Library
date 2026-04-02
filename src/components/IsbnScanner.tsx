"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/lib/supabase";
import { Book } from "@/types/book";

interface IsbnScannerProps {
  onClose: () => void;
  onAdded: () => void;
}

interface BookLookupResult {
  title: string;
  author: string;
  isbn: string;
  cover_url: string | null;
  description: string | null;
}

export function IsbnScanner({ onClose, onAdded }: IsbnScannerProps) {
  const [mode, setMode] = useState<"choose" | "camera" | "manual">("choose");
  const [manualIsbn, setManualIsbn] = useState("");
  const [lookupResult, setLookupResult] = useState<BookLookupResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<Book["status"]>("want_to_read");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "isbn-scanner";

  const lookupIsbn = async (isbn: string) => {
    const cleanIsbn = isbn.replace(/[^0-9X]/gi, "");
    if (!cleanIsbn) {
      setError("Please enter a valid ISBN");
      return;
    }

    setSearching(true);
    setError("");
    setLookupResult(null);

    try {
      // Try Open Library first
      const res = await fetch(
        `https://openlibrary.org/search.json?isbn=${encodeURIComponent(cleanIsbn)}&limit=1`
      );
      const data = await res.json();

      if (data.docs && data.docs.length > 0) {
        const book = data.docs[0];
        setLookupResult({
          title: book.title || "Unknown Title",
          author: book.author_name?.[0] || "Unknown Author",
          isbn: cleanIsbn,
          cover_url: book.cover_i
            ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
            : null,
          description: book.first_sentence?.join(" ") || null,
        });
      } else {
        // Fallback: try Google Books
        const gRes = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}&maxResults=1`
        );
        const gData = await gRes.json();

        if (gData.items && gData.items.length > 0) {
          const vol = gData.items[0].volumeInfo;
          setLookupResult({
            title: vol.title || "Unknown Title",
            author: vol.authors?.[0] || "Unknown Author",
            isbn: cleanIsbn,
            cover_url: vol.imageLinks?.thumbnail?.replace("http:", "https:") || null,
            description: vol.description?.substring(0, 300) || null,
          });
        } else {
          setError(`No book found for ISBN: ${cleanIsbn}`);
        }
      }
    } catch {
      setError("Lookup failed. Check your connection and try again.");
    }

    setSearching(false);
  };

  const startCamera = async () => {
    setMode("camera");

    // Small delay to let the DOM render the container
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode(scannerContainerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 120 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Got a barcode
            scanner.stop().catch(() => {});
            scannerRef.current = null;
            lookupIsbn(decodedText);
          },
          () => {
            // Scan error (expected — ignore until we get a match)
          }
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

  const handleAdd = async () => {
    if (!lookupResult) return;
    setSaving(true);

    const { error: dbError } = await supabase.from("books").insert({
      title: lookupResult.title,
      author: lookupResult.author,
      isbn: lookupResult.isbn,
      cover_url: lookupResult.cover_url,
      description: lookupResult.description,
      status,
    });

    if (dbError) {
      setError("Failed to save. Try again.");
    } else {
      onAdded();
    }
    setSaving(false);
  };

  const reset = () => {
    setLookupResult(null);
    setError("");
    setManualIsbn("");
    setMode("choose");
    stopCamera();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">
            {lookupResult ? "Book Found!" : "Scan ISBN"}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl">
            ×
          </button>
        </div>

        {/* Book found result */}
        {lookupResult ? (
          <div className="space-y-4">
            <div className="flex gap-4">
              {lookupResult.cover_url ? (
                <img
                  src={lookupResult.cover_url}
                  alt={lookupResult.title}
                  className="w-20 h-30 rounded-md object-cover shadow-lg"
                />
              ) : (
                <div className="w-20 h-30 rounded-md bg-zinc-800 flex items-center justify-center">
                  <span className="text-zinc-600 text-xs">No Cover</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-zinc-100">{lookupResult.title}</h3>
                <p className="text-sm text-zinc-400 mt-0.5">{lookupResult.author}</p>
                <p className="text-xs text-zinc-600 mt-1">ISBN: {lookupResult.isbn}</p>
              </div>
            </div>

            {lookupResult.description && (
              <p className="text-xs text-zinc-500 leading-relaxed line-clamp-3">
                {lookupResult.description}
              </p>
            )}

            {/* Status picker */}
            <div>
              <label className="block text-xs text-zinc-500 mb-2">Add as:</label>
              <div className="flex gap-2">
                {(["want_to_read", "reading", "read"] as Book["status"][]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      status === s
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {s === "want_to_read" ? "Want to Read" : s === "reading" ? "Reading" : "Read"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? "Adding..." : "Add to Library"}
              </button>
              <button
                onClick={reset}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
              >
                Scan Another
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Mode chooser */}
            {mode === "choose" && (
              <div className="space-y-3">
                <button
                  onClick={startCamera}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-3"
                >
                  <span className="text-xl">📷</span>
                  Scan Barcode with Camera
                </button>
                <button
                  onClick={() => setMode("manual")}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-3"
                >
                  <span className="text-xl">⌨️</span>
                  Enter ISBN Manually
                </button>
              </div>
            )}

            {/* Camera scanner */}
            {mode === "camera" && (
              <div className="space-y-4">
                <div
                  id={scannerContainerId}
                  className="w-full rounded-xl overflow-hidden bg-black"
                />
                <p className="text-xs text-zinc-500 text-center">
                  Point your camera at the barcode on the back of a book
                </p>
                <button
                  onClick={() => {
                    stopCamera();
                    setMode("manual");
                  }}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Enter Manually Instead
                </button>
              </div>
            )}

            {/* Manual ISBN input */}
            {mode === "manual" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">ISBN</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualIsbn}
                      onChange={(e) => setManualIsbn(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") lookupIsbn(manualIsbn);
                      }}
                      placeholder="e.g. 9780143127550"
                      autoFocus
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      onClick={() => lookupIsbn(manualIsbn)}
                      disabled={searching || !manualIsbn.trim()}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {searching ? "..." : "Look Up"}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setMode("choose")}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Back
                </button>
              </div>
            )}

            {searching && (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-700 border-t-emerald-500" />
              </div>
            )}
          </>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
