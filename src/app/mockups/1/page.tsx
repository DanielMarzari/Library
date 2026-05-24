export const dynamic = "force-static";

import Link from "next/link";
import { MOCK_BOOKS, MOCK_STATS } from "../data";

// -----------------------------------------------------------------------------
// Mockup 1 — "Warm Stacks"
// Cozy old-library aesthetic: parchment background, walnut shelves, burgundy
// accents, serif typography. Books rendered on wooden shelves with shadow.
// -----------------------------------------------------------------------------

const palette = {
  paper: "#F4EBDC",
  paperDeep: "#E8D9BD",
  ink: "#2A1810",
  inkSoft: "#5A4634",
  walnut: "#3A2418",
  walnutLight: "#6E4A2E",
  burgundy: "#7B2C2C",
  brass: "#C9A86A",
  rule: "#C3A57E",
};

const fontImport = `https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Crimson+Pro:ital,wght@0,400;0,500;0,600;1,400&display=swap`;

export default function MockupWarmStacks() {
  const reading = MOCK_BOOKS.filter((b) => b.status === "reading");
  const read = MOCK_BOOKS.filter((b) => b.status === "read");
  const queue = MOCK_BOOKS.filter((b) => b.status === "not_read");

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href={fontImport} />
      <div
        style={{
          background: `radial-gradient(at top, ${palette.paper}, ${palette.paperDeep})`,
          color: palette.ink,
          minHeight: "100vh",
          fontFamily: "'Crimson Pro', Georgia, serif",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-10">
          {/* Header */}
          <header className="flex items-center justify-between mb-10 pb-8 border-b" style={{ borderColor: palette.rule }}>
            <div className="flex items-center gap-4">
              <Crest color={palette.burgundy} brass={palette.brass} />
              <div>
                <p
                  className="text-[10px] uppercase tracking-[0.35em]"
                  style={{ color: palette.inkSoft, fontFamily: "'Cormorant Garamond', serif" }}
                >
                  Personal Collection
                </p>
                <h1
                  className="text-5xl font-semibold leading-none mt-1"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    color: palette.walnut,
                  }}
                >
                  The Library
                </h1>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-7 text-sm">
              {["Stacks", "Reading", "Borrowed", "Index"].map((l) => (
                <a key={l} className="hover:opacity-100 opacity-80 underline-offset-4 hover:underline" style={{ color: palette.walnut }}>
                  {l}
                </a>
              ))}
              <span
                className="px-3 py-1.5 rounded-sm text-xs uppercase tracking-widest border"
                style={{
                  borderColor: palette.walnut,
                  color: palette.walnut,
                  fontFamily: "'Cormorant Garamond', serif",
                  letterSpacing: "0.2em",
                }}
              >
                Catalogue
              </span>
            </nav>
          </header>

          {/* Stats row */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {[
              { label: "Volumes", value: MOCK_STATS.totalBooks, sub: "in collection" },
              { label: "Pages Read", value: MOCK_STATS.pagesRead.toLocaleString(), sub: "this year" },
              { label: "Currently", value: MOCK_STATS.reading, sub: "in progress" },
              { label: "Rating Mean", value: MOCK_STATS.avgRating.toFixed(2), sub: "★ avg" },
            ].map((s) => (
              <div
                key={s.label}
                className="px-5 py-4 border-l-4"
                style={{ borderColor: palette.burgundy }}
              >
                <p
                  className="text-[10px] uppercase tracking-[0.3em]"
                  style={{ color: palette.inkSoft, fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {s.label}
                </p>
                <p
                  className="text-4xl font-medium mt-1"
                  style={{ fontFamily: "'Cormorant Garamond', serif", color: palette.walnut }}
                >
                  {s.value}
                </p>
                <p className="text-sm italic" style={{ color: palette.inkSoft }}>
                  {s.sub}
                </p>
              </div>
            ))}
          </section>

          {/* Currently reading — featured */}
          {reading[0] && (
            <section className="mb-12 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 items-center p-6 rounded-sm" style={{ background: `${palette.walnut}10`, border: `1px solid ${palette.rule}` }}>
              <img
                src={reading[0].cover}
                alt={reading[0].title}
                className="w-full aspect-[2/3] object-cover shadow-2xl"
                style={{ boxShadow: `0 20px 40px -10px ${palette.walnut}aa` }}
              />
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: palette.burgundy }}>
                  Currently in Hand
                </p>
                <h2
                  className="text-4xl font-semibold leading-tight"
                  style={{ fontFamily: "'Cormorant Garamond', serif", color: palette.walnut }}
                >
                  {reading[0].title}
                </h2>
                <p className="italic text-lg mt-1" style={{ color: palette.inkSoft }}>
                  by {reading[0].author} · {reading[0].year}
                </p>
                <div className="mt-5">
                  <div className="flex items-center justify-between text-sm mb-1" style={{ color: palette.inkSoft }}>
                    <span>Progress</span>
                    <span>{reading[0].progress}% · pg {Math.round((reading[0].pages * (reading[0].progress || 0)) / 100)} of {reading[0].pages}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: palette.rule }}>
                    <div
                      className="h-full"
                      style={{ width: `${reading[0].progress}%`, background: palette.burgundy }}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Shelves */}
          {[
            { title: "Currently Reading", books: reading.slice(1) },
            { title: "Recently Finished", books: read },
            { title: "On the Queue", books: queue },
          ]
            .filter((s) => s.books.length > 0)
            .map((shelf) => (
              <section key={shelf.title} className="mb-14">
                <div className="flex items-baseline justify-between mb-5">
                  <h3
                    className="text-2xl font-semibold"
                    style={{ fontFamily: "'Cormorant Garamond', serif", color: palette.walnut }}
                  >
                    {shelf.title}
                  </h3>
                  <span className="text-sm italic" style={{ color: palette.inkSoft }}>
                    {shelf.books.length} volume{shelf.books.length === 1 ? "" : "s"}
                  </span>
                </div>

                {/* Wooden shelf */}
                <div className="relative">
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-x-4 gap-y-1 px-3 pt-2">
                    {shelf.books.map((b) => (
                      <div key={b.id} className="group cursor-pointer">
                        <div className="relative">
                          <img
                            src={b.cover}
                            alt={b.title}
                            className="w-full aspect-[2/3] object-cover transition-transform group-hover:-translate-y-1"
                            style={{
                              boxShadow: `4px 4px 0 ${palette.walnut}44, 8px 8px 16px -4px ${palette.walnut}55`,
                            }}
                          />
                          {/* Spine shadow */}
                          <div className="absolute inset-y-0 left-0 w-[3px]" style={{ background: "rgba(0,0,0,0.25)" }} />
                          {b.rating && (
                            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[10px]" style={{ background: palette.brass, color: palette.walnut }}>
                              {b.rating}★
                            </div>
                          )}
                        </div>
                        <p className="text-sm mt-2 leading-tight line-clamp-2" style={{ color: palette.ink, fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>
                          {b.title}
                        </p>
                        <p className="text-xs italic line-clamp-1" style={{ color: palette.inkSoft }}>
                          {b.author}
                        </p>
                      </div>
                    ))}
                  </div>
                  {/* Wooden shelf plank */}
                  <div
                    className="h-3 mt-3 rounded-sm"
                    style={{
                      background: `linear-gradient(180deg, ${palette.walnutLight} 0%, ${palette.walnut} 100%)`,
                      boxShadow: `0 4px 8px ${palette.walnut}55`,
                    }}
                  />
                  <div
                    className="h-1 mx-1"
                    style={{ background: `${palette.walnut}55` }}
                  />
                </div>
              </section>
            ))}

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t text-center text-sm italic" style={{ borderColor: palette.rule, color: palette.inkSoft }}>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}>
              &ldquo;A reader lives a thousand lives before he dies.&rdquo;
            </p>
            <p className="mt-1">— Mockup 1 · Warm Stacks</p>
          </footer>
        </div>

        {/* Back button */}
        <Link
          href="/mockups"
          className="fixed top-4 right-4 px-3 py-2 text-xs uppercase tracking-widest border rounded-sm"
          style={{ borderColor: palette.walnut, color: palette.walnut, background: palette.paper }}
        >
          ← All Mockups
        </Link>
      </div>
    </>
  );
}

function Crest({ color, brass }: { color: string; brass: string }) {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="6" y="4" width="36" height="40" rx="2" fill={color} />
      <rect x="10" y="8" width="28" height="32" stroke={brass} strokeWidth="1" fill="none" />
      <path d="M16 14 L32 14 M16 20 L32 20 M16 26 L24 26" stroke={brass} strokeWidth="1.5" />
      <circle cx="24" cy="34" r="3" stroke={brass} strokeWidth="1" fill="none" />
    </svg>
  );
}
