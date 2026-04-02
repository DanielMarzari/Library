"use client";

import { useRef, useCallback } from "react";
import { Book } from "@/types/book";

interface BookShelfProps {
  books: Book[];
  onBookTap: (book: Book) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onStartSelect: (id: string) => void;
  selectMode: boolean;
}

const statusLabels: Record<Book["status"], string> = {
  not_read: "Not Read",
  reading: "Currently Reading",
  read: "Read",
};

const statusEmoji: Record<Book["status"], string> = {
  reading: "📖",
  not_read: "📋",
  read: "✅",
};

function ShelfBook({
  book,
  onBookTap,
  selected,
  selectMode,
  onToggleSelect,
  onStartSelect,
}: {
  book: Book;
  onBookTap: (book: Book) => void;
  selected: boolean;
  selectMode: boolean;
  onToggleSelect: (id: string) => void;
  onStartSelect: (id: string) => void;
}) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const handlePointerDown = useCallback(() => {
    if (book._optimistic) return;
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      // Vibrate on supported devices
      if (navigator.vibrate) navigator.vibrate(50);
      onStartSelect(book.id);
    }, 500);
  }, [book.id, book._optimistic, onStartSelect]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (book._optimistic) return;
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    if (selectMode) {
      onToggleSelect(book.id);
    } else {
      onBookTap(book);
    }
  }, [book, selectMode, onToggleSelect, onBookTap]);

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleClick}
      className={`group relative focus:outline-none ${
        book._optimistic ? "animate-pulse pointer-events-none" : ""
      }`}
    >
      {/* Selection indicator */}
      {selectMode && (
        <div
          className={`absolute -top-1 -right-1 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] ${
            selected
              ? "bg-emerald-500 border-emerald-400 text-white"
              : "bg-zinc-800 border-zinc-600 text-transparent"
          }`}
        >
          ✓
        </div>
      )}

      <div
        className={`relative aspect-[2/3] rounded-md overflow-hidden shadow-lg shadow-black/40 transition-all group-hover:scale-105 group-hover:-translate-y-1 ${
          selected ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-zinc-950" : ""
        }`}
      >
        {book._optimistic ? (
          <div className="w-full h-full bg-zinc-800 flex flex-col items-center justify-center p-2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-zinc-600 border-t-emerald-500 mb-2" />
            <span className="text-[10px] text-zinc-500">Adding...</span>
          </div>
        ) : book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex flex-col items-center justify-center p-2 text-center">
            <span className="text-[10px] font-semibold text-zinc-300 leading-tight line-clamp-3">
              {book.title}
            </span>
            <span className="text-[9px] text-zinc-500 mt-1 line-clamp-1">
              {book.author}
            </span>
          </div>
        )}

        {/* Spine shadow */}
        <div className="absolute inset-y-0 left-0 w-[3px] bg-black/30" />

        {/* Rating */}
        {book.rating && !book._optimistic && (
          <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-sm rounded px-1 py-0.5 flex gap-px">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`text-[8px] ${
                  star <= book.rating! ? "text-amber-400" : "text-zinc-600"
                }`}
              >
                ★
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-1.5">
        <p className="text-[11px] font-medium text-zinc-300 truncate">
          {book.title}
        </p>
        <p className="text-[10px] text-zinc-500 truncate">{book.author}</p>
      </div>
    </button>
  );
}

export function BookShelf({
  books,
  onBookTap,
  selectedIds,
  onToggleSelect,
  onStartSelect,
  selectMode,
}: BookShelfProps) {
  const grouped = books.reduce(
    (acc, book) => {
      acc[book.status] = acc[book.status] || [];
      acc[book.status].push(book);
      return acc;
    },
    {} as Record<string, Book[]>
  );

  const sections: Book["status"][] = ["reading", "not_read", "read"];

  return (
    <div className="space-y-8">
      {sections.map((status) => {
        const sectionBooks = grouped[status];
        if (!sectionBooks || sectionBooks.length === 0) return null;

        return (
          <section key={status}>
            <div className="flex items-center gap-2 mb-4 px-1">
              <span className="text-lg">{statusEmoji[status]}</span>
              <h2 className="text-lg font-semibold text-zinc-100">
                {statusLabels[status]}
              </h2>
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                {sectionBooks.length}
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-3 px-1">
              {sectionBooks.map((book) => (
                <ShelfBook
                  key={book.id}
                  book={book}
                  onBookTap={onBookTap}
                  selected={selectedIds.has(book.id)}
                  selectMode={selectMode}
                  onToggleSelect={onToggleSelect}
                  onStartSelect={onStartSelect}
                />
              ))}
            </div>

            {/* Shelf edge */}
            <div className="h-[6px] bg-gradient-to-b from-amber-900/40 to-amber-950/60 rounded-b-sm mt-3 mx-1" />
            <div className="h-[2px] bg-amber-900/20 mx-2" />
          </section>
        );
      })}
    </div>
  );
}
