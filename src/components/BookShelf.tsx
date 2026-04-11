"use client";

import { useRef, useCallback } from "react";
import { Book } from "@/types/book";
import { safeCoverUrl } from "@/lib/coverUrl";

type GridSize = "xs" | "small" | "medium" | "large" | "xl";

interface BookShelfProps {
  books: Book[];
  onBookTap: (book: Book) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onStartSelect: (id: string) => void;
  selectMode: boolean;
  sortMode?: string;
  flatGrid?: boolean;
  gridSize?: GridSize;
  avgPagesPerDay?: number | null;
}

const gridClasses: Record<GridSize, string> = {
  xs:     "grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 2xl:grid-cols-14 gap-2",
  small:  "grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-3",
  medium: "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-4",
  large:  "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-5",
  xl:     "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6",
};

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
  avgPagesPerDay,
}: {
  book: Book;
  onBookTap: (book: Book) => void;
  selected: boolean;
  selectMode: boolean;
  onToggleSelect: (id: string) => void;
  onStartSelect: (id: string) => void;
  avgPagesPerDay?: number | null;
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
      {/* (favorite indicated via border below) */}
      {/* Selection indicator */}
      {selectMode && (
        <div
          className={`absolute -top-1 -right-1 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] ${
            selected
              ? "bg-emerald-500 border-emerald-400 text-white"
              : "bg-surface-2 border-border-custom text-transparent"
          }`}
        >
          ✓
        </div>
      )}

      <div
        className={`relative aspect-[2/3] rounded-md overflow-hidden transition-all group-hover:scale-105 group-hover:-translate-y-1 ${
          selected ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-background shadow-lg shadow-black/40" : book.favorite ? "shadow-[0_0_12px_3px_rgba(234,179,8,0.45)]" : "shadow-lg shadow-black/40"
        }`}
      >
        {book._optimistic ? (
          <div className="w-full h-full bg-surface-2 flex flex-col items-center justify-center p-2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-border-custom border-t-emerald-500 mb-2" />
            <span className="text-[10px] text-muted">Adding...</span>
          </div>
        ) : safeCoverUrl(book.cover_url) ? (
          <>
            <img
              src={safeCoverUrl(book.cover_url)}
              alt={book.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement?.querySelector('.cover-fallback')?.classList.remove('hidden'); }}
            />
            <div className="cover-fallback hidden w-full h-full bg-gradient-to-br from-border-custom to-surface-2 flex flex-col items-center justify-center p-2 text-center absolute inset-0">
              <span className="text-[10px] font-semibold text-foreground leading-tight line-clamp-3">{book.title}</span>
              <span className="text-[9px] text-muted mt-1 line-clamp-1">{book.author}</span>
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-border-custom to-surface-2 flex flex-col items-center justify-center p-2 text-center">
            <span className="text-[10px] font-semibold text-foreground leading-tight line-clamp-3">
              {book.title}
            </span>
            <span className="text-[9px] text-muted mt-1 line-clamp-1">
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
                  star <= book.rating! ? "text-amber-400" : "text-muted-2"
                }`}
              >
                ★
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-1.5">
        <p className="text-[11px] font-medium text-foreground truncate">
          {book.title}
        </p>
        <p className="text-[10px] text-muted-2 truncate">{book.author}</p>
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
  sortMode,
  flatGrid,
  gridSize = "medium",
  avgPagesPerDay,
}: BookShelfProps) {
  // When sorting by alpha/rating/lcc/ddc, or flat grid forced, show flat grid (no grouping)
  const flatMode = flatGrid || sortMode === "alpha" || sortMode === "rating" || sortMode === "lcc" || sortMode === "ddc";

  const grouped = books.reduce(
    (acc, book) => {
      const key = flatMode ? "all" : book.status;
      acc[key] = acc[key] || [];
      acc[key].push(book);
      return acc;
    },
    {} as Record<string, Book[]>
  );

  const sections: string[] = flatMode
    ? ["all"]
    : ["reading", "not_read", "read"];

  return (
    <div className="space-y-8">
      {sections.map((status) => {
        const sectionBooks = grouped[status];
        if (!sectionBooks || sectionBooks.length === 0) return null;

        return (
          <section key={status}>
            {!flatMode && (
              <div className="flex items-center gap-2 mb-4 px-1">
                <span className="text-lg">{statusEmoji[status as Book["status"]]}</span>
                <h2 className="text-lg font-semibold text-foreground">
                  {statusLabels[status as Book["status"]]}
                </h2>
                <span className="text-xs text-muted bg-surface-2 px-2 py-0.5 rounded-full">
                  {sectionBooks.length}
                </span>
              </div>
            )}

            <div className={`grid ${gridClasses[gridSize]} px-1`}>
              {sectionBooks.map((book) => (
                <ShelfBook
                  key={book.id}
                  book={book}
                  onBookTap={onBookTap}
                  selected={selectedIds.has(book.id)}
                  selectMode={selectMode}
                  onToggleSelect={onToggleSelect}
                  onStartSelect={onStartSelect}
                  avgPagesPerDay={avgPagesPerDay}
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
