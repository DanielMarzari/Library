export const dynamic = "force-static";

import Link from "next/link";
import { MOCK_BOOKS } from "../../data";
import { BentoShell, bento, display } from "../theme";

// Mockup 1 — Bento Pop · Shelf (mobile-first)
// Shows both views — Spine and Cover — stacked on the same page so you can
// compare. Spine view = books standing upright with rotated titles + colored
// spines; Cover view = clean poster grid.

// Pick a stable, vibrant spine color per book based on its id.
const SPINE_COLORS = [
  "#EF476F",
  "#FFD166",
  "#06D6A0",
  "#118AB2",
  "#C8B6FF",
  "#FF8A3B",
  "#F26157",
  "#3A8DDE",
  "#7B5BFF",
  "#FFB400",
  "#2EC4B6",
  "#D946EF",
];

export default function BentoShelf() {
  const groups: { label: string; books: typeof MOCK_BOOKS; accent: string }[] = [
    {
      label: "Currently reading",
      books: MOCK_BOOKS.filter((b) => b.status === "reading"),
      accent: bento.yellow,
    },
    {
      label: "Recently finished",
      books: MOCK_BOOKS.filter((b) => b.status === "read"),
      accent: bento.green,
    },
    {
      label: "On the queue",
      books: MOCK_BOOKS.filter((b) => b.status === "not_read"),
      accent: bento.lilac,
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
            <span style={{ color: bento.pink }}>{MOCK_BOOKS.length}</span> on
            display.
          </h1>
        </div>
        {/* View toggle pill */}
        <div
          className="flex items-center p-1 rounded-full"
          style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}
        >
          <button
            className="px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: bento.ink, color: bento.bg, ...display }}
          >
            Spines
          </button>
          <button
            className="px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ color: bento.inkSoft, ...display }}
          >
            Covers
          </button>
        </div>
      </div>

      {/* SPINES VIEW */}
      <section className="mb-10">
        <p
          className="text-[10px] uppercase tracking-wider font-semibold mb-3"
          style={{ color: bento.inkSoft, ...display }}
        >
          ① Spine view — like real shelves
        </p>

        {groups.map((g) => (
          <div key={g.label} className="mb-6 last:mb-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <h2
                className="text-base sm:text-lg font-bold flex items-center gap-2"
                style={display}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: g.accent }}
                />
                {g.label}
              </h2>
              <span
                className="text-[10px] uppercase tracking-wider"
                style={{ color: bento.inkSoft }}
              >
                {g.books.length} books
              </span>
            </div>

            {/* The shelf itself */}
            <div className="relative">
              <div
                className="flex items-end gap-1 px-3 pt-4 pb-1 overflow-x-auto"
                style={{
                  background: bento.card,
                  border: `1px solid ${bento.ink}10`,
                  borderRadius: "20px 20px 0 0",
                  minHeight: "190px",
                }}
              >
                {g.books.map((b, i) => (
                  <Spine
                    key={b.id}
                    book={b}
                    color={SPINE_COLORS[(parseInt(b.id) + i) % SPINE_COLORS.length]}
                  />
                ))}
                {/* bookend */}
                <div
                  className="flex-shrink-0 w-3 h-32 sm:h-36 rounded-l-md ml-1"
                  style={{ background: bento.ink }}
                />
              </div>
              {/* shelf plank */}
              <div
                className="h-3 rounded-b-md"
                style={{
                  background: `linear-gradient(180deg, ${bento.ink} 0%, #000 100%)`,
                  boxShadow: `0 6px 12px -2px ${bento.ink}55`,
                }}
              />
            </div>
          </div>
        ))}
      </section>

      {/* COVERS VIEW */}
      <section className="mb-6">
        <p
          className="text-[10px] uppercase tracking-wider font-semibold mb-3 mt-8"
          style={{ color: bento.inkSoft, ...display }}
        >
          ② Cover view — poster grid
        </p>

        {/* Filter / sort row */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
            {["All", "Reading", "Read", "Queued", "Favorites"].map((c, i) => (
              <button
                key={c}
                className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
                style={{
                  background: i === 0 ? bento.ink : bento.card,
                  color: i === 0 ? bento.bg : bento.ink,
                  border: i === 0 ? "none" : `1px solid ${bento.ink}10`,
                  ...display,
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <button
            className="text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1"
            style={{ color: bento.inkSoft, ...display }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M6 12h12M10 18h4" />
            </svg>
            Sort: Recent
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3 sm:gap-4">
          {MOCK_BOOKS.map((b, i) => (
            <Link
              key={b.id}
              href="/mockups/1/book"
              className="group block"
            >
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

                {/* Rating */}
                {b.rating === 5 && (
                  <div
                    className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full grid place-items-center text-xs font-bold shadow-lg"
                    style={{ background: bento.yellow, ...display }}
                  >
                    ★
                  </div>
                )}

                {/* Progress bar overlay if reading */}
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
              <p
                className="text-[10px] mt-0.5"
                style={{ color: bento.inkSoft }}
              >
                {b.author}
              </p>
            </Link>
          ))}
        </div>

        {/* Floating "add" button */}
        <button
          className="fixed bottom-24 right-5 md:bottom-8 md:right-8 w-14 h-14 rounded-full shadow-xl grid place-items-center text-2xl font-bold z-30"
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
      </section>
    </BentoShell>
  );
}

function Spine({
  book,
  color,
}: {
  book: (typeof MOCK_BOOKS)[number];
  color: string;
}) {
  // Vary the spine width slightly based on page count for visual interest.
  const widthClass =
    book.pages > 500 ? "w-9 sm:w-10" : book.pages > 250 ? "w-7 sm:w-8" : "w-6 sm:w-7";
  const heightVariance = 128 + (book.pages % 24); // 128–152px

  return (
    <Link
      href="/mockups/1/book"
      className={`group ${widthClass} flex-shrink-0 relative cursor-pointer`}
      style={{ height: `${heightVariance}px` }}
    >
      <div
        className="absolute inset-0 rounded-sm transition-transform group-hover:-translate-y-2 group-hover:shadow-2xl"
        style={{
          background: color,
          boxShadow: `inset -2px 0 4px rgba(0,0,0,0.18), inset 2px 0 2px rgba(255,255,255,0.18), 0 4px 8px rgba(0,0,0,0.15)`,
        }}
      >
        {/* Top + bottom caps */}
        <div
          className="absolute top-1 left-1 right-1 h-px"
          style={{ background: "rgba(255,255,255,0.4)" }}
        />
        <div
          className="absolute bottom-1 left-1 right-1 h-px"
          style={{ background: "rgba(0,0,0,0.2)" }}
        />

        {/* Title rotated 90° */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <p
            className="text-[10px] sm:text-[11px] font-bold leading-none px-1 text-center whitespace-nowrap"
            style={{
              ...display,
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              color: "#0B0B16",
              textShadow: "0 1px 0 rgba(255,255,255,0.3)",
              maxHeight: `${heightVariance - 16}px`,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {book.title}
          </p>
        </div>

        {/* Bottom band with author initial */}
        <div
          className="absolute bottom-0 left-0 right-0 h-4 grid place-items-center"
          style={{ background: "rgba(0,0,0,0.18)" }}
        >
          <span
            className="text-[9px] font-bold"
            style={{ ...display, color: "rgba(255,255,255,0.85)" }}
          >
            {book.author.split(" ").pop()?.slice(0, 4).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Cover peek on hover (desktop) */}
      <div
        className="absolute -top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20"
        style={{ width: "60px", marginTop: "-80px" }}
      >
        <img
          src={book.cover}
          alt=""
          className="rounded shadow-2xl"
          style={{ aspectRatio: "2 / 3", objectFit: "cover", width: "60px" }}
        />
      </div>
    </Link>
  );
}
