export const dynamic = "force-static";

import Link from "next/link";
import { MOCK_BOOKS, MOCK_STATS } from "../data";

// -----------------------------------------------------------------------------
// Mockup 2 — "The Catalog"
// Academic / card-catalog library feel. Sepia paper background, ink colors,
// classification numbers, monospaced call-numbers, ruled rows. Every book is
// visible on one page — designed to be the single scrollable index of the
// entire collection. Drawing pins replaced with simple ruling and serif type.
// -----------------------------------------------------------------------------

const palette = {
  paper: "#F2E8D5",
  paperDeep: "#E5D7B5",
  ink: "#1F1A14",
  inkSoft: "#5C4A33",
  rule: "#9C7E5A",
  ruleFaint: "#C5AB7F",
  card: "#FFF7E5",
  accent: "#7A2E1F", // oxblood
  brass: "#B08020",
  green: "#3F5B36",
};

const fontImport = `https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&family=Libre+Bodoni:ital,wght@0,400;0,700;1,400&family=JetBrains+Mono:wght@400;500;600&display=swap`;

const serifHead: React.CSSProperties = {
  fontFamily: "'Libre Bodoni', 'Libre Caslon Text', serif",
};
const serifBody: React.CSSProperties = {
  fontFamily: "'Libre Caslon Text', Georgia, serif",
};
const mono: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
};

// Build a fake LCC call number for each book based on its index
function callNum(i: number, b: typeof MOCK_BOOKS[number]): string {
  const letters = ["PG", "PQ", "QA", "PS", "PN", "PT", "PR", "B"];
  const letter = letters[i % letters.length];
  const num = (3000 + i * 137) % 9999;
  const surname = b.author.split(" ").pop() || "X";
  const cutter = `.${surname[0].toUpperCase()}${(surname.charCodeAt(1) % 90) + 10}`;
  return `${letter}${num}${cutter} ${b.year}`;
}

export default function MockupCatalog() {
  const sorted = [...MOCK_BOOKS].sort((a, b) => a.author.localeCompare(b.author));

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href={fontImport} />
      <div
        style={{
          background: `repeating-linear-gradient(0deg, ${palette.paper} 0, ${palette.paper} 38px, ${palette.paperDeep}55 38px, ${palette.paperDeep}55 39px), ${palette.paper}`,
          color: palette.ink,
          minHeight: "100vh",
          ...serifBody,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-10">
          {/* Masthead */}
          <header className="mb-10 pb-6 border-b-4" style={{ borderColor: palette.ink, borderBottomStyle: "double" }}>
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-start gap-4">
                <CrestSeal />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.35em]" style={{ ...mono, color: palette.accent }}>
                    Card Catalog · Vol. IV
                  </p>
                  <h1
                    className="text-5xl sm:text-7xl leading-none tracking-tight mt-1"
                    style={{ ...serifHead, fontWeight: 700, color: palette.ink }}
                  >
                    Bibliotheca
                  </h1>
                  <p className="italic mt-1" style={{ color: palette.inkSoft }}>
                    A complete index of the personal collection · est. MMXXVI
                  </p>
                </div>
              </div>
              <nav className="hidden md:flex flex-col gap-1 text-right text-sm" style={mono}>
                <Link href="/mockups" className="hover:underline" style={{ color: palette.accent }}>
                  ← all mockups
                </Link>
                <span style={{ color: palette.inkSoft }}>· Subject Index</span>
                <span style={{ color: palette.inkSoft }}>· Author Index</span>
                <span style={{ color: palette.inkSoft }}>· Reading Log</span>
              </nav>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-6 gap-y-2 mt-6 pt-4 border-t" style={{ borderColor: palette.rule }}>
              <StatLine label="Holdings" value={String(MOCK_STATS.totalBooks)} accent={palette.ink} />
              <StatLine label="Catalogued" value={String(MOCK_STATS.read)} accent={palette.green} sub="read" />
              <StatLine label="Circulating" value={String(MOCK_STATS.reading)} accent={palette.accent} sub="reading" />
              <StatLine label="Pages" value={MOCK_STATS.pagesRead.toLocaleString()} accent={palette.ink} sub="total" />
              <StatLine label="Mean ★" value={MOCK_STATS.avgRating.toFixed(2)} accent={palette.brass} />
            </div>
          </header>

          {/* Filter / locator strip — feels like a finding aid */}
          <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <span className="text-[10px] uppercase tracking-[0.3em]" style={{ ...mono, color: palette.inkSoft }}>
              Sort by
            </span>
            {["Author", "Title", "Call No.", "Date", "Rating"].map((s, i) => (
              <a
                key={s}
                className="cursor-pointer hover:underline"
                style={{
                  color: i === 0 ? palette.accent : palette.ink,
                  fontWeight: i === 0 ? 700 : 400,
                  ...mono,
                }}
              >
                {s}{i === 0 && " ↓"}
              </a>
            ))}
            <span className="ml-auto text-[10px] uppercase tracking-[0.3em]" style={{ ...mono, color: palette.inkSoft }}>
              {sorted.length} entries · all visible
            </span>
          </div>

          {/* THE CATALOG — table of all books */}
          <div className="border-t-2 border-b-2" style={{ borderColor: palette.ink }}>
            {/* Table header */}
            <div
              className="hidden md:grid grid-cols-[160px_60px_1fr_140px_80px_100px] gap-4 px-3 py-2.5 text-[10px] uppercase tracking-[0.25em]"
              style={{ ...mono, color: palette.inkSoft, borderBottom: `1px solid ${palette.rule}` }}
            >
              <span>Call number</span>
              <span></span>
              <span>Author · Title · Subject</span>
              <span>Published</span>
              <span>Pages</span>
              <span className="text-right">Status</span>
            </div>

            {sorted.map((b, i) => (
              <CatalogRow key={b.id} b={b} i={i} />
            ))}
          </div>

          {/* Bottom decorative band — a faux "checkout slip" */}
          <section className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Index by subject */}
            <div className="md:col-span-2">
              <h3
                className="text-2xl border-b-2 pb-2 mb-3"
                style={{ ...serifHead, fontWeight: 700, borderColor: palette.ink }}
              >
                Subject Index
              </h3>
              <div className="columns-2 sm:columns-3 gap-6 text-sm" style={serifBody}>
                {Array.from(new Set(MOCK_BOOKS.flatMap((b) => b.topics))).sort().map((t) => {
                  const count = MOCK_BOOKS.filter((b) => b.topics.includes(t)).length;
                  return (
                    <p key={t} className="leading-relaxed break-inside-avoid">
                      <span style={{ color: palette.accent }}>{t}</span>
                      <span style={{ color: palette.inkSoft }}> · {count}</span>
                    </p>
                  );
                })}
              </div>
            </div>

            {/* Checkout slip */}
            <aside
              className="p-5 relative"
              style={{
                background: palette.card,
                border: `1px dashed ${palette.rule}`,
                boxShadow: `4px 4px 0 ${palette.rule}55`,
              }}
            >
              <p className="text-[10px] uppercase tracking-[0.3em] mb-2" style={{ ...mono, color: palette.accent }}>
                Circulation Slip
              </p>
              <p className="text-lg" style={{ ...serifHead, fontWeight: 700 }}>
                D. Marzari
              </p>
              <p className="text-xs italic mb-3" style={{ color: palette.inkSoft }}>
                Card no. 0247 · since 2017
              </p>

              <table className="w-full text-xs" style={mono}>
                <thead>
                  <tr style={{ color: palette.inkSoft }}>
                    <th className="text-left font-normal pb-1">Out</th>
                    <th className="text-left font-normal pb-1">Returned</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["05.19.26", "—"],
                    ["04.27.26", "05.12.26"],
                    ["03.18.26", "04.21.26"],
                    ["02.04.26", "03.10.26"],
                  ].map(([o, r], idx) => (
                    <tr key={idx} className="border-t" style={{ borderColor: palette.ruleFaint }}>
                      <td className="py-1">{o}</td>
                      <td className="py-1" style={{ color: r === "—" ? palette.accent : palette.ink }}>
                        {r}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p
                className="text-[10px] italic mt-4 pt-3 border-t"
                style={{ borderColor: palette.ruleFaint, color: palette.inkSoft }}
              >
                &ldquo;Please return promptly so others may enjoy.&rdquo;
              </p>
            </aside>
          </section>

          {/* Colophon */}
          <footer className="mt-12 pt-6 border-t-2 text-center" style={{ borderColor: palette.ink, borderTopStyle: "double" }}>
            <p style={{ ...serifHead, fontStyle: "italic", color: palette.inkSoft }}>
              — Mockup 2 · The Catalog —
            </p>
            <p className="text-[10px] uppercase tracking-[0.3em] mt-2" style={{ ...mono, color: palette.inkSoft }}>
              Set in Libre Bodoni · Libre Caslon Text · JetBrains Mono
            </p>
          </footer>
        </div>

        {/* Back button (mobile) */}
        <Link
          href="/mockups"
          className="md:hidden fixed top-3 right-3 px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] border"
          style={{
            borderColor: palette.ink,
            color: palette.ink,
            background: palette.paper,
            ...mono,
          }}
        >
          ← mockups
        </Link>
      </div>
    </>
  );
}

function StatLine({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: string;
  accent: string;
  sub?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.3em]" style={{ ...mono, color: "#5C4A33" }}>
        {label}
      </p>
      <p className="text-2xl mt-0.5" style={{ ...serifHead, color: accent, fontWeight: 700 }}>
        {value}
        {sub && (
          <span className="text-xs ml-1.5 italic" style={{ ...serifBody, color: "#5C4A33", fontWeight: 400 }}>
            {sub}
          </span>
        )}
      </p>
    </div>
  );
}

function CatalogRow({
  b,
  i,
}: {
  b: typeof MOCK_BOOKS[number];
  i: number;
}) {
  const cn = callNum(i, b);
  const status =
    b.status === "read" ? { label: "ON SHELF", color: "#3F5B36" } :
    b.status === "reading" ? { label: "OUT", color: "#7A2E1F" } :
    { label: "QUEUED", color: "#5C4A33" };

  return (
    <article
      className="grid grid-cols-[80px_1fr] md:grid-cols-[160px_60px_1fr_140px_80px_100px] gap-4 px-3 py-4 items-start hover:bg-black/[0.025]"
      style={{ borderBottom: "1px solid #C5AB7F" }}
    >
      {/* Call number */}
      <div className="md:order-1">
        <p className="text-[11px] font-semibold leading-tight" style={mono}>
          {cn}
        </p>
        <p className="text-[10px] mt-0.5 hidden md:block" style={{ ...mono, color: "#5C4A33" }}>
          shelf {3 + (i % 8)}
        </p>
      </div>

      {/* Cover (hidden on mobile to save space) */}
      <div className="hidden md:flex md:order-2 justify-center">
        <img
          src={b.cover}
          alt={b.title}
          className="w-12 aspect-[2/3] object-cover"
          style={{ filter: "sepia(0.25) saturate(0.7)" }}
        />
      </div>

      {/* Title + meta */}
      <div className="md:order-3 min-w-0">
        <p
          className="text-base sm:text-lg leading-tight"
          style={{ ...serifHead, fontWeight: 700 }}
        >
          {b.author}.{" "}
          <span style={{ fontStyle: "italic", fontWeight: 400, ...serifBody }}>
            {b.title}.
          </span>
        </p>
        <div className="text-xs mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5" style={{ color: "#5C4A33" }}>
          {b.topics.map((t) => (
            <span key={t}>· {t}</span>
          ))}
          {b.source && <span className="italic">acq. {b.source}</span>}
        </div>
        {b.rating && (
          <p className="text-sm mt-1" style={{ color: "#B08020" }}>
            {"★".repeat(b.rating)}
            <span style={{ color: "#C5AB7F" }}>{"★".repeat(5 - b.rating)}</span>
            <span className="ml-2 text-xs italic" style={{ ...serifBody, color: "#5C4A33" }}>
              — reader&apos;s rating
            </span>
          </p>
        )}
      </div>

      {/* Published */}
      <div className="hidden md:block md:order-4" style={{ color: "#5C4A33" }}>
        <p className="text-sm" style={serifBody}>
          {b.year}
        </p>
        <p className="text-[10px]" style={mono}>
          {b.year < 1950 ? "antiquarian" : "modern"}
        </p>
      </div>

      {/* Pages */}
      <div className="hidden md:block md:order-5 text-sm tabular-nums" style={{ ...mono, color: "#5C4A33" }}>
        {b.pages} pp
      </div>

      {/* Status */}
      <div className="hidden md:flex md:order-6 justify-end items-start">
        <span
          className="text-[10px] tracking-[0.25em] px-2 py-1 border"
          style={{ ...mono, color: status.color, borderColor: status.color }}
        >
          {status.label}
        </span>
      </div>

      {/* Mobile mini status row */}
      <div className="md:hidden col-span-2 -mt-2 flex items-center justify-between text-[10px]" style={mono}>
        <span style={{ color: "#5C4A33" }}>
          {b.year} · {b.pages} pp
        </span>
        <span
          className="px-1.5 py-0.5 border"
          style={{ color: status.color, borderColor: status.color }}
        >
          {status.label}
        </span>
      </div>
    </article>
  );
}

function CrestSeal() {
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" aria-hidden>
      <circle cx="30" cy="30" r="28" stroke="#1F1A14" strokeWidth="1.5" />
      <circle cx="30" cy="30" r="22" stroke="#7A2E1F" strokeWidth="1" />
      <path d="M30 12 L38 30 L30 24 L22 30 Z" fill="#7A2E1F" />
      <text x="30" y="44" textAnchor="middle" fontSize="6" fill="#1F1A14" fontFamily="serif" fontStyle="italic">
        lectio
      </text>
      <text x="30" y="51" textAnchor="middle" fontSize="6" fill="#1F1A14" fontFamily="serif" fontStyle="italic">
        privata
      </text>
    </svg>
  );
}
