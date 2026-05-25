"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { BentoShell, bento, display } from "../theme";
import { useBooks } from "../useLibraryData";
import { AddBookModal } from "../modals";
import type { MockBook } from "../../data";

type Filter = "all" | "reading" | "not_read" | "read" | "favorites";

export default function BentoShelf() {
  const { books, loading, refetch } = useBooks();
  const [filter, setFilter] = useState<Filter>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = books.filter((b) => {
    if (filter === "all") return true;
    if (filter === "favorites") return !!b.favorite || b.rating === 5;
    return b.status === filter;
  });

  const sections: { label: string; books: MockBook[]; accent: string }[] = [
    { label: "Currently reading", books: filtered.filter((b) => b.status === "reading"), accent: bento.yellow },
    { label: "Up next", books: filtered.filter((b) => b.status === "not_read"), accent: bento.lilac },
    { label: "Recently finished", books: filtered.filter((b) => b.status === "read"), accent: bento.green },
  ];

  const counts = {
    all: books.length,
    reading: books.filter((b) => b.status === "reading").length,
    not_read: books.filter((b) => b.status === "not_read").length,
    read: books.filter((b) => b.status === "read").length,
    favorites: books.filter((b) => !!b.favorite || b.rating === 5).length,
  };

  const cycleStatus = async (b: MockBook) => {
    if (busyId) return;
    setBusyId(b.id);
    try {
      const next: MockBook["status"] =
        b.status === "not_read" ? "reading" : b.status === "reading" ? "read" : "not_read";
      const now = new Date().toISOString().split("T")[0];
      await api.books.update(b.id, {
        status: next,
        start_date: next === "reading" && !b.start_date ? now : undefined,
        complete_date: next === "read" ? now : undefined,
      });
      refetch();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <BentoShell current="shelf">
      <div className="mt-2 mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: bento.inkSoft, ...display }}>
            The shelf
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight" style={display}>
            {loading ? "Loading..." : (
              <>All <span style={{ color: bento.pink }}>{books.length}</span> on display.</>
            )}
          </h1>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold text-white whitespace-nowrap"
          style={{ background: bento.pink, ...display }}
        >
          + Add book
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-5 overflow-x-auto -mx-4 px-4 pb-1">
        {([
          { key: "all", label: "All", color: bento.ink },
          { key: "reading", label: "Reading", color: bento.yellow },
          { key: "not_read", label: "Up next", color: bento.lilac },
          { key: "read", label: "Read", color: bento.green },
          { key: "favorites", label: "Favorites", color: bento.pink },
        ] as { key: Filter; label: string; color: string }[]).map((c) => {
          const active = filter === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className="px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5"
              style={{
                background: active ? c.color : bento.card,
                color: active ? bento.bg : bento.ink,
                border: active ? "none" : `1px solid ${bento.ink}10`,
                ...display,
              }}
            >
              {c.label}
              <span
                className="px-1.5 rounded-full text-[10px]"
                style={{
                  background: active ? "rgba(255,255,255,0.2)" : c.color + "33",
                  color: active ? bento.bg : bento.ink,
                }}
              >
                {counts[c.key]}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && !loading && (
        <div
          className="rounded-3xl p-10 text-center"
          style={{ background: bento.card, border: `2px dashed ${bento.ink}20`, color: bento.inkSoft }}
        >
          <p className="text-4xl mb-3">📚</p>
          <p className="text-base font-bold mb-1" style={{ ...display, color: bento.ink }}>
            Nothing matches that filter.
          </p>
          <p className="text-sm">Try &ldquo;All&rdquo;, or add a book to get started.</p>
        </div>
      )}

      {sections.map((s) => {
        if (s.books.length === 0) return null;
        return (
          <section key={s.label} className="mb-8 last:mb-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2" style={display}>
                <span className="w-2 h-2 rounded-full" style={{ background: s.accent }} />
                {s.label}
                <span className="text-sm font-normal" style={{ color: bento.inkSoft }}>
                  ({s.books.length})
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
              {s.books.map((b) => (
                <CoverCard
                  key={b.id}
                  b={b}
                  busy={busyId === b.id}
                  onCycleStatus={() => cycleStatus(b)}
                />
              ))}
            </div>
          </section>
        );
      })}

      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-24 right-5 md:bottom-8 md:right-8 w-14 h-14 rounded-full shadow-xl grid place-items-center text-2xl font-bold z-30 hover:scale-110 transition-transform"
        style={{ background: bento.pink, color: "#FFF", boxShadow: `0 10px 30px -5px ${bento.pink}aa`, ...display }}
        aria-label="Add book"
      >
        +
      </button>

      {showAdd && (
        <AddBookModal onClose={() => setShowAdd(false)} onSuccess={() => refetch()} />
      )}
    </BentoShell>
  );
}

function CoverCard({
  b,
  busy,
  onCycleStatus,
}: {
  b: MockBook;
  busy: boolean;
  onCycleStatus: () => void;
}) {
  return (
    <div className="group relative">
      <Link href={`/mockups/1/book?id=${encodeURIComponent(b.id)}`} className="block">
        <div className="relative">
          {b.cover ? (
            <img
              src={b.cover}
              alt={b.title}
              className="w-full aspect-[2/3] object-cover rounded-xl shadow-lg group-hover:scale-105 group-hover:shadow-2xl transition-all"
              style={{ filter: b.status === "not_read" ? "saturate(0.7)" : "none" }}
            />
          ) : (
            <div
              className="w-full aspect-[2/3] rounded-xl shadow-lg flex flex-col items-center justify-center p-2 text-center"
              style={{ background: `linear-gradient(135deg, ${bento.lilac}, ${bento.pink})`, color: "#FFF" }}
            >
              <span className="text-[10px] font-bold leading-tight line-clamp-3" style={display}>
                {b.title}
              </span>
            </div>
          )}
          {(b.favorite || b.rating === 5) && (
            <div
              className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full grid place-items-center text-xs font-bold shadow-lg"
              style={{ background: bento.yellow, ...display }}
            >
              ★
            </div>
          )}
          {b.status === "reading" && b.progress !== undefined && (
            <div className="absolute bottom-1 left-1 right-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.3)" }}>
              <div
                className="h-full"
                style={{
                  width: `${b.progress}%`,
                  background: `linear-gradient(90deg, ${bento.yellow}, ${bento.pink})`,
                }}
              />
            </div>
          )}
        </div>
        <p className="text-[11px] sm:text-xs font-semibold mt-2 leading-tight line-clamp-2" style={display}>
          {b.title}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: bento.inkSoft }}>
          {b.author}
        </p>
      </Link>

      {/* Status pill — tap to cycle. Sits on top so it doesn't trigger the Link. */}
      <button
        onClick={(e) => {
          e.preventDefault();
          onCycleStatus();
        }}
        disabled={busy}
        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full ring-2 ring-white grid place-items-center text-[10px] disabled:opacity-50"
        title={`Status: ${b.status} — tap to cycle`}
        style={{
          background:
            b.status === "reading" ? bento.yellow : b.status === "read" ? bento.green : bento.lilac,
          color: bento.ink,
          ...display,
        }}
      >
        {b.status === "reading" ? "📖" : b.status === "read" ? "✓" : "•"}
      </button>
    </div>
  );
}
