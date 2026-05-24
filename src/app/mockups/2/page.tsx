export const dynamic = "force-static";

import Link from "next/link";
import { MOCK_BOOKS, MOCK_STATS } from "../data";

// -----------------------------------------------------------------------------
// Mockup 2 — "Editorial"
// High-contrast magazine layout. Oversized Playfair Display, narrow text
// columns, generous whitespace, single restrained pink accent. Lists books
// in a tight catalog format with cover thumbnail + full bibliographic line.
// -----------------------------------------------------------------------------

const palette = {
  paper: "#FAF7F2",
  paperWarm: "#F0E8DC",
  ink: "#0A0A0A",
  inkSoft: "#4B4B4B",
  rule: "#1A1A1A",
  accent: "#D74E7D",
  mute: "#9E9E9E",
};

const fontImport = `https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Source+Serif+4:ital,wght@0,300;0,400;0,600&family=JetBrains+Mono:wght@400;500&display=swap`;

export default function MockupEditorial() {
  const reading = MOCK_BOOKS.filter((b) => b.status === "reading");
  const read = MOCK_BOOKS.filter((b) => b.status === "read");

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href={fontImport} />
      <div
        style={{
          background: palette.paper,
          color: palette.ink,
          minHeight: "100vh",
          fontFamily: "'Source Serif 4', Georgia, serif",
        }}
      >
        {/* Masthead */}
        <div className="border-b-2" style={{ borderColor: palette.rule }}>
          <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.3em]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              Vol. IV · No. 12 · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
            <div className="flex items-center gap-6 text-[11px] uppercase tracking-[0.2em]">
              {["Catalog", "Reading", "Notes", "Index"].map((l) => (
                <a key={l} className="hover:opacity-60" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {l}
                </a>
              ))}
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em]" style={{ fontFamily: "'JetBrains Mono', monospace", color: palette.accent }}>
              · The Library ·
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-8 py-16">
          {/* Hero title — massive serif */}
          <header className="mb-20 text-center">
            <p className="text-[11px] uppercase tracking-[0.4em] mb-6" style={{ color: palette.inkSoft, fontFamily: "'JetBrains Mono', monospace" }}>
              A Personal Catalog
            </p>
            <h1
              className="leading-[0.85] tracking-tight font-black"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(4rem, 12vw, 11rem)",
                letterSpacing: "-0.04em",
              }}
            >
              The
              <br />
              <span style={{ fontStyle: "italic", fontWeight: 400 }}>Reading</span>
              <br />
              Room.
            </h1>
            <div className="flex items-center justify-center gap-3 mt-10">
              <span className="h-px w-16" style={{ background: palette.rule }} />
              <p className="text-xs uppercase tracking-[0.3em]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {MOCK_STATS.totalBooks} volumes · {MOCK_STATS.read} finished · {MOCK_STATS.reading} in progress
              </p>
              <span className="h-px w-16" style={{ background: palette.rule }} />
            </div>
          </header>

          {/* Currently reading - editorial spread */}
          {reading[0] && (
            <section className="mb-24 grid grid-cols-1 md:grid-cols-12 gap-10">
              <div className="md:col-span-5">
                <img
                  src={reading[0].cover}
                  alt={reading[0].title}
                  className="w-full"
                  style={{ filter: "grayscale(0.15)" }}
                />
                <p className="mt-3 text-[10px] uppercase tracking-[0.3em]" style={{ fontFamily: "'JetBrains Mono', monospace", color: palette.mute }}>
                  Fig. 01 — In progress
                </p>
              </div>
              <div className="md:col-span-7 md:pt-8">
                <p className="text-[11px] uppercase tracking-[0.3em]" style={{ color: palette.accent, fontFamily: "'JetBrains Mono', monospace" }}>
                  Currently Reading
                </p>
                <h2
                  className="leading-[0.95] mt-3"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
                    fontWeight: 900,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {reading[0].title}.
                </h2>
                <p className="text-2xl italic mt-4" style={{ color: palette.inkSoft, fontFamily: "'Playfair Display', serif" }}>
                  by {reading[0].author}
                </p>
                <div className="mt-8 pt-6 border-t" style={{ borderColor: palette.rule }}>
                  <div className="grid grid-cols-3 gap-6 text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <Meta label="Published" value={String(reading[0].year)} />
                    <Meta label="Pages" value={`${reading[0].pages}`} />
                    <Meta label="Progress" value={`${reading[0].progress}%`} accent={palette.accent} />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Pull quote */}
          <section className="my-24 max-w-3xl mx-auto text-center">
            <p
              className="text-3xl md:text-5xl leading-tight"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: "italic",
                fontWeight: 400,
              }}
            >
              &ldquo;A library is not a luxury but one of the necessities of life.&rdquo;
            </p>
            <p className="text-xs uppercase tracking-[0.3em] mt-6" style={{ fontFamily: "'JetBrains Mono', monospace", color: palette.mute }}>
              — Henry Ward Beecher
            </p>
          </section>

          {/* Catalog list */}
          <section>
            <div className="flex items-baseline justify-between mb-10 pb-3 border-b-2" style={{ borderColor: palette.rule }}>
              <h3
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "2.5rem",
                  fontWeight: 700,
                }}
              >
                The Catalog
              </h3>
              <p className="text-[11px] uppercase tracking-[0.3em]" style={{ fontFamily: "'JetBrains Mono', monospace", color: palette.mute }}>
                Sorted by recent
              </p>
            </div>

            <ul>
              {MOCK_BOOKS.map((b, i) => (
                <li
                  key={b.id}
                  className="grid grid-cols-1 md:grid-cols-[60px_80px_1fr_auto] gap-6 items-center py-6 border-b group cursor-pointer hover:bg-black/[0.02]"
                  style={{ borderColor: palette.rule + "20" }}
                >
                  <span
                    className="text-sm tabular-nums"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: palette.mute,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <img
                    src={b.cover}
                    alt={b.title}
                    className="w-16 aspect-[2/3] object-cover"
                  />
                  <div className="min-w-0">
                    <p
                      className="text-2xl leading-tight"
                      style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
                    >
                      {b.title}
                      <span style={{ color: palette.accent }}>.</span>
                    </p>
                    <p className="italic text-base mt-0.5" style={{ color: palette.inkSoft }}>
                      {b.author} · {b.year} · {b.pages} pp.
                    </p>
                    <div className="flex gap-2 mt-2">
                      {b.topics.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] uppercase tracking-[0.2em]"
                          style={{ fontFamily: "'JetBrains Mono', monospace", color: palette.mute }}
                        >
                          · {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={b.status} accent={palette.accent} ink={palette.ink} mute={palette.mute} />
                    {b.rating && (
                      <p className="text-sm mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>
                        {"★".repeat(b.rating)}
                        <span style={{ color: palette.mute }}>{"★".repeat(5 - b.rating)}</span>
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Colophon */}
          <footer className="mt-24 pt-10 border-t-2 text-center" style={{ borderColor: palette.rule }}>
            <p
              className="text-xs uppercase tracking-[0.3em]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: palette.mute }}
            >
              Mockup 02 · The Editorial · Set in Playfair Display & Source Serif 4
            </p>
            <p
              className="mt-3"
              style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic" }}
            >
              fin.
            </p>
          </footer>
        </div>

        {/* Back */}
        <Link
          href="/mockups"
          className="fixed top-4 right-4 px-3 py-2 text-[10px] uppercase tracking-[0.25em] border"
          style={{
            borderColor: palette.rule,
            color: palette.ink,
            background: palette.paper,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          ← Mockups
        </Link>
      </div>
    </>
  );
}

function Meta({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "#9E9E9E" }}>
        {label}
      </p>
      <p className="text-xl mt-1 tabular-nums" style={{ color: accent || "inherit" }}>
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
  accent,
  ink,
  mute,
}: {
  status: string;
  accent: string;
  ink: string;
  mute: string;
}) {
  const label = status === "read" ? "Read" : status === "reading" ? "Reading" : "Queued";
  const color = status === "reading" ? accent : status === "read" ? ink : mute;
  return (
    <span
      className="text-[10px] uppercase tracking-[0.3em]"
      style={{ fontFamily: "'JetBrains Mono', monospace", color }}
    >
      [{label}]
    </span>
  );
}
