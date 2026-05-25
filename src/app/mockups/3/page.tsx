export const dynamic = "force-static";

import Link from "next/link";
import { MOCK_BOOKS, MOCK_STATS } from "../data";

// -----------------------------------------------------------------------------
// Mockup 3 — "Reel" (SURPRISE)
// Dark cinematic mood, Letterboxd-meets-album-art. Hero panel with a featured
// book whose cover is blown up + blurred as the backdrop. Big poster-grid of
// all books. Vivid colour bursts from each cover. Vibe: a private reading
// diary curated like a film collection. Bebas Neue display + Inter Tight body.
// -----------------------------------------------------------------------------

const palette = {
  bg: "#0A0A0F",
  surface: "#15151D",
  surfaceHi: "#1F1F2A",
  ink: "#F5F5F7",
  inkSoft: "#8E8E9A",
  inkFaint: "#4A4A55",
  // Hot accents — used sparingly like film festival posters
  hot: "#FF3B5C",
  amber: "#F5C518", // IMDb yellow
  cyan: "#3DDBD9",
  violet: "#A78BFA",
};

const fontImport = `https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter+Tight:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap`;

const display: React.CSSProperties = {
  fontFamily: "'Bebas Neue', 'Inter Tight', sans-serif",
  letterSpacing: "0.01em",
};
const body: React.CSSProperties = { fontFamily: "'Inter Tight', sans-serif" };
const mono: React.CSSProperties = { fontFamily: "'DM Mono', monospace" };

export default function MockupReel() {
  const reading = MOCK_BOOKS.filter((b) => b.status === "reading");
  const finished = MOCK_BOOKS.filter((b) => b.status === "read");
  const featured = reading[0];

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href={fontImport} />
      <div
        style={{
          background: palette.bg,
          color: palette.ink,
          minHeight: "100vh",
          ...body,
        }}
      >
        {/* Top nav */}
        <header className="sticky top-0 z-30 backdrop-blur-xl" style={{ background: `${palette.bg}cc`, borderBottom: `1px solid ${palette.surfaceHi}` }}>
          <div className="max-w-7xl mx-auto px-5 sm:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ReelLogo />
              <p className="text-2xl tracking-[0.08em]" style={display}>REEL</p>
            </div>
            <nav className="hidden md:flex items-center gap-7 text-sm" style={mono}>
              <Link
                href="/mockups/3/diary"
                style={{ color: palette.inkSoft, opacity: 0.8 }}
                className="hover:opacity-100 transition-opacity"
              >
                DIARY
              </Link>
              <a style={{ color: palette.hot, opacity: 1 }}>SHELF</a>
              <Link
                href="/mockups/3/book"
                style={{ color: palette.inkSoft, opacity: 0.8 }}
                className="hover:opacity-100 transition-opacity"
              >
                BOOK
              </Link>
              <span style={{ color: palette.inkFaint }}>·</span>
              <a style={{ color: palette.inkSoft, opacity: 0.8 }}>LISTS</a>
              <a style={{ color: palette.inkSoft, opacity: 0.8 }}>PROFILE</a>
            </nav>
            <Link
              href="/mockups"
              className="text-xs px-3 py-1.5 border"
              style={{ ...mono, borderColor: palette.surfaceHi, color: palette.inkSoft }}
            >
              ← mockups
            </Link>
          </div>
        </header>

        {/* HERO: featured book as backdrop */}
        {featured && (
          <section className="relative overflow-hidden" style={{ minHeight: "92vh" }}>
            {/* Blurred backdrop */}
            <img
              src={featured.cover}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "blur(60px) saturate(1.4)", opacity: 0.55, transform: "scale(1.2)" }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, ${palette.bg}00 0%, ${palette.bg}40 30%, ${palette.bg}d0 70%, ${palette.bg} 100%)`,
              }}
            />

            <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-12 sm:py-20">
              <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 items-end" style={{ minHeight: "70vh" }}>
                {/* Poster */}
                <div className="relative">
                  <img
                    src={featured.cover}
                    alt={featured.title}
                    className="w-48 sm:w-64 aspect-[2/3] object-cover mx-auto md:mx-0 shadow-2xl"
                    style={{ boxShadow: "0 30px 60px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)" }}
                  />
                  <div
                    className="absolute -top-3 -right-3 px-3 py-1 text-xs font-bold tracking-wider"
                    style={{ background: palette.hot, color: "#FFF", ...display }}
                  >
                    NOW READING
                  </div>
                </div>

                {/* Title block */}
                <div>
                  <p className="text-xs mb-4 tracking-[0.4em]" style={{ ...mono, color: palette.amber }}>
                    DIARY ENTRY · {new Date().toLocaleDateString("en-US", { dateStyle: "long" }).toUpperCase()}
                  </p>
                  <h1
                    className="leading-[0.85] mb-3"
                    style={{
                      ...display,
                      fontSize: "clamp(3rem, 9vw, 8rem)",
                    }}
                  >
                    {featured.title.toUpperCase()}
                  </h1>
                  <p
                    className="text-lg sm:text-2xl mb-6"
                    style={{ color: palette.inkSoft, ...body }}
                  >
                    <span style={{ color: palette.ink }}>{featured.author}</span> · {featured.year}
                  </p>

                  {/* Stat strip */}
                  <div className="flex flex-wrap gap-x-8 gap-y-3 mb-6" style={mono}>
                    <Stat label="PAGE" value={`${Math.round((featured.pages * (featured.progress || 0)) / 100)} / ${featured.pages}`} />
                    <Stat label="PROGRESS" value={`${featured.progress}%`} color={palette.hot} />
                    <Stat label="STARTED" value="MAY 19" />
                    <Stat label="DAYS IN" value="6" />
                  </div>

                  {/* Progress bar */}
                  <div className="mb-7 max-w-md">
                    <div className="h-1 w-full overflow-hidden" style={{ background: palette.surfaceHi }}>
                      <div
                        className="h-full"
                        style={{
                          width: `${featured.progress}%`,
                          background: `linear-gradient(90deg, ${palette.hot}, ${palette.amber})`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Topics as tags */}
                  <div className="flex flex-wrap gap-2 mb-7">
                    {featured.topics.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] tracking-[0.2em] px-2.5 py-1 border"
                        style={{
                          ...mono,
                          borderColor: palette.surfaceHi,
                          color: palette.inkSoft,
                        }}
                      >
                        {t.toUpperCase()}
                      </span>
                    ))}
                  </div>

                  {/* CTAs */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      className="px-6 py-3 tracking-[0.15em] text-sm"
                      style={{ background: palette.ink, color: palette.bg, ...display }}
                    >
                      ▶ LOG PROGRESS
                    </button>
                    <button
                      className="px-6 py-3 tracking-[0.15em] text-sm border"
                      style={{ borderColor: palette.ink, color: palette.ink, ...display }}
                    >
                      ★ RATE WHEN DONE
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="max-w-7xl mx-auto px-5 sm:px-8 pb-16">
          {/* Year-in-review banner */}
          <section className="my-12">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h2
                className="text-3xl sm:text-5xl"
                style={display}
              >
                YEAR IN <span style={{ color: palette.amber }}>REVIEW</span>
              </h2>
              <p style={{ ...mono, color: palette.inkSoft }} className="text-xs tracking-[0.3em]">
                2026 · IN PROGRESS
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: palette.surfaceHi }}>
              {[
                { label: "VOLUMES", value: MOCK_STATS.totalBooks, sub: "TOTAL", color: palette.ink },
                { label: "FINISHED", value: MOCK_STATS.read, sub: "READ", color: palette.amber },
                { label: "PAGES", value: MOCK_STATS.pagesRead.toLocaleString(), sub: "DEVOURED", color: palette.hot },
                { label: "AVG RATING", value: `${MOCK_STATS.avgRating.toFixed(1)}★`, sub: "BIASED HIGH", color: palette.cyan },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-5 sm:p-7"
                  style={{ background: palette.surface }}
                >
                  <p
                    className="text-[10px] tracking-[0.3em]"
                    style={{ ...mono, color: palette.inkSoft }}
                  >
                    {s.label}
                  </p>
                  <p
                    className="text-4xl sm:text-6xl mt-2 leading-none"
                    style={{ ...display, color: s.color }}
                  >
                    {s.value}
                  </p>
                  <p className="text-[10px] mt-2 tracking-[0.25em]" style={{ ...mono, color: palette.inkSoft }}>
                    {s.sub}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Diary feed */}
          <section className="mb-16">
            <div className="flex items-end justify-between gap-3 mb-6">
              <h2 className="text-3xl sm:text-5xl" style={display}>
                READING DIARY
              </h2>
              <Link
                href="/mockups/3/diary"
                className="text-xs tracking-[0.3em] hover:opacity-100"
                style={{ ...mono, color: palette.hot }}
              >
                FULL DIARY →
              </Link>
            </div>

            <div className="space-y-px" style={{ background: palette.surfaceHi }}>
              {[
                { date: "TODAY", label: "PROGRESS", book: featured!, snippet: "Finished Part II. The Grand Inquisitor still floors me.", icon: "▶", color: palette.hot },
                { date: "MAY 12", label: "RATED", book: MOCK_BOOKS[1], snippet: "Eco at his most playful and ferocious. ★★★★★", icon: "★", color: palette.amber },
                { date: "MAY 04", label: "FINISHED", book: MOCK_BOOKS[2], snippet: "MU. Closed the book on Hofstadter — humbled.", icon: "✓", color: palette.cyan },
                { date: "APR 21", label: "STARTED", book: MOCK_BOOKS[4], snippet: "Calvino's cities feel timely again.", icon: "→", color: palette.violet },
              ].map((e, i) => (
                <article
                  key={i}
                  className="grid grid-cols-[60px_60px_1fr_auto] sm:grid-cols-[100px_70px_1fr_auto] gap-3 sm:gap-5 items-center p-3 sm:p-4"
                  style={{ background: palette.surface }}
                >
                  <p className="text-xs tracking-[0.2em]" style={{ ...mono, color: palette.inkSoft }}>
                    {e.date}
                  </p>
                  <img
                    src={e.book.cover}
                    alt=""
                    className="w-12 sm:w-14 aspect-[2/3] object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] tracking-[0.3em] mb-1" style={{ ...mono, color: e.color }}>
                      {e.icon} {e.label}
                    </p>
                    <p className="font-bold leading-tight text-sm sm:text-lg" style={display}>
                      {e.book.title.toUpperCase()}
                    </p>
                    <p className="text-xs sm:text-sm mt-1 hidden sm:block" style={{ color: palette.inkSoft }}>
                      {e.snippet}
                    </p>
                  </div>
                  <span className="text-xs tracking-widest hidden sm:inline" style={{ ...mono, color: palette.inkFaint }}>
                    →
                  </span>
                </article>
              ))}
            </div>
          </section>

          {/* The shelf — poster grid */}
          <section className="mb-16">
            <div className="flex items-end justify-between gap-3 mb-6">
              <h2 className="text-3xl sm:text-5xl" style={display}>
                THE COLLECTION
              </h2>
              <p style={{ ...mono, color: palette.inkSoft }} className="text-xs tracking-[0.3em] mb-1">
                {MOCK_BOOKS.length} POSTERS
              </p>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
              {MOCK_BOOKS.map((b, i) => (
                <Poster b={b} i={i} key={b.id} />
              ))}
            </div>
          </section>

          {/* Pull quote */}
          <section className="my-20 max-w-3xl mx-auto text-center">
            <p
              className="leading-[1.05]"
              style={{ ...display, fontSize: "clamp(2rem, 5vw, 4rem)", color: palette.amber }}
            >
              &ldquo;A book is a dream that you hold in your hand.&rdquo;
            </p>
            <p
              className="text-xs tracking-[0.4em] mt-4"
              style={{ ...mono, color: palette.inkSoft }}
            >
              — NEIL GAIMAN
            </p>
          </section>

          {/* Footer */}
          <footer
            className="pt-8 border-t flex flex-col sm:flex-row gap-3 items-center justify-between"
            style={{ borderColor: palette.surfaceHi }}
          >
            <p className="text-xs tracking-[0.3em]" style={{ ...mono, color: palette.inkSoft }}>
              MOCKUP 03 · REEL · A PRIVATE READING DIARY
            </p>
            <p className="text-xs tracking-[0.3em]" style={{ ...mono, color: palette.inkFaint }}>
              BEBAS NEUE · INTER TIGHT · DM MONO
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.3em]" style={{ color: "#8E8E9A" }}>
        {label}
      </p>
      <p
        className="text-xl mt-0.5 leading-none tabular-nums"
        style={{ color: color || "#F5F5F7", ...display }}
      >
        {value}
      </p>
    </div>
  );
}

function Poster({ b, i }: { b: typeof MOCK_BOOKS[number]; i: number }) {
  const accentByIndex = [
    "#FF3B5C", "#F5C518", "#3DDBD9", "#A78BFA", "#FF8A3B",
  ];
  const accent = accentByIndex[i % accentByIndex.length];
  return (
    <div className="group cursor-pointer">
      <div className="relative aspect-[2/3] overflow-hidden">
        <img
          src={b.cover}
          alt={b.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          style={{
            filter: b.status === "not_read" ? "grayscale(0.4)" : "none",
          }}
        />

        {/* Vignette */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, transparent 50%, rgba(0,0,0,0.85) 100%)",
          }}
        />

        {/* Rating */}
        {b.rating && (
          <div
            className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-bold tracking-wider"
            style={{ ...mono, background: "#F5C518", color: "#0A0A0F" }}
          >
            {b.rating}.0★
          </div>
        )}

        {/* Status tape */}
        {b.status === "reading" && (
          <div
            className="absolute top-2 right-2 px-1.5 py-0.5 text-[9px] tracking-[0.2em]"
            style={{ ...mono, background: "#FF3B5C", color: "#FFF" }}
          >
            READING
          </div>
        )}
        {b.status === "not_read" && (
          <div
            className="absolute top-2 right-2 px-1.5 py-0.5 text-[9px] tracking-[0.2em] border"
            style={{ ...mono, color: "#F5F5F7", borderColor: "#F5F5F7", background: "rgba(0,0,0,0.4)" }}
          >
            QUEUED
          </div>
        )}

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <p
            className="text-[10px] tracking-[0.2em] mb-0.5"
            style={{ ...mono, color: accent }}
          >
            {b.year}
          </p>
          <p
            className="text-sm sm:text-base leading-tight line-clamp-2"
            style={{ ...display, color: "#FFF" }}
          >
            {b.title.toUpperCase()}
          </p>
        </div>

        {/* Hover overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          style={{ background: "rgba(10,10,15,0.85)" }}
        >
          <div className="text-center p-3">
            <p
              className="text-[10px] tracking-[0.3em] mb-2"
              style={{ ...mono, color: accent }}
            >
              VIEW ENTRY
            </p>
            <p className="text-sm font-bold" style={display}>
              {b.author.toUpperCase()}
            </p>
            <p className="text-[10px] mt-1" style={{ color: "#8E8E9A" }}>
              {b.pages} pp
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReelLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <circle cx="14" cy="14" r="12" stroke="#FF3B5C" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="3" fill="#FF3B5C" />
      <circle cx="14" cy="5" r="1.2" fill="#FF3B5C" />
      <circle cx="14" cy="23" r="1.2" fill="#FF3B5C" />
      <circle cx="5" cy="14" r="1.2" fill="#FF3B5C" />
      <circle cx="23" cy="14" r="1.2" fill="#FF3B5C" />
    </svg>
  );
}
