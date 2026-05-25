export const dynamic = "force-static";

import Link from "next/link";
import { MOCK_BOOKS, MOCK_STATS } from "../data";

// -----------------------------------------------------------------------------
// Mockup 2 — "Field Notes"
// Naturalist explorer's journal feel. Deep forest green + cream + ochre +
// oxblood. Topographic line patterns, specimen cards, hand-drawn compass.
// Each book is a "specimen" — observed, classified, annotated. Books are
// grouped by region (the author's nationality), like a field expedition.
// -----------------------------------------------------------------------------

const palette = {
  paper: "#F1EAD8",
  paperDeep: "#E5DBC1",
  ink: "#1A1814",
  inkSoft: "#5A4F3F",
  forest: "#1F3A2C",
  forestDeep: "#0F2418",
  ochre: "#C2823C",
  oxblood: "#8B3A2F",
  rule: "#8B7A5C",
  ruleFaint: "#C5B796",
  card: "#FBF5E5",
};

const fontImport = `https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,700;0,9..144,900;1,9..144,400&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap`;

const display: React.CSSProperties = { fontFamily: "'Fraunces', serif" };
const bodyFont: React.CSSProperties = { fontFamily: "'Inter', sans-serif" };
const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

const NATIONALITIES: Record<string, { country: string; region: string; flag: string }> = {
  "Fyodor Dostoevsky": { country: "Russia", region: "Eurasia", flag: "🇷🇺" },
  "Umberto Eco": { country: "Italy", region: "Europe", flag: "🇮🇹" },
  "Douglas Hofstadter": { country: "United States", region: "Americas", flag: "🇺🇸" },
  "Vladimir Nabokov": { country: "Russia", region: "Eurasia", flag: "🇷🇺" },
  "Italo Calvino": { country: "Italy", region: "Europe", flag: "🇮🇹" },
  "Mikhail Bulgakov": { country: "Russia", region: "Eurasia", flag: "🇷🇺" },
  "Toni Morrison": { country: "United States", region: "Americas", flag: "🇺🇸" },
  "Thomas Mann": { country: "Germany", region: "Europe", flag: "🇩🇪" },
  "Gabriel García Márquez": { country: "Colombia", region: "Americas", flag: "🇨🇴" },
  "Nicholson Baker": { country: "United States", region: "Americas", flag: "🇺🇸" },
};

// Fake field-note observations per book
const FIELD_NOTES: Record<string, string> = {
  "1": "Observed: heavy specimen, dense canopy of footnotes. Notable for ferocious dialogue.",
  "2": "Found in monastic conditions. Specimen contains a labyrinth — measured 9 corridors.",
  "3": "Largest specimen catalogued. Multi-layered, self-referential. Approach with patience.",
  "4": "Compact specimen. Cross-references its own commentary. A mimicry expert.",
  "5": "Observed only in fragments. Each fragment a complete city.",
  "6": "Specimen of unknown geography. Frequently breaks the fourth wall.",
  "7": "Specimen wails. Required two field readings to fully observe.",
  "8": "Mimics itself recursively. Observed to interrupt the reader by name.",
  "9": "Alpine habitat. Observed slow metabolism; recommended seasonal reading.",
  "10": "Lush rainforest specimen. Magical realism in full bloom.",
  "11": "Tiny specimen — entire ecosystem on a single escalator ride.",
  "12": "Crystalline specimen. Each chapter a separate galaxy.",
};

const REGION_ORDER = ["Europe", "Eurasia", "Americas"];

function groupByRegion() {
  const map = new Map<string, typeof MOCK_BOOKS>();
  MOCK_BOOKS.forEach((b) => {
    const region = NATIONALITIES[b.author]?.region || "Unclassified";
    const list = map.get(region) || [];
    list.push(b);
    map.set(region, list);
  });
  return REGION_ORDER
    .filter((r) => map.has(r))
    .map((r) => ({ region: r, books: map.get(r)! }));
}

export default function MockupFieldNotes() {
  const groups = groupByRegion();
  const regionCount = groups.length;
  const countries = new Set(MOCK_BOOKS.map((b) => NATIONALITIES[b.author]?.country).filter(Boolean));

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href={fontImport} />

      {/* Topographic SVG pattern as a faint background */}
      <div
        style={{
          background: palette.paper,
          color: palette.ink,
          minHeight: "100vh",
          backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(topoSvg(palette.rule))}")`,
          backgroundRepeat: "repeat",
          ...bodyFont,
        }}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-10 py-10">
          {/* Masthead */}
          <header className="mb-8 sm:mb-12 pb-8 border-b" style={{ borderColor: palette.ink, borderBottomWidth: "3px", borderBottomStyle: "double" }}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
              <div className="flex items-start gap-4">
                <CompassRose />
                <div>
                  <p
                    className="text-[10px] uppercase tracking-[0.4em]"
                    style={{ ...mono, color: palette.oxblood }}
                  >
                    Reading Expedition · MMXXVI
                  </p>
                  <h1
                    className="leading-[0.9] tracking-tight mt-1"
                    style={{
                      ...display,
                      fontWeight: 900,
                      fontSize: "clamp(3.5rem, 9vw, 7rem)",
                      color: palette.forest,
                    }}
                  >
                    Field
                    <br />
                    <span style={{ fontStyle: "italic", fontWeight: 400 }}>Notes</span>
                  </h1>
                  <p
                    className="italic mt-1 text-sm sm:text-base"
                    style={{ color: palette.inkSoft, ...display }}
                  >
                    Vol. IV — Observations on the personal collection.
                  </p>
                </div>
              </div>
              <Link
                href="/mockups"
                className="self-start px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] border whitespace-nowrap"
                style={{ ...mono, borderColor: palette.ink, color: palette.ink }}
              >
                ← all mockups
              </Link>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-6 gap-y-3 mt-7 pt-5 border-t" style={{ borderColor: palette.rule }}>
              <FieldStat label="Specimens" value={String(MOCK_STATS.totalBooks)} color={palette.forest} />
              <FieldStat label="Observed" value={String(MOCK_STATS.read)} sub="read" color={palette.oxblood} />
              <FieldStat label="Tracking" value={String(MOCK_STATS.reading)} sub="reading" color={palette.ochre} />
              <FieldStat label="Regions" value={String(regionCount)} sub={`${countries.size} countries`} color={palette.forest} />
              <FieldStat label="Pages" value={MOCK_STATS.pagesRead.toLocaleString()} color={palette.forest} />
            </div>
          </header>

          {/* World band — visualised by region */}
          <section className="mb-10">
            <div className="flex items-baseline justify-between gap-3 mb-4">
              <h2
                className="text-2xl sm:text-3xl"
                style={{ ...display, fontWeight: 700, color: palette.forest }}
              >
                Distribution by region
              </h2>
              <p
                className="text-[10px] uppercase tracking-[0.3em]"
                style={{ ...mono, color: palette.inkSoft }}
              >
                a partial atlas
              </p>
            </div>

            <div
              className="flex items-stretch overflow-hidden rounded-sm"
              style={{ border: `1px solid ${palette.ink}` }}
            >
              {groups.map((g, i) => {
                const pct = (g.books.length / MOCK_BOOKS.length) * 100;
                const tone = [palette.forest, palette.ochre, palette.oxblood][i % 3];
                return (
                  <div
                    key={g.region}
                    className="px-3 py-3 flex flex-col justify-center"
                    style={{
                      background: tone,
                      color: palette.paper,
                      width: `${pct}%`,
                      minWidth: "100px",
                    }}
                  >
                    <p
                      className="text-[10px] uppercase tracking-[0.3em] opacity-80"
                      style={mono}
                    >
                      {g.region}
                    </p>
                    <p
                      className="text-2xl sm:text-3xl leading-none mt-0.5"
                      style={{ ...display, fontWeight: 700 }}
                    >
                      {g.books.length}
                      <span
                        className="text-xs ml-1.5 opacity-80"
                        style={{ ...mono, fontWeight: 400 }}
                      >
                        · {pct.toFixed(0)}%
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Specimen plates — grouped by region */}
          {groups.map((g) => (
            <section key={g.region} className="mb-12">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1" style={{ background: palette.ink }} />
                <h2
                  className="text-xl sm:text-2xl px-3"
                  style={{
                    ...display,
                    fontWeight: 700,
                    color: palette.forest,
                    fontStyle: "italic",
                  }}
                >
                  {g.region}
                </h2>
                <div className="h-px flex-1" style={{ background: palette.ink }} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {g.books.map((b, i) => (
                  <SpecimenCard
                    key={b.id}
                    book={b}
                    plateNo={i + 1}
                    nat={NATIONALITIES[b.author]}
                    note={FIELD_NOTES[b.id]}
                  />
                ))}
              </div>
            </section>
          ))}

          {/* Field journal entry */}
          <section
            className="mt-14 p-6 sm:p-8 relative"
            style={{
              background: palette.forest,
              color: palette.paper,
              boxShadow: `6px 6px 0 ${palette.ink}`,
            }}
          >
            <p
              className="text-[10px] uppercase tracking-[0.4em] mb-3 opacity-80"
              style={{ ...mono, color: palette.ochre }}
            >
              Expedition Notes · End of season
            </p>
            <p
              className="text-xl sm:text-2xl leading-relaxed"
              style={{ ...display, fontStyle: "italic" }}
            >
              &ldquo;{MOCK_STATS.read} specimens fully observed; {MOCK_STATS.reading} still under
              study. Strongest specimens this season hail from the Americas. Recommend
              extending the Eurasian survey next year — promising leads in the
              Russian thicket.&rdquo;
            </p>
            <p
              className="text-xs mt-4 tracking-[0.3em]"
              style={{ ...mono, opacity: 0.7 }}
            >
              — D.M., FIELD JOURNAL, ENTRY 247
            </p>
          </section>

          {/* Colophon */}
          <footer
            className="mt-12 pt-6 text-center"
            style={{ borderTop: `3px double ${palette.ink}` }}
          >
            <p
              className="italic"
              style={{ ...display, color: palette.inkSoft }}
            >
              — Mockup 2 · Field Notes —
            </p>
            <p
              className="text-[10px] uppercase tracking-[0.3em] mt-2"
              style={{ ...mono, color: palette.inkSoft }}
            >
              Set in Fraunces · Inter · JetBrains Mono
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}

// ---- Components -------------------------------------------------------------

function FieldStat({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div>
      <p
        className="text-[10px] uppercase tracking-[0.3em]"
        style={{ ...mono, color: palette.inkSoft }}
      >
        {label}
      </p>
      <p
        className="text-2xl sm:text-3xl leading-none mt-1"
        style={{ ...display, fontWeight: 700, color }}
      >
        {value}
        {sub && (
          <span
            className="text-xs ml-1.5 italic"
            style={{ ...display, fontWeight: 400, color: palette.inkSoft }}
          >
            {sub}
          </span>
        )}
      </p>
    </div>
  );
}

function SpecimenCard({
  book,
  plateNo,
  nat,
  note,
}: {
  book: typeof MOCK_BOOKS[number];
  plateNo: number;
  nat?: { country: string; region: string; flag: string };
  note?: string;
}) {
  const statusBadge =
    book.status === "read"
      ? { label: "FULLY OBSERVED", color: "#1F3A2C" }
      : book.status === "reading"
      ? { label: "UNDER STUDY", color: "#C2823C" }
      : { label: "AWAITING SURVEY", color: "#8B3A2F" };

  return (
    <article
      className="relative p-4 flex gap-4"
      style={{
        background: "#FBF5E5",
        border: `1px solid ${palette.ink}`,
        boxShadow: `3px 3px 0 ${palette.ink}30`,
      }}
    >
      {/* Plate number — like the corner of a museum card */}
      <div
        className="absolute -top-2 -left-2 px-2 py-0.5 text-[10px] font-bold tracking-wider"
        style={{ ...mono, background: palette.ink, color: palette.paper }}
      >
        PL.{String(plateNo).padStart(2, "0")}
      </div>

      {/* Cover */}
      <div className="flex-shrink-0">
        <img
          src={book.cover}
          alt={book.title}
          className="w-20 sm:w-24 aspect-[2/3] object-cover"
          style={{
            filter: "sepia(0.2) saturate(0.85)",
            boxShadow: `2px 2px 0 ${palette.rule}`,
          }}
        />
        {/* Faux pin / annotation */}
        <p
          className="text-[9px] mt-1.5 text-center"
          style={{ ...mono, color: palette.inkSoft }}
        >
          {book.year}
          {nat && ` · ${nat.flag}`}
        </p>
      </div>

      {/* Specimen details */}
      <div className="min-w-0 flex-1">
        <p
          className="text-[10px] uppercase tracking-[0.25em] mb-0.5"
          style={{ ...mono, color: palette.oxblood }}
        >
          Genus · {book.topics[0] || "Lit."}
        </p>
        <h3
          className="leading-tight"
          style={{ ...display, fontWeight: 700, fontSize: "1.05rem", color: palette.ink }}
        >
          {book.title}
        </h3>
        <p
          className="italic text-sm mt-0.5"
          style={{ ...display, color: palette.inkSoft }}
        >
          {book.author}
        </p>

        {/* Specimen data */}
        <dl
          className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-2.5 text-[11px]"
          style={mono}
        >
          <Datum label="loc." value={nat?.country || "—"} />
          <Datum label="size" value={`${book.pages}pp`} />
          {book.source && <Datum label="acq." value={book.source} />}
          {book.rating && (
            <Datum
              label="rate"
              value={"★".repeat(book.rating)}
              color={palette.ochre}
            />
          )}
        </dl>

        {/* Note */}
        {note && (
          <p
            className="text-[11px] leading-snug mt-2.5 pl-2 border-l-2 italic"
            style={{ borderColor: palette.ochre, color: palette.inkSoft, ...display }}
          >
            {note}
          </p>
        )}

        {/* Status stamp */}
        <div className="mt-2.5">
          <span
            className="text-[9px] tracking-[0.25em] px-1.5 py-0.5 border"
            style={{
              ...mono,
              color: statusBadge.color,
              borderColor: statusBadge.color,
            }}
          >
            {statusBadge.label}
          </span>
        </div>
      </div>
    </article>
  );
}

function Datum({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <>
      <dt style={{ color: palette.inkSoft }}>{label}</dt>
      <dd style={{ color: color || palette.ink, textAlign: "right" }}>{value}</dd>
    </>
  );
}

function CompassRose() {
  return (
    <svg width="68" height="68" viewBox="0 0 80 80" fill="none" aria-hidden>
      <circle cx="40" cy="40" r="36" stroke="#1A1814" strokeWidth="1.5" fill="none" />
      <circle cx="40" cy="40" r="28" stroke="#8B7A5C" strokeWidth="0.8" fill="none" />
      {/* Main points */}
      <path d="M40 6 L43 38 L40 40 L37 38 Z" fill="#8B3A2F" />
      <path d="M40 74 L43 42 L40 40 L37 42 Z" fill="#1A1814" />
      <path d="M6 40 L38 37 L40 40 L38 43 Z" fill="#1A1814" />
      <path d="M74 40 L42 37 L40 40 L42 43 Z" fill="#1A1814" />
      {/* Secondary points */}
      <path d="M16 16 L37 39 L40 40 L39 37 Z" fill="#C2823C" opacity="0.7" />
      <path d="M64 16 L41 39 L40 40 L43 37 Z" fill="#C2823C" opacity="0.7" />
      <path d="M16 64 L37 41 L40 40 L39 43 Z" fill="#C2823C" opacity="0.7" />
      <path d="M64 64 L41 41 L40 40 L43 43 Z" fill="#C2823C" opacity="0.7" />
      {/* Center */}
      <circle cx="40" cy="40" r="3" fill="#1A1814" />
      <text x="40" y="11" fontSize="6" textAnchor="middle" fill="#1A1814" fontFamily="serif">N</text>
      <text x="40" y="78" fontSize="6" textAnchor="middle" fill="#1A1814" fontFamily="serif">S</text>
      <text x="4" y="42" fontSize="6" textAnchor="middle" fill="#1A1814" fontFamily="serif">W</text>
      <text x="76" y="42" fontSize="6" textAnchor="middle" fill="#1A1814" fontFamily="serif">E</text>
    </svg>
  );
}

// Faint topographic line pattern — repeats as a background tile.
function topoSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
    <g fill="none" stroke="${color}" stroke-width="0.6" opacity="0.18">
      <path d="M0 80 Q60 40 120 80 T240 80 T360 80" />
      <path d="M0 130 Q60 90 120 130 T240 130 T360 130" />
      <path d="M0 180 Q60 140 120 180 T240 180 T360 180" />
      <path d="M0 230 Q60 190 120 230 T240 230 T360 230" />
      <path d="M0 30 Q60 0 120 30 T240 30 T360 30" />
      <path d="M0 280 Q60 240 120 280 T240 280 T360 280" />
    </g>
  </svg>`;
}
