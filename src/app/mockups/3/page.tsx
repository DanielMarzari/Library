export const dynamic = "force-static";

import Link from "next/link";
import { MOCK_BOOKS, MOCK_STATS } from "../data";

// -----------------------------------------------------------------------------
// Mockup 3 — "Bento Pop"
// Bright modern dashboard. Mixed-size bento tiles, color-coded by status,
// playful palette, Space Grotesk display + Inter UI. Big covers floating in
// pastel cells alongside stats widgets.
// -----------------------------------------------------------------------------

const palette = {
  bg: "#FFF9EE",
  ink: "#0B0B16",
  inkSoft: "#5C5C70",
  yellow: "#FFD166",
  green: "#06D6A0",
  pink: "#EF476F",
  blue: "#118AB2",
  lilac: "#C8B6FF",
  card: "#FFFFFF",
};

const fontImport = `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap`;

export default function MockupBentoPop() {
  const reading = MOCK_BOOKS.filter((b) => b.status === "reading");
  const featured = reading[0];

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href={fontImport} />
      <div
        style={{
          background: `radial-gradient(at 0% 0%, ${palette.yellow}66 0%, transparent 40%), radial-gradient(at 100% 0%, ${palette.lilac}66 0%, transparent 50%), radial-gradient(at 50% 100%, ${palette.green}33 0%, transparent 50%), ${palette.bg}`,
          minHeight: "100vh",
          color: palette.ink,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div className="max-w-7xl mx-auto px-5 py-8">
          {/* Top bar */}
          <header className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full grid place-items-center text-white font-bold"
                style={{ background: palette.ink, fontFamily: "'Space Grotesk', sans-serif" }}
              >
                L
              </div>
              <p
                className="text-2xl font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                library
                <span style={{ color: palette.pink }}>.</span>
              </p>
            </div>
            <nav className="hidden md:flex items-center gap-1 p-1 rounded-full" style={{ background: palette.card, border: `1px solid ${palette.ink}10` }}>
              {["Shelf", "Reading", "Authors", "Stats"].map((l, i) => (
                <a
                  key={l}
                  className="px-4 py-2 text-sm font-medium rounded-full transition-colors cursor-pointer hover:bg-black/5"
                  style={{
                    background: i === 0 ? palette.ink : "transparent",
                    color: i === 0 ? palette.bg : palette.ink,
                  }}
                >
                  {l}
                </a>
              ))}
            </nav>
            <button
              className="px-4 py-2 rounded-full text-sm font-semibold text-white"
              style={{ background: palette.pink, fontFamily: "'Space Grotesk', sans-serif" }}
            >
              + Add Book
            </button>
          </header>

          {/* Hero greeting */}
          <div className="mb-8">
            <h1
              className="text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Hi, Dan.{" "}
              <span style={{ color: palette.inkSoft }}>You&apos;ve read</span>{" "}
              <span
                style={{
                  background: `linear-gradient(120deg, ${palette.pink}, ${palette.yellow})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {MOCK_STATS.pagesRead.toLocaleString()} pages
              </span>{" "}
              <span style={{ color: palette.inkSoft }}>this year.</span>
            </h1>
          </div>

          {/* BENTO GRID */}
          <div className="grid grid-cols-12 gap-4 auto-rows-[140px]">
            {/* Currently reading hero — 6 cols × 4 rows */}
            {featured && (
              <div
                className="col-span-12 md:col-span-6 row-span-4 rounded-3xl p-6 relative overflow-hidden"
                style={{ background: palette.ink, color: palette.bg }}
              >
                <div
                  className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full opacity-30"
                  style={{ background: palette.pink, filter: "blur(40px)" }}
                />
                <div
                  className="absolute -left-12 -top-12 w-48 h-48 rounded-full opacity-30"
                  style={{ background: palette.yellow, filter: "blur(30px)" }}
                />
                <div className="relative h-full flex gap-5">
                  <img src={featured.cover} alt={featured.title} className="w-32 aspect-[2/3] object-cover rounded-xl shadow-2xl" />
                  <div className="flex-1 flex flex-col">
                    <p className="text-xs uppercase tracking-wider opacity-60 mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Now reading
                    </p>
                    <p className="text-3xl font-bold leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {featured.title}
                    </p>
                    <p className="opacity-70 mt-1">{featured.author}</p>
                    <div className="mt-auto">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Page {Math.round((featured.pages * (featured.progress || 0)) / 100)} of {featured.pages}</span>
                        <span className="font-bold" style={{ color: palette.yellow }}>{featured.progress}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${featured.progress}%`, background: `linear-gradient(90deg, ${palette.yellow}, ${palette.pink})` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stats trio */}
            <BentoStat color={palette.green} label="Books read" value={MOCK_STATS.read} sub="↑ 3 from last yr" />
            <BentoStat color={palette.yellow} label="In progress" value={MOCK_STATS.reading} sub="2 close to done" inkOnLight />
            <BentoStat color={palette.lilac} label="Avg. rating" value={MOCK_STATS.avgRating.toFixed(1)} sub="★★★★☆ overall" inkOnLight />

            {/* Goal tile */}
            <div className="col-span-6 md:col-span-3 row-span-2 rounded-3xl p-5 flex flex-col" style={{ background: palette.card, border: `1px solid ${palette.ink}10` }}>
              <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: palette.inkSoft, fontFamily: "'Space Grotesk', sans-serif" }}>
                Goal &apos;26
              </p>
              <p className="text-3xl font-bold mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {MOCK_STATS.read}/24
              </p>
              <div className="h-2 rounded-full overflow-hidden mt-3" style={{ background: palette.ink + "10" }}>
                <div className="h-full rounded-full" style={{ width: `${(MOCK_STATS.read / 24) * 100}%`, background: palette.pink }} />
              </div>
              <p className="text-xs mt-2" style={{ color: palette.inkSoft }}>On pace · 33% there</p>
            </div>

            {/* Up next pile */}
            <div className="col-span-6 md:col-span-3 row-span-2 rounded-3xl p-5" style={{ background: palette.card, border: `1px solid ${palette.ink}10` }}>
              <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: palette.inkSoft, fontFamily: "'Space Grotesk', sans-serif" }}>
                Up next
              </p>
              <div className="flex gap-1.5">
                {MOCK_BOOKS.filter((b) => b.status === "not_read").slice(0, 4).map((b, i) => (
                  <img
                    key={b.id}
                    src={b.cover}
                    alt={b.title}
                    className="w-12 aspect-[2/3] object-cover rounded-md shadow-md"
                    style={{ transform: `rotate(${(i - 1.5) * 4}deg)`, marginLeft: i === 0 ? 0 : "-12px" }}
                  />
                ))}
              </div>
              <p className="text-xs mt-3" style={{ color: palette.inkSoft }}>
                {MOCK_BOOKS.filter((b) => b.status === "not_read").length} on the queue
              </p>
            </div>

            {/* Recently read — wide row of covers */}
            <div className="col-span-12 row-span-3 rounded-3xl p-6" style={{ background: palette.card, border: `1px solid ${palette.ink}10` }}>
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Recently finished
                </h3>
                <a className="text-sm font-medium cursor-pointer" style={{ color: palette.pink }}>
                  See all →
                </a>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {MOCK_BOOKS.filter((b) => b.status === "read").slice(0, 8).map((b) => (
                  <div key={b.id} className="group cursor-pointer">
                    <div className="relative">
                      <img src={b.cover} alt={b.title} className="w-full aspect-[2/3] object-cover rounded-xl shadow-lg group-hover:scale-105 transition-transform" />
                      {b.rating === 5 && (
                        <div className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full grid place-items-center text-xs font-bold" style={{ background: palette.yellow }}>
                          ★
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-semibold mt-2 line-clamp-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {b.title}
                    </p>
                    <p className="text-[10px]" style={{ color: palette.inkSoft }}>
                      {b.author}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tag cloud */}
            <div className="col-span-12 md:col-span-6 row-span-2 rounded-3xl p-6" style={{ background: palette.green, color: palette.ink }}>
              <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Your interests
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(MOCK_BOOKS.flatMap((b) => b.topics))).map((t, i) => (
                  <span
                    key={t}
                    className="px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{
                      background: i % 2 === 0 ? palette.ink : palette.card,
                      color: i % 2 === 0 ? palette.bg : palette.ink,
                      fontSize: `${0.85 + (i % 3) * 0.1}rem`,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Achievement / streak */}
            <div className="col-span-6 md:col-span-3 row-span-2 rounded-3xl p-5 flex flex-col justify-between" style={{ background: palette.pink, color: "#FFF" }}>
              <p className="text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Streak
              </p>
              <div>
                <p className="text-5xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  12
                </p>
                <p className="text-sm opacity-90">days in a row 🔥</p>
              </div>
            </div>

            {/* Random pick */}
            <div className="col-span-6 md:col-span-3 row-span-2 rounded-3xl p-5" style={{ background: palette.lilac, color: palette.ink }}>
              <p className="text-xs uppercase tracking-wider font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Surprise me
              </p>
              <p className="text-lg font-bold mt-2 leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Pick one from your queue
              </p>
              <button
                className="mt-3 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: palette.ink, color: palette.bg }}
              >
                Roll →
              </button>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-10 text-center text-xs" style={{ color: palette.inkSoft }}>
            Mockup 3 · Bento Pop · Space Grotesk + Inter
          </footer>
        </div>

        {/* Back */}
        <Link
          href="/mockups"
          className="fixed top-4 right-4 px-3 py-2 rounded-full text-xs font-medium shadow"
          style={{ background: palette.card, color: palette.ink, border: `1px solid ${palette.ink}20`, fontFamily: "'Space Grotesk', sans-serif" }}
        >
          ← Mockups
        </Link>
      </div>
    </>
  );
}

function BentoStat({
  color,
  label,
  value,
  sub,
  inkOnLight,
}: {
  color: string;
  label: string;
  value: string | number;
  sub: string;
  inkOnLight?: boolean;
}) {
  const text = inkOnLight ? "#0B0B16" : "#FFFFFF";
  return (
    <div
      className="col-span-6 md:col-span-2 row-span-2 rounded-3xl p-5 flex flex-col justify-between"
      style={{ background: color, color: text }}
    >
      <p className="text-xs uppercase tracking-wider font-semibold opacity-90" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        {label}
      </p>
      <div>
        <p className="text-4xl font-bold leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {value}
        </p>
        <p className="text-xs mt-1 opacity-80">{sub}</p>
      </div>
    </div>
  );
}
