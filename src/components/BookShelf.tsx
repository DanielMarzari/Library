"use client";

import { Book } from "@/types/book";

interface BookShelfProps {
  books: Book[];
  onBookTap: (book: Book) => void;
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

export function BookShelf({ books, onBookTap }: BookShelfProps) {
  // Group books by status
  const grouped = books.reduce(
    (acc, book) => {
      acc[book.status] = acc[book.status] || [];
      acc[book.status].push(book);
      return acc;
    },
    {} as Record<string, Book[]>
  );

  // Order: reading first, then not_read, then read
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

            <div className="relative">
              <div className="flex gap-3 overflow-x-auto pb-4 px-1 snap-x snap-mandatory scrollbar-hide">
                {sectionBooks.map((book) => (
                  <button
                    key={book.id}
                    onClick={() => !book._optimistic && onBookTap(book)}
                    className={`flex-shrink-0 snap-start group relative focus:outline-none ${
                      book._optimistic ? "animate-pulse pointer-events-none" : ""
                    }`}
                  >
                    <div className="relative w-[100px] sm:w-[120px] aspect-[2/3] rounded-md overflow-hidden shadow-lg shadow-black/40 transition-transform group-hover:scale-105 group-hover:-translate-y-1">
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

                      <div className="absolute inset-y-0 left-0 w-[3px] bg-black/30" />

                      {book.rating && !book._optimistic && (
                        <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-sm rounded px-1 py-0.5 flex gap-px">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`text-[8px] ${
                                star <= book.rating!
                                  ? "text-amber-400"
                                  : "text-zinc-600"
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-2 w-[100px] sm:w-[120px]">
                      <p className="text-[11px] font-medium text-zinc-300 truncate">
                        {book.title}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate">
                        {book.author}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="h-[6px] bg-gradient-to-b from-amber-900/40 to-amber-950/60 rounded-b-sm -mt-1 mx-1" />
              <div className="h-[2px] bg-amber-900/20 mx-2" />
            </div>
          </section>
        );
      })}
    </div>
  );
}
