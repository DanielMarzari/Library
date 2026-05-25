export const dynamic = "force-static";

import Link from "next/link";
import { MOCK_BOOKS, MOCK_STATS } from "../../data";
import { BentoShell, bento, display } from "../theme";

// Mockup 1 — Bento Pop · Goals

interface LearningGoal {
  id: string;
  name: string;
  description: string;
  color: string;
  emoji: string;
  books: typeof MOCK_BOOKS;
  read: number;
}

const LEARNING_GOALS: LearningGoal[] = [
  {
    id: "1",
    name: "Russian Lit Deep Dive",
    description: "Read all the big ones. Slow burn.",
    color: bento.pink,
    emoji: "📚",
    books: MOCK_BOOKS.filter((b) => b.topics.some((t) => t.includes("Russian"))),
    read: 2,
  },
  {
    id: "2",
    name: "Calvino, in full",
    description: "Read everything Calvino wrote.",
    color: bento.yellow,
    emoji: "🌀",
    books: MOCK_BOOKS.filter((b) => b.author === "Italo Calvino"),
    read: 2,
  },
  {
    id: "3",
    name: "Postmodern primer",
    description: "Foundational PoMo before tackling Pynchon.",
    color: bento.lilac,
    emoji: "🎭",
    books: MOCK_BOOKS.filter((b) => b.topics.some((t) => t.includes("Postmodern"))),
    read: 1,
  },
  {
    id: "4",
    name: "Magical realism canon",
    description: "From Borges forward.",
    color: bento.green,
    emoji: "✨",
    books: MOCK_BOOKS.filter((b) => b.topics.some((t) => t.includes("Realism"))),
    read: 1,
  },
];

export default function BentoGoals() {
  const yearTarget = 24;
  const yearProgress = MOCK_STATS.read;
  const yearPct = (yearProgress / yearTarget) * 100;
  const onPace = "ahead by 2 books";

  return (
    <BentoShell current="goals">
      {/* Header */}
      <div className="mt-2 mb-6">
        <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: bento.inkSoft, ...display }}>
          Goals
        </p>
        <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight" style={display}>
          {yearProgress}/{yearTarget} so far —{" "}
          <span style={{ color: bento.pink }}>{onPace}.</span>
        </h1>
      </div>

      {/* Year goal hero */}
      <div
        className="rounded-3xl p-5 sm:p-7 mb-5 relative overflow-hidden"
        style={{ background: bento.ink, color: bento.bg }}
      >
        <div
          className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full opacity-30"
          style={{ background: bento.pink, filter: "blur(40px)" }}
        />
        <div
          className="absolute -left-12 -top-12 w-48 h-48 rounded-full opacity-30"
          style={{ background: bento.yellow, filter: "blur(30px)" }}
        />

        <div className="relative">
          <p className="text-xs uppercase tracking-wider opacity-60 mb-2" style={display}>
            Reading Goal · 2026
          </p>
          <p className="text-5xl sm:text-7xl font-bold leading-none mb-1" style={display}>
            {yearProgress}{" "}
            <span style={{ color: bento.yellow, fontSize: "0.5em" }}>/ {yearTarget}</span>
          </p>
          <p className="text-sm opacity-80 mt-2">
            {yearPct.toFixed(0)}% of the way · {yearTarget - yearProgress} to go
          </p>

          {/* Progress bar */}
          <div
            className="h-3 rounded-full overflow-hidden mt-5"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${yearPct}%`,
                background: `linear-gradient(90deg, ${bento.yellow}, ${bento.pink})`,
              }}
            />
          </div>

          {/* Pace indicator */}
          <div className="grid grid-cols-3 gap-3 mt-5 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider opacity-60" style={display}>
                Per month
              </p>
              <p className="text-2xl font-bold" style={display}>
                {(yearProgress / 5).toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider opacity-60" style={display}>
                Pace
              </p>
              <p className="text-2xl font-bold" style={{ ...display, color: bento.green }}>
                +12%
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider opacity-60" style={display}>
                Finish by
              </p>
              <p className="text-2xl font-bold" style={display}>
                Oct
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        <Mini color={bento.green} label="Avg / month" value="1.4" sub="books" inkOnLight />
        <Mini color={bento.lilac} label="Streak" value="12" sub="days" inkOnLight />
        <Mini color={bento.yellow} label="Best month" value="Apr" sub="2 books" inkOnLight />
      </div>

      {/* Learning goals */}
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-xl font-bold flex items-center gap-2" style={display}>
          <span className="w-2 h-2 rounded-full" style={{ background: bento.pink }} />
          Learning goals
          <span className="text-sm font-normal" style={{ color: bento.inkSoft }}>
            ({LEARNING_GOALS.length})
          </span>
        </h2>
        <button
          className="text-xs font-semibold px-3 py-1.5 rounded-full text-white"
          style={{ background: bento.pink, ...display }}
        >
          + New goal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {LEARNING_GOALS.map((g) => (
          <GoalCard key={g.id} g={g} />
        ))}
      </div>
    </BentoShell>
  );
}

function GoalCard({ g }: { g: LearningGoal }) {
  const target = g.books.length;
  const pct = target > 0 ? (g.read / target) * 100 : 0;
  return (
    <article
      className="rounded-3xl p-5 sm:p-6"
      style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-2xl grid place-items-center text-xl flex-shrink-0"
          style={{ background: g.color + "33" }}
        >
          {g.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base sm:text-lg font-bold leading-tight" style={display}>
            {g.name}
          </p>
          <p className="text-xs mt-0.5" style={{ color: bento.inkSoft }}>
            {g.description}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="font-semibold" style={display}>
          {g.read} <span style={{ color: bento.inkSoft }}>of</span> {target}
        </span>
        <span style={{ color: g.color, ...display, fontWeight: 700 }}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: bento.ink + "10" }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: g.color }}
        />
      </div>

      {/* Book pile */}
      <div className="flex items-end mt-4 gap-1">
        {g.books.slice(0, 5).map((b, i) => (
          <img
            key={b.id}
            src={b.cover}
            alt=""
            className="w-9 sm:w-10 aspect-[2/3] object-cover rounded-md shadow"
            style={{
              transform: `rotate(${(i - 2) * 3}deg)`,
              marginLeft: i === 0 ? 0 : "-8px",
              zIndex: 5 - i,
              filter: i < g.read ? "none" : "grayscale(0.5) opacity(0.7)",
            }}
          />
        ))}
        {g.books.length > 5 && (
          <span
            className="text-xs ml-2 font-semibold"
            style={{ color: bento.inkSoft, ...display }}
          >
            +{g.books.length - 5}
          </span>
        )}
      </div>

      <Link
        href="/mockups/1/list"
        className="block mt-4 text-xs font-semibold"
        style={{ color: g.color, ...display }}
      >
        Manage books →
      </Link>
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
