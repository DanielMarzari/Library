export const dynamic = "force-static";

import Link from "next/link";
import { MOCK_BOOKS } from "../../data";
import { ReelShell, reel, display, body, mono } from "../theme";

// Mockup 3 — Reel · Single book detail
// Letterboxd-style film page applied to a book. Hero with cover-as-backdrop,
// stat strip, big-text user review, similar books rail, and an entries log.

export default function ReelBook() {
  const b = MOCK_BOOKS.find((x) => x.status === "read" && x.rating === 5) || MOCK_BOOKS[1];
  const similar = MOCK_BOOKS.filter((x) => x.id !== b.id).slice(0, 6);

  const entries = [
    { type: "FIRST READ", date: "OCT 12, 2018", note: "Found it at the Strand. Stayed up til 3am the first night.", color: reel.amber },
    { type: "RE-READ", date: "JUN 03, 2022", note: "Better this time. Catching things I missed.", color: reel.cyan },
    { type: "LENT TO", date: "FEB 18, 2024", note: "Lent to Sarah. Her face when she finished was worth it.", color: reel.violet },
  ];

  return (
    <ReelShell current="book" showHeaderBg={false}>
      {/* HERO with cover-as-backdrop */}
      <section className="relative overflow-hidden" style={{ minHeight: "85vh" }}>
        <img
          src={b.cover}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: "blur(70px) saturate(1.3)",
            opacity: 0.5,
            transform: "scale(1.2)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${reel.bg}00 0%, ${reel.bg}50 30%, ${reel.bg}e0 75%, ${reel.bg} 100%)`,
          }}
        />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-14 pb-12 sm:pb-16 sm:pt-20">
          <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8 items-end" style={{ minHeight: "60vh" }}>
            <div className="relative">
              <img
                src={b.cover}
                alt={b.title}
                className="w-52 sm:w-72 aspect-[2/3] object-cover mx-auto md:mx-0"
                style={{
                  boxShadow: "0 30px 60px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)",
                }}
              />
              <div
                className="absolute -top-3 -left-3 px-3 py-1 text-xs font-bold tracking-wider"
                style={{ background: reel.amber, color: reel.bg, ...display }}
              >
                ★★★★★ FAVORITE
              </div>
            </div>

            <div>
              <p
                className="text-xs mb-4 tracking-[0.4em]"
                style={{ ...mono, color: reel.inkSoft }}
              >
                ENTRY · {b.year} · {b.pages} PP
              </p>
              <h1
                className="leading-[0.85] mb-3"
                style={{
                  ...display,
                  fontSize: "clamp(2.5rem, 8vw, 7rem)",
                }}
              >
                {b.title.toUpperCase()}
              </h1>
              <p
                className="text-lg sm:text-2xl mb-6"
                style={{ color: reel.inkSoft, ...body }}
              >
                <span style={{ color: reel.ink }}>{b.author}</span> · {b.year}
              </p>

              <div className="flex flex-wrap gap-x-8 gap-y-3 mb-7" style={mono}>
                <StatBlock label="RATING" value={`${b.rating}.0`} color={reel.amber} />
                <StatBlock label="READS" value="2×" />
                <StatBlock label="LENT" value="1×" color={reel.violet} />
                <StatBlock label="FIRST" value="OCT '18" />
                <StatBlock label="LAST" value="JUN '22" />
              </div>

              <div className="flex flex-wrap gap-2 mb-7">
                {b.topics.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] tracking-[0.2em] px-2.5 py-1 border"
                    style={{
                      ...mono,
                      borderColor: reel.surfaceHi,
                      color: reel.inkSoft,
                    }}
                  >
                    {t.toUpperCase()}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  className="px-6 py-3 tracking-[0.15em] text-sm"
                  style={{ background: reel.amber, color: reel.bg, ...display }}
                >
                  ★ EDIT RATING
                </button>
                <button
                  className="px-6 py-3 tracking-[0.15em] text-sm border"
                  style={{ borderColor: reel.ink, color: reel.ink, ...display }}
                >
                  ↻ READ AGAIN
                </button>
                <button
                  className="px-6 py-3 tracking-[0.15em] text-sm border"
                  style={{ borderColor: reel.inkSoft, color: reel.inkSoft, ...display }}
                >
                  ↗ LEND
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 pb-24 md:pb-16">
        {/* Review — pulled quote style */}
        <section className="my-12 grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 md:gap-12">
          <div>
            <p
              className="text-[10px] tracking-[0.3em] mb-3"
              style={{ ...mono, color: reel.amber }}
            >
              ★★★★★ REVIEW
            </p>
            <p
              className="text-xs tracking-[0.3em]"
              style={{ ...mono, color: reel.inkSoft }}
            >
              WRITTEN
              <br />
              JUN 04, 2022
            </p>
          </div>
          <div>
            <p
              className="leading-[1.25]"
              style={{
                ...body,
                fontSize: "clamp(1.2rem, 2.2vw, 1.75rem)",
                fontWeight: 500,
              }}
            >
              <span style={{ color: reel.amber }}>&ldquo;</span>
              Eco at his most playful and ferocious. The novel is a labyrinth
              that knows you&apos;re looking for the way out, and keeps building
              new walls just to watch you reroute. Read it once for the murder.
              Read it again for the library. Read it a third time and you start
              to suspect it&apos;s reading you back.
              <span style={{ color: reel.amber }}>&rdquo;</span>
            </p>
            <p
              className="text-sm mt-6 tracking-wider"
              style={{ ...mono, color: reel.inkSoft }}
            >
              · 4 PEOPLE LIKED THIS
            </p>
          </div>
        </section>

        {/* Entries log */}
        <section className="mb-12">
          <h2 className="text-2xl sm:text-4xl mb-6" style={display}>
            YOUR HISTORY WITH THIS BOOK
          </h2>
          <div className="space-y-px" style={{ background: reel.surfaceHi }}>
            {entries.map((e, i) => (
              <article
                key={i}
                className="grid grid-cols-[110px_1fr] sm:grid-cols-[160px_1fr_auto] gap-3 sm:gap-6 p-4 sm:p-5"
                style={{ background: reel.surface }}
              >
                <p
                  className="text-xs tracking-[0.2em]"
                  style={{ ...mono, color: reel.inkSoft }}
                >
                  {e.date}
                </p>
                <div>
                  <p
                    className="text-[10px] tracking-[0.3em] mb-1.5"
                    style={{ ...mono, color: e.color }}
                  >
                    ▶ {e.type}
                  </p>
                  <p className="text-sm sm:text-base" style={body}>
                    {e.note}
                  </p>
                </div>
                <span
                  className="text-xs tracking-widest hidden sm:inline self-center"
                  style={{ ...mono, color: reel.inkFaint }}
                >
                  ENTRY #{String(i + 1).padStart(3, "0")}
                </span>
              </article>
            ))}
          </div>
        </section>

        {/* "If you liked this" rail */}
        <section className="mb-12">
          <div className="flex items-end justify-between gap-3 mb-5">
            <h2 className="text-2xl sm:text-4xl" style={display}>
              IF YOU LIKED THIS
            </h2>
            <p
              className="text-xs tracking-[0.3em]"
              style={{ ...mono, color: reel.inkSoft }}
            >
              FROM YOUR SHELF
            </p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
            {similar.map((s) => (
              <Link
                key={s.id}
                href="/mockups/3/book"
                className="group block relative"
              >
                <img
                  src={s.cover}
                  alt={s.title}
                  className="w-full aspect-[2/3] object-cover transition-transform group-hover:scale-105"
                />
                {s.rating && (
                  <div
                    className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-bold tracking-wider"
                    style={{ ...mono, background: reel.amber, color: reel.bg }}
                  >
                    {s.rating}.0★
                  </div>
                )}
                <p
                  className="text-[10px] tracking-[0.2em] mt-2"
                  style={{ ...mono, color: reel.inkSoft }}
                >
                  {s.year}
                </p>
                <p
                  className="text-sm leading-tight line-clamp-2"
                  style={{ ...display, color: reel.ink }}
                >
                  {s.title.toUpperCase()}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Footer "details" strip */}
        <section
          className="grid grid-cols-2 sm:grid-cols-4 gap-px"
          style={{ background: reel.surfaceHi }}
        >
          {[
            { label: "FIRST PUBLISHED", value: String(b.year) },
            { label: "PAGES", value: String(b.pages) },
            { label: "ACQUIRED FROM", value: (b.source || "—").toUpperCase() },
            { label: "ORIGINAL LANG.", value: "ITALIAN" },
          ].map((d) => (
            <div
              key={d.label}
              className="p-4 sm:p-5"
              style={{ background: reel.surface }}
            >
              <p
                className="text-[10px] tracking-[0.3em] mb-1"
                style={{ ...mono, color: reel.inkSoft }}
              >
                {d.label}
              </p>
              <p
                className="text-lg sm:text-xl"
                style={{ ...display, color: reel.ink }}
              >
                {d.value}
              </p>
            </div>
          ))}
        </section>
      </div>
    </ReelShell>
  );
}

function StatBlock({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.3em]" style={{ color: reel.inkSoft }}>
        {label}
      </p>
      <p
        className="text-xl mt-0.5 leading-none tabular-nums"
        style={{ color: color || reel.ink, ...display }}
      >
        {value}
      </p>
    </div>
  );
}
