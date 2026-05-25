export const dynamic = "force-static";

import { MOCK_BOOKS } from "../../data";
import { BentoShell, bento, display } from "../theme";

// Mockup 1 — Bento Pop · Recommendations

interface Rec {
  title: string;
  author: string;
  cover: string;
  recommendedBy: string;
  source: "friend" | "podcast" | "article" | "book" | "newsletter";
  notes?: string;
  topic?: string;
  year?: number;
  interest: 1 | 2 | 3; // 1 = mild, 3 = high
  added: string;
}

const RECS: Rec[] = [
  {
    title: "The Idiot",
    author: "Elif Batuman",
    cover: "https://covers.openlibrary.org/b/id/8264006-L.jpg",
    recommendedBy: "Sarah Klein",
    source: "friend",
    notes: "Said it captures undergrad Russian-lit nerds perfectly. I am the demo.",
    topic: "Coming of age",
    interest: 3,
    added: "May 12",
  },
  {
    title: "Stoner",
    author: "John Williams",
    cover: "https://covers.openlibrary.org/b/id/8268193-L.jpg",
    recommendedBy: "Ezra Klein Show",
    source: "podcast",
    notes: "Episode with Brad Mehldau. Quiet, devastating.",
    topic: "Literary",
    interest: 3,
    added: "May 04",
  },
  {
    title: "The Overstory",
    author: "Richard Powers",
    cover: "https://covers.openlibrary.org/b/id/9259257-L.jpg",
    recommendedBy: "The Atlantic",
    source: "article",
    notes: "Trees. Generations. Pulitzer. Long but worth.",
    topic: "Climate",
    interest: 2,
    added: "Apr 28",
  },
  {
    title: "A Visit from the Goon Squad",
    author: "Jennifer Egan",
    cover: "https://covers.openlibrary.org/b/id/6627559-L.jpg",
    recommendedBy: "Pale Fire (footnote)",
    source: "book",
    notes: "Mentioned obliquely in Nabokov scholarship. Investigate.",
    topic: "Postmodern",
    interest: 2,
    added: "Apr 21",
  },
  {
    title: "The Mezzanine",
    author: "Nicholson Baker",
    cover: "https://covers.openlibrary.org/b/id/542302-L.jpg",
    recommendedBy: "ASOIAF newsletter",
    source: "newsletter",
    topic: "Comedy",
    interest: 1,
    added: "Apr 11",
  },
  {
    title: "Pachinko",
    author: "Min Jin Lee",
    cover: "https://covers.openlibrary.org/b/id/8757112-L.jpg",
    recommendedBy: "Lin Park",
    source: "friend",
    notes: "Generational epic. She cried 4 times.",
    topic: "Historical",
    interest: 3,
    added: "Mar 18",
  },
  {
    title: "Educated",
    author: "Tara Westover",
    cover: "https://covers.openlibrary.org/b/id/8636488-L.jpg",
    recommendedBy: "Marcus T.",
    source: "friend",
    topic: "Memoir",
    interest: 2,
    added: "Mar 09",
  },
];

const SOURCE_META: Record<Rec["source"], { label: string; color: string; icon: string }> = {
  friend: { label: "Friend", color: bento.pink, icon: "👤" },
  podcast: { label: "Podcast", color: bento.violet ?? bento.lilac, icon: "🎙️" },
  article: { label: "Article", color: bento.blue, icon: "📰" },
  book: { label: "Book", color: bento.orange, icon: "📚" },
  newsletter: { label: "Newsletter", color: bento.green, icon: "📨" },
};

export default function BentoRecommendations() {
  const high = RECS.filter((r) => r.interest === 3);
  const others = RECS.filter((r) => r.interest !== 3);
  const counts = RECS.reduce(
    (m, r) => ((m[r.source] = (m[r.source] || 0) + 1), m),
    {} as Record<Rec["source"], number>
  );

  return (
    <BentoShell current="recs">
      {/* Header */}
      <div className="mt-2 mb-6">
        <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: bento.inkSoft, ...display }}>
          Recommendations
        </p>
        <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight" style={display}>
          {RECS.length} books people{" "}
          <span style={{ color: bento.lilac }}>swore by.</span>
        </h1>
      </div>

      {/* Source filter chips */}
      <div className="flex gap-2 mb-5 overflow-x-auto -mx-4 px-4 pb-1">
        <button
          className="px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5"
          style={{ background: bento.ink, color: bento.bg, ...display }}
        >
          All <span className="px-1.5 rounded-full text-[10px]" style={{ background: "rgba(255,255,255,0.2)" }}>{RECS.length}</span>
        </button>
        {(Object.keys(SOURCE_META) as Rec["source"][]).map((s) => (
          <button
            key={s}
            className="px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5"
            style={{
              background: bento.card,
              color: bento.ink,
              border: `1px solid ${bento.ink}10`,
              ...display,
            }}
          >
            <span>{SOURCE_META[s].icon}</span>
            {SOURCE_META[s].label}
            <span
              className="px-1.5 rounded-full text-[10px]"
              style={{ background: SOURCE_META[s].color + "33", color: bento.ink }}
            >
              {counts[s] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Top picks */}
      <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={display}>
        <span className="w-2 h-2 rounded-full" style={{ background: bento.pink }} />
        High interest{" "}
        <span className="text-sm font-normal" style={{ color: bento.inkSoft }}>
          ({high.length})
        </span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        {high.map((r, i) => (
          <RecCard key={i} r={r} featured />
        ))}
      </div>

      {/* Others */}
      <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={display}>
        <span className="w-2 h-2 rounded-full" style={{ background: bento.inkSoft }} />
        Also on the radar
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {others.map((r, i) => (
          <RecCard key={i} r={r} />
        ))}
      </div>

      {/* Add hint */}
      <div
        className="mt-8 rounded-3xl p-5 flex items-center gap-3"
        style={{
          background: bento.bg,
          border: `2px dashed ${bento.ink}20`,
        }}
      >
        <div
          className="w-10 h-10 rounded-full grid place-items-center text-xl"
          style={{ background: bento.card }}
        >
          ＋
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold" style={display}>
            Got a new one to add?
          </p>
          <p className="text-xs" style={{ color: bento.inkSoft }}>
            Paste a title or DOI, or import from your reading log.
          </p>
        </div>
        <button
          className="px-4 py-2 rounded-full text-xs font-semibold text-white"
          style={{ background: bento.pink, ...display }}
        >
          Add rec
        </button>
      </div>
    </BentoShell>
  );
}

function RecCard({ r, featured }: { r: Rec; featured?: boolean }) {
  const src = SOURCE_META[r.source];
  return (
    <article
      className="rounded-3xl p-4 sm:p-5 flex gap-4"
      style={{
        background: bento.card,
        border: `1px solid ${bento.ink}10`,
      }}
    >
      <img
        src={r.cover}
        alt={r.title}
        className="w-16 sm:w-20 aspect-[2/3] object-cover rounded-lg shadow flex-shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-base sm:text-lg font-bold leading-tight" style={display}>
            {r.title}
          </p>
          {featured && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
              style={{ background: bento.pink, color: "#FFF", ...display }}
            >
              ♥ HIGH
            </span>
          )}
        </div>
        <p className="text-sm" style={{ color: bento.inkSoft }}>
          {r.author}
        </p>

        <div className="flex items-center gap-1.5 mt-2">
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{ background: src.color + "20", color: bento.ink, ...display }}
          >
            <span>{src.icon}</span>
            {r.recommendedBy}
          </span>
          {r.topic && (
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: bento.bg, color: bento.inkSoft }}
            >
              {r.topic}
            </span>
          )}
        </div>

        {r.notes && (
          <p
            className="text-xs italic mt-2.5 leading-snug"
            style={{ color: bento.inkSoft }}
          >
            &ldquo;{r.notes}&rdquo;
          </p>
        )}

        <div className="flex gap-2 mt-3">
          <button
            className="px-3 py-1.5 rounded-full text-xs font-semibold flex-1"
            style={{ background: bento.pink, color: "#FFF", ...display }}
          >
            + Reading list
          </button>
          <button
            className="px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: bento.bg,
              color: bento.inkSoft,
              border: `1px solid ${bento.ink}10`,
              ...display,
            }}
          >
            Already own
          </button>
        </div>

        <p className="text-[10px] mt-2" style={{ color: bento.inkSoft }}>
          added {r.added}
        </p>
      </div>
    </article>
  );
}
