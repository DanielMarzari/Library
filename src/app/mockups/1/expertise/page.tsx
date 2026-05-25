export const dynamic = "force-static";

import { MOCK_BOOKS } from "../../data";
import { BentoShell, bento, display } from "../theme";

// Mockup 1 — Bento Pop · Skills / Expertise
// Topic mastery view: which subjects you've read most about, with depth scores.

interface Skill {
  topic: string;
  books: number;
  pages: number;
  level: 1 | 2 | 3 | 4 | 5;
  trend: "up" | "stable" | "down";
  color: string;
  emoji: string;
  recent: typeof MOCK_BOOKS;
}

const SKILLS: Skill[] = [
  {
    topic: "Russian Literature",
    books: 3,
    pages: 1428,
    level: 4,
    trend: "up",
    color: bento.pink,
    emoji: "🪆",
    recent: MOCK_BOOKS.filter((b) => b.topics.includes("Russian Literature")),
  },
  {
    topic: "Italian Literature",
    books: 3,
    pages: 578,
    level: 4,
    trend: "up",
    color: bento.yellow,
    emoji: "🇮🇹",
    recent: MOCK_BOOKS.filter((b) => b.topics.includes("Italian Lit") || b.topics.includes("Italian Literature")),
  },
  {
    topic: "Postmodern Fiction",
    books: 2,
    pages: 383,
    level: 3,
    trend: "stable",
    color: bento.lilac,
    emoji: "🎭",
    recent: MOCK_BOOKS.filter((b) => b.topics.includes("Postmodern")),
  },
  {
    topic: "Philosophy",
    books: 2,
    pages: 1502,
    level: 3,
    trend: "up",
    color: bento.blue,
    emoji: "🧠",
    recent: MOCK_BOOKS.filter((b) => b.topics.includes("Philosophy")),
  },
  {
    topic: "Magical Realism",
    books: 1,
    pages: 417,
    level: 2,
    trend: "stable",
    color: bento.green,
    emoji: "✨",
    recent: MOCK_BOOKS.filter((b) => b.topics.some((t) => t.includes("Realism"))),
  },
  {
    topic: "American Literature",
    books: 1,
    pages: 324,
    level: 2,
    trend: "up",
    color: bento.orange,
    emoji: "🇺🇸",
    recent: MOCK_BOOKS.filter((b) => b.topics.includes("American Lit")),
  },
  {
    topic: "Mathematics",
    books: 1,
    pages: 777,
    level: 3,
    trend: "stable",
    color: "#FF6B9D",
    emoji: "📐",
    recent: MOCK_BOOKS.filter((b) => b.topics.includes("Mathematics")),
  },
  {
    topic: "Mystery / Medieval",
    books: 1,
    pages: 502,
    level: 2,
    trend: "stable",
    color: "#4ECDC4",
    emoji: "🗝️",
    recent: MOCK_BOOKS.filter((b) => b.topics.includes("Mystery")),
  },
];

const LEVEL_LABEL: Record<Skill["level"], string> = {
  1: "Dabbling",
  2: "Curious",
  3: "Informed",
  4: "Devoted",
  5: "Expert",
};

const TREND_ICON: Record<Skill["trend"], string> = {
  up: "↗",
  stable: "→",
  down: "↘",
};

const TREND_COLOR: Record<Skill["trend"], string> = {
  up: bento.green,
  stable: bento.inkSoft,
  down: bento.pink,
};

export default function BentoExpertise() {
  const top = SKILLS[0];
  const totalTopics = SKILLS.length;
  const totalPages = SKILLS.reduce((s, x) => s + x.pages, 0);

  return (
    <BentoShell current="expertise">
      {/* Header */}
      <div className="mt-2 mb-6">
        <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: bento.inkSoft, ...display }}>
          Skills
        </p>
        <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight" style={display}>
          Your{" "}
          <span style={{ color: bento.blue }}>topic map.</span>
        </h1>
        <p className="text-sm mt-2" style={{ color: bento.inkSoft }}>
          {totalTopics} subjects · depth based on books, pages, and recency.
        </p>
      </div>

      {/* Top skill spotlight */}
      <div
        className="rounded-3xl p-5 sm:p-6 mb-5 relative overflow-hidden"
        style={{ background: top.color, color: bento.ink }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-2xl grid place-items-center text-3xl flex-shrink-0"
            style={{ background: "rgba(0,0,0,0.1)" }}
          >
            {top.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[10px] uppercase tracking-wider font-semibold opacity-80"
              style={display}
            >
              Your strongest topic
            </p>
            <p className="text-2xl sm:text-3xl font-bold leading-tight mt-0.5" style={display}>
              {top.topic}
            </p>
            <p className="text-sm mt-1 opacity-80">
              {top.books} books · {top.pages.toLocaleString()} pages · {LEVEL_LABEL[top.level]}
            </p>
            <div className="flex gap-1 mt-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-2 flex-1 rounded-full"
                  style={{
                    background: i < top.level ? bento.ink : "rgba(0,0,0,0.15)",
                    maxWidth: "32px",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        <Mini color={bento.green} label="Subjects" value={String(totalTopics)} inkOnLight />
        <Mini color={bento.lilac} label="Total pages" value={totalPages.toLocaleString()} inkOnLight />
        <Mini color={bento.pink} label="Trending" value="3" sub="up this year" />
      </div>

      {/* Skill cards grid */}
      <h2
        className="text-xl font-bold mb-3 flex items-center gap-2"
        style={display}
      >
        <span className="w-2 h-2 rounded-full" style={{ background: bento.blue }} />
        All topics
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SKILLS.map((s) => (
          <SkillCard key={s.topic} s={s} />
        ))}
      </div>

      {/* Recommendation nudge */}
      <div
        className="mt-7 rounded-3xl p-5 flex items-center gap-3"
        style={{ background: bento.ink, color: bento.bg }}
      >
        <span className="text-2xl">💡</span>
        <div className="flex-1">
          <p className="text-sm font-bold" style={display}>
            Want to round out a topic?
          </p>
          <p className="text-xs opacity-80 mt-0.5">
            We&apos;ve got 4 recommended next reads in Postmodern Fiction.
          </p>
        </div>
        <button
          className="px-4 py-2 rounded-full text-xs font-semibold"
          style={{ background: bento.yellow, color: bento.ink, ...display }}
        >
          See recs
        </button>
      </div>
    </BentoShell>
  );
}

function SkillCard({ s }: { s: Skill }) {
  return (
    <article
      className="rounded-3xl p-4 sm:p-5"
      style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-11 h-11 rounded-2xl grid place-items-center text-xl flex-shrink-0"
          style={{ background: s.color + "33" }}
        >
          {s.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold leading-tight" style={display}>
            {s.topic}
          </p>
          <p className="text-xs mt-0.5" style={{ color: bento.inkSoft }}>
            {s.books} {s.books === 1 ? "book" : "books"} · {s.pages.toLocaleString()} pp
          </p>
        </div>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
          style={{
            background: TREND_COLOR[s.trend] + "22",
            color: TREND_COLOR[s.trend],
            ...display,
          }}
        >
          {TREND_ICON[s.trend]} {s.trend === "up" ? "trending" : s.trend}
        </span>
      </div>

      {/* Level bars */}
      <div className="flex items-center gap-1.5 mb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{
              background: i < s.level ? s.color : bento.ink + "10",
            }}
          />
        ))}
        <span
          className="ml-1.5 text-[10px] font-semibold whitespace-nowrap"
          style={{ ...display, color: s.color }}
        >
          {LEVEL_LABEL[s.level]}
        </span>
      </div>

      {/* Cover pile */}
      {s.recent.length > 0 && (
        <div className="flex items-end mt-3">
          {s.recent.slice(0, 4).map((b, i) => (
            <img
              key={b.id}
              src={b.cover}
              alt=""
              className="w-8 aspect-[2/3] object-cover rounded shadow-sm"
              style={{
                transform: `rotate(${(i - 1.5) * 3}deg)`,
                marginLeft: i === 0 ? 0 : "-6px",
                zIndex: 4 - i,
              }}
            />
          ))}
          {s.recent.length > 4 && (
            <span
              className="text-[10px] ml-2 font-semibold"
              style={{ color: bento.inkSoft, ...display }}
            >
              +{s.recent.length - 4}
            </span>
          )}
        </div>
      )}
    </article>
  );
}

function Mini({
  color,
  label,
  value,
  sub,
  inkOnLight,
}: {
  color: string;
  label: string;
  value: string;
  sub?: string;
  inkOnLight?: boolean;
}) {
  const text = inkOnLight ? bento.ink : "#FFF";
  return (
    <div className="rounded-3xl p-4" style={{ background: color, color: text }}>
      <p className="text-[10px] uppercase tracking-wider font-semibold opacity-90" style={display}>
        {label}
      </p>
      <p className="text-2xl sm:text-3xl font-bold mt-1" style={display}>
        {value}
      </p>
      {sub && <p className="text-[10px] opacity-80 mt-0.5">{sub}</p>}
    </div>
  );
}
