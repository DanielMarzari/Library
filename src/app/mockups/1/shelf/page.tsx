export const dynamic = "force-static";

import Link from "next/link";
import { MOCK_BOOKS } from "../../data";
import { BentoShell, bento, display } from "../theme";

// Mockup 1 — Bento Pop · Shelf
// Cover-grid view of the full collection. Status dots, progress overlay on
// reading books, 5★ gold badges, filter chips, and a floating add button.

export default function BentoShelf() {
  const sections: { label: string; books: typeof MOCK_BOOKS; accent: string }[] = [
    {
      label: "Currently reading",
      books: MOCK_BOOKS.filter((b) => b.status === "reading"),
      accent: bento.yellow,
    },
    {
      label: "Up next",
      books: MOCK_BOOKS.filter((b) => b.status === "not_read"),
      accent: bento.lilac,
    },
    {
      label: "Recently finished",
      books: MOCK_BOOKS.filter((b) => b.status === "read"),
      accent: bento.green,
    },
  ];

  return (
    <BentoShell current="shelf">
      {/* Header */}
      <div className="mt-2 mb-5 flex items-end justify-between gap-3">
        <div>
          <p
            className="text-[10px] uppercase tracking-wider font-semibold"
            style={{ color: bento.inkSoft, ...display }}
          >
            The shelf
          </p>
          <h1
            className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight"
            style={display}
          >
            All{" "}
            <span style={{ color: bento.pink }}>{MOCK_BOOKS.length}</span> on display.
          </h1>
        </div>
        {/* Sort */}
        <button
          className="text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 px-3 py-2 rounded-full"
          style={{
            background: bento.card,
            border: `1px solid ${bento.ink}10`,
            color: bento.ink,
            ...display,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M6 12h12M10 18h4" />
          </svg>
          Recent
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-5 overflow-x-auto -mx-4 px-4 pb-1">
        {[
          { label: "All", count: MOCK_BOOKS.length, active: true, color: bento.ink },
          { label: "Reading", count: sections[0].books.length, color: bento.yellow },
          { label: "Up next", count: sections[1].books.length, color: bento.lilac },
          { label: "Read", count: sections[2].books.length, color: bento.green },
          { label: "Favorites", count: 4, color: bento.pink },
        ].map((c) => (
          <button
            key={c.label}
            className="px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5"
            style={{
              background: c.active ? c.color : bento.card,
              color: c.active ? bento.bg : bento.ink,
              border: c.active ? "none" : `1px solid ${bento.ink}10`,
              ...display,
            }}
          >
            {c.label}
            <span
              className="px-1.5 rounded-full text-[10px]"
              style={{
                background: c.active ? "rgba(255,255,255,0.2)" : c.color + "33",
                color: c.active ? bento.bg : bento.ink,
              }}
            >
              {c.count}
            </span>
          </button>
        ))}
      </div>

      {/* Sections of covers */}
      {sections.map((s) => (
        <section key={s.label} className="mb-8 last:mb-4">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2
              className="text-base sm:text-lg font-bold flex items-center gap-2"
              style={display}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: s.accent }}
              />
              {s.label}
              <span
                className="text-sm font-normal"
                style={{ color: bento.inkSoft }}
              >
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
      ))}

      {/* Floating "add" button */}
      <button
        className="fixed bottom-24 right-5 md:bottom-8 md:right-8 w-14 h-14 rounded-full shadow-xl grid place-items-center text-2xl font-bold z-30 hover:scale-110 transition-transform"
        style={{
          background: bento.pink,
          color: "#FFF",
          boxShadow: `0 10px 30px -5px ${bento.pink}aa`,
          ...display,
        }}
        aria-label="Add book"
      >
        +
      </button>
    </BentoShell>
  );
}

function CoverCard({ b }: { b: typeof MOCK_BOOKS[number] }) {
  return (
    <Link href="/mockups/1/book" className="group block">
      <div className="relative">
        <img
          src={b.cover}
          alt={b.title}
          className="w-full aspect-[2/3] object-cover rounded-xl shadow-lg group-hover:scale-105 group-hover:shadow-2xl transition-all"
          style={{
            filter: b.status === "not_read" ? "saturate(0.7)" : "none",
          }}
        />

        {/* Status dot */}
        <div
          className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full ring-2 ring-white"
          style={{
            background:
              b.status === "reading"
                ? bento.yellow
                : b.status === "read"
                ? bento.green
                : bento.lilac,
          }}
        />

        {/* 5-star badge */}
        {b.rating === 5 && (
          <div
            className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full grid place-items-center text-xs font-bold shadow-lg"
            style={{ background: bento.yellow, ...display }}
          >
            ★
          </div>
        )}

        {/* Progress overlay if reading */}
        {b.status === "reading" && b.progress && (
          <div
            className="absolute bottom-1 left-1 right-1 h-1 rounded-full overflow-hidden"
            style={{ background: "rgba(0,0,0,0.3)" }}
          >
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
      <p
        className="text-[11px] sm:text-xs font-semibold mt-2 leading-tight line-clamp-2"
        style={display}
      >
        {b.title}
      </p>
      <p className="text-[10px] mt-0.5" style={{ color: bento.inkSoft }}>
        {b.author}
      </p>
    </Link>
  );
}
