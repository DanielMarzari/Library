"use client";

import { Book } from "@/types/book";

interface BookCardProps {
  book: Book;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Book["status"]) => void;
}

const statusLabels: Record<Book["status"], string> = {
  not_read: "Not Read",
  reading: "Reading",
  read: "Read",
};

const statusColors: Record<Book["status"], string> = {
  not_read: "bg-zinc-600/20 text-zinc-400",
  reading: "bg-blue-600/20 text-blue-400",
  read: "bg-emerald-600/20 text-emerald-400",
};

const nextStatus: Record<Book["status"], Book["status"]> = {
  not_read: "reading",
  reading: "read",
  read: "not_read",
};

export function BookCard({ book, onDelete, onStatusChange }: BookCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex gap-4 hover:border-zinc-700 transition-colors">
      {book.cover_url ? (
        <img src={book.cover_url} alt={book.title} className="w-16 h-24 rounded-md object-cover flex-shrink-0" />
      ) : (
        <div className="w-16 h-24 rounded-md bg-zinc-800 flex items-center justify-center flex-shrink-0">
          <span className="text-zinc-600 text-xs text-center px-1">No Cover</span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm text-zinc-100 truncate">{book.title}</h3>
        <p className="text-xs text-zinc-400 mt-0.5 truncate">{book.author}</p>
        {book.pages && <p className="text-xs text-zinc-600 mt-0.5">{book.pages} pages</p>}

        {book.rating && (
          <div className="flex gap-0.5 mt-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className={`text-xs ${star <= book.rating! ? "text-amber-400" : "text-zinc-700"}`}>
                ★
              </span>
            ))}
          </div>
        )}

        <button
          onClick={() => onStatusChange(book.id, nextStatus[book.status])}
          className={`mt-2 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[book.status]} hover:opacity-80 transition-opacity`}
        >
          {statusLabels[book.status]}
        </button>

        <button
          onClick={() => { if (confirm("Remove this book?")) onDelete(book.id); }}
          className="ml-2 text-xs text-zinc-600 hover:text-red-400 transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
