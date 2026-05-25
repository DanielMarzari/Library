export const dynamic = "force-static";

import Link from "next/link";
import { MOCK_BOOKS } from "../../data";
import { ReelShell, reel, display, body, mono } from "../theme";

// Mockup 3 — Reel · Reading diary timeline
// Full Letterboxd-style diary feed: month-grouped entries, each with the
// book's cover, action, optional star rating, and freeform note. Designed
// to read like a year's log.

type Action = "STARTED" | "PROGRESS" | "RATED" | "FINISHED" | "LENT" | "DNF";

interface Entry {
  date: string; // ISO-ish for display
  month: string;
  book: typeof MOCK_BOOKS[number];
  action: Action;
  note?: string;
  pages?: number;
  rating?: number;
  color: string;
  icon: string;
}

const ENTRIES: Entry[] = [
  { date: "May 23", month: "MAY 2026", book: MOCK_BOOKS[0], action: "PROGRESS", note: "Part II — the Grand Inquisitor still floors me.", pages: 24, color: reel.hot, icon: "▶" },
  { date: "May 21", month: "MAY 2026", book: MOCK_BOOKS[0], action: "PROGRESS", note: "Slow start tonight. Tea, couch, the usual.", pages: 12, color: reel.hot, icon: "▶" },
  { date: "May 19", month: "MAY 2026", book: MOCK_BOOKS[0], action: "STARTED", note: "Picked it back up after years. Different reader now.", color: reel.violet, icon: "→" },
  { date: "May 14", month: "MAY 2026", book: MOCK_BOOKS[4], action: "FINISHED", note: "Some of these cities I want to go back to.", rating: 5, color: reel.cyan, icon: "✓" },
  { date: "May 12", month: "MAY 2026", book: MOCK_BOOKS[1], action: "RATED", note: "Eco at his most playful and ferocious. ★★★★★", rating: 5, color: reel.amber, icon: "★" },
  { date: "May 04", month: "MAY 2026", book: MOCK_BOOKS[2], action: "FINISHED", note: "MU. Closed the book on Hofstadter — humbled.", rating: 5, color: reel.cyan, icon: "✓" },
  { date: "Apr 28", month: "APRIL 2026", book: MOCK_BOOKS[6], action: "RATED", note: "I cried twice. Morrison's prose is unsparing.", rating: 5, color: reel.amber, icon: "★" },
  { date: "Apr 21", month: "APRIL 2026", book: MOCK_BOOKS[4], action: "STARTED", note: "Calvino's cities feel timely again.", color: reel.violet, icon: "→" },
  { date: "Apr 11", month: "APRIL 2026", book: MOCK_BOOKS[9], action: "FINISHED", note: "Generational and dizzying. I miss Macondo already.", rating: 5, color: reel.cyan, icon: "✓" },
  { date: "Mar 30", month: "MARCH 2026", book: MOCK_BOOKS[8], action: "FINISHED", note: "Took six weeks. Worth every one.", rating: 4, color: reel.cyan, icon: "✓" },
  { date: "Mar 14", month: "MARCH 2026", book: MOCK_BOOKS[3], action: "FINISHED", note: "Nabokov at his trickiest. Re-read the index twice.", rating: 4, color: reel.cyan, icon: "✓" },
];

const monthOrder = Array.from(new Set(ENTRIES.map((e) => e.month)));
const grouped = monthOrder.map((m) => ({
  month: m,
  entries: ENTRIES.filter((e) => e.month === m),
}));

// Stats per month for the side rail
function monthStats(month: string) {
  const list = ENTRIES.filter((e) => e.month === month);
  return {
    entries: list.length,
    finished: list.filter((e) => e.action === "FINISHED").length,
    started: list.filter((e) => e.action === "STARTED").length,
    pages: list.reduce((s, e) => s + (e.pages || 0), 0),
  };
}

export default function ReelDiary() {
  return (
    <ReelShell current="diary">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-10 pb-24 md:pb-16">
        {/* Header */}
        <header className="mb-10 sm:mb-14">
          <p
            className="text-xs mb-3 tracking-[0.4em]"
            style={{ ...mono, color: reel.amber }}
          >
            CHRONOLOGICAL · 2026 · {ENTRIES.length} ENTRIES
          </p>
          <h1
            className="leading-[0.85] mb-4"
            style={{
              ...display,
              fontSize: "clamp(3rem, 10vw, 8rem)",
            }}
          >
            THE
            <br />
            <span style={{ color: reel.hot }}>DIARY</span>
          </h1>
          <p
            className="text-base sm:text-lg max-w-2xl"
            style={{ color: reel.inkSoft, ...body }}
          >
            Every book event, in order. Mark progress, log thoughts, drop a
            star. The full ledger of your reading life.
          </p>

          {/* Filter bar */}
          <div
            className="mt-7 flex flex-wrap items-center gap-4 pb-4 border-b"
            style={{ borderColor: reel.surfaceHi }}
          >
            <span
              className="text-[10px] tracking-[0.3em]"
              style={{ ...mono, color: reel.inkSoft }}
            >
              FILTER
            </span>
            {[
              { label: "ALL", count: ENTRIES.length, active: true },
              { label: "★ RATED", count: ENTRIES.filter((e) => e.action === "RATED" || e.rating).length },
              { label: "✓ FINISHED", count: ENTRIES.filter((e) => e.action === "FINISHED").length },
              { label: "→ STARTED", count: ENTRIES.filter((e) => e.action === "STARTED").length },
              { label: "▶ PROGRESS", count: ENTRIES.filter((e) => e.action === "PROGRESS").length },
            ].map((f) => (
              <button
                key={f.label}
                className="text-[11px] tracking-[0.2em] px-2.5 py-1 border"
                style={{
                  ...mono,
                  borderColor: f.active ? reel.hot : reel.surfaceHi,
                  color: f.active ? reel.hot : reel.inkSoft,
                  background: f.active ? `${reel.hot}15` : "transparent",
                }}
              >
                {f.label} <span style={{ opacity: 0.6 }}>· {f.count}</span>
              </button>
            ))}
          </div>
        </header>

        {/* Two-column layout: timeline + monthly summary rail */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-10">
          {/* TIMELINE */}
          <div>
            {grouped.map((g) => (
              <section key={g.month} className="mb-14 last:mb-0">
                {/* Month header — film-strip style */}
                <div
                  className="flex items-baseline justify-between gap-3 mb-5 pb-3 border-b-2"
                  style={{ borderColor: reel.ink }}
                >
                  <h2 className="text-3xl sm:text-5xl leading-none" style={display}>
                    {g.month}
                  </h2>
                  <p
                    className="text-xs tracking-[0.3em] tabular-nums"
                    style={{ ...mono, color: reel.inkSoft }}
                  >
                    {g.entries.length} ENTRIES
                  </p>
                </div>

                <ul className="space-y-px" style={{ background: reel.surfaceHi }}>
                  {g.entries.map((e, i) => (
                    <li key={i}>
                      <Link
                        href="/mockups/3/book"
                        className="grid grid-cols-[60px_60px_1fr] sm:grid-cols-[80px_80px_1fr_auto] gap-3 sm:gap-5 p-4 sm:p-5 hover:opacity-90 transition-opacity"
                        style={{ background: reel.surface }}
                      >
                        {/* Date */}
                        <p
                          className="text-xs tracking-[0.2em] self-center"
                          style={{ ...mono, color: reel.inkSoft }}
                        >
                          {e.date.toUpperCase()}
                        </p>

                        {/* Cover */}
                        <img
                          src={e.book.cover}
                          alt=""
                          className="w-14 aspect-[2/3] object-cover"
                        />

                        {/* Content */}
                        <div className="min-w-0">
                          <p
                            className="text-[10px] tracking-[0.3em] mb-1.5"
                            style={{ ...mono, color: e.color }}
                          >
                            {e.icon} {e.action}
                            {e.pages && (
                              <span style={{ color: reel.inkSoft }}>
                                {" · "}
                                {e.pages} PP
                              </span>
                            )}
                            {e.rating && (
                              <span style={{ color: reel.amber }}>
                                {" · "}
                                {"★".repeat(e.rating)}
                              </span>
                            )}
                          </p>
                          <p
                            className="text-sm sm:text-lg leading-tight"
                            style={display}
                          >
                            {e.book.title.toUpperCase()}
                          </p>
                          <p
                            className="text-xs mt-0.5"
                            style={{ ...body, color: reel.inkSoft }}
                          >
                            {e.book.author} · {e.book.year}
                          </p>
                          {e.note && (
                            <p
                              className="text-xs sm:text-sm mt-2 leading-snug italic"
                              style={{ ...body, color: reel.ink, opacity: 0.85 }}
                            >
                              &ldquo;{e.note}&rdquo;
                            </p>
                          )}
                        </div>

                        {/* Right meta */}
                        <span
                          className="text-xs tracking-widest hidden sm:inline self-center"
                          style={{ ...mono, color: reel.inkFaint }}
                        >
                          #{String(i + 1).padStart(3, "0")}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {/* Monthly summary rail (desktop only) */}
          <aside className="hidden md:block">
            <div className="sticky top-24 space-y-px" style={{ background: reel.surfaceHi }}>
              <div
                className="p-4"
                style={{ background: reel.surfaceTop }}
              >
                <p
                  className="text-[10px] tracking-[0.3em]"
                  style={{ ...mono, color: reel.amber }}
                >
                  AT A GLANCE
                </p>
              </div>
              {grouped.map((g) => {
                const s = monthStats(g.month);
                return (
                  <div
                    key={g.month}
                    className="p-4"
                    style={{ background: reel.surface }}
                  >
                    <p
                      className="text-xs tracking-[0.3em] mb-2"
                      style={{ ...mono, color: reel.inkSoft }}
                    >
                      {g.month}
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <RailStat label="FIN." value={s.finished} color={reel.cyan} />
                      <RailStat label="NEW" value={s.started} color={reel.violet} />
                      <RailStat label="PP" value={s.pages} color={reel.hot} />
                    </div>
                  </div>
                );
              })}

              <div
                className="p-4"
                style={{ background: reel.surfaceTop }}
              >
                <p
                  className="text-[10px] tracking-[0.3em] mb-2"
                  style={{ ...mono, color: reel.amber }}
                >
                  YEAR TOTAL
                </p>
                <p
                  className="text-4xl leading-none"
                  style={{ ...display, color: reel.amber }}
                >
                  {MOCK_BOOKS.filter((b) => b.status === "read").length}
                  <span
                    className="text-base ml-2"
                    style={{ ...mono, color: reel.inkSoft }}
                  >
                    READ
                  </span>
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </ReelShell>
  );
}

function RailStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <p className="text-[9px] tracking-[0.25em]" style={{ ...mono, color: reel.inkSoft }}>
        {label}
      </p>
      <p
        className="text-xl leading-none tabular-nums mt-0.5"
        style={{ ...display, color }}
      >
        {value}
      </p>
    </div>
  );
}
