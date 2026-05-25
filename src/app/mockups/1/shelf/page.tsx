"use client";

import Link from "next/link";
import { useState } from "react";
import { BentoShell, bento, display } from "../theme";
import { useBooks } from "../useLibraryData";
import type { MockBook } from "../../data";

type Filter = "all" | "reading" | "not_read" | "read" | "favorites";

export default function BentoShelf() {
  const { books, loading } = useBooks();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = books.filter((b) => {
    if (filter === "all") return true;
    if (filter === "favorites") return b.rating === 5;
    return b.status === filter;
  });

  const sections: { label: string; books: MockBook[]; accent: string; key: Filter }[] = [
    { label: "Currently reading", books: filtered.filter((b) => b.status === "reading"), accent: bento.yellow, key: "reading" },
    { label: "Up next", books: filtered.filter((b) => b.status === "not_read"), accent: bento.lilac, key: "not_read" },
    { label: "Recently finished", books: filtered.filter((b) => b.status === "read"), accent: bento.green, key: "read" },
  ];

  const counts = {
    all: books.length,
    reading: books.filter((b) => b.status === "reading").length,
    not_read: books.filter((b) => b.status === "not_read").length,
    read: books.filter((b) => b.status === "read").length,
    favorites: books.filter((b) => b.rating === 5).length,
  };

  return (
    <BentoShell current="shelf">
      <div className="mt-2 mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: bento.inkSoft, ...display }}>
            The shelf
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight" style={display}>
            {loading ? (
              "Loading..."
            ) : (
              <>
                All <span style={{ color: bento.pink }}>{books.length}</span> on display.
              </>
            )}
          </h1>
        </div>
        <button
          className="text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 px-3 py-2 rounded-full"
          style={{ background: bento.card, border: `1px solid ${bento.ink}10`, color: bento.ink, ...display }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M6 12h12M10 18h4" />
          </svg>
          Recent
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
                <CoverCard key={b.id} b={b} />
              ))}
            </div>
          </section>
        );
      })}

      <button
        className="fixed bottom-24 right-5 md:bottom-8 md:right-8 w-14 h-14 rounded-full shadow-xl grid place-items-center text-2xl font-bold z-30 hover:scale-110 transition-transform"
        style={{ background: bento.pink, color: "#FFF", boxShadow: `0 10px 30px -5px ${bento.pink}aa`, ...display }}
        aria-label="Add book"
      >
        +
      </button>
    </BentoShell>
  );
}

function CoverCard({ b }: { b: MockBook }) {
  return (
    <Link href={`/mockups/1/book?id=${encodeURIComponent(b.id)}`} className="group block">
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
        <div
          className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full ring-2 ring-white"
          style={{
            background: b.status === "reading" ? bento.yellow : b.status === "read" ? bento.green : bento.lilac,
          }}
        />
        {b.rating === 5 && (
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
  );
}
