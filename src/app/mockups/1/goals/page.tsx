"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { BentoShell, bento, display } from "../theme";
import {
  useBooks,
  useStats,
  useReadingGoals,
  useLearningGoals,
  booksFinishedInYear,
  type LibraryLearningGoal,
} from "../useLibraryData";
import { SetReadingGoalModal, AddLearningGoalModal } from "../modals";
import type { MockBook } from "../../data";

const HUES = [bento.pink, bento.green, bento.yellow, bento.lilac, bento.blue, bento.orange];

export default function BentoGoals() {
  const { books } = useBooks();
  const stats = useStats(books);
  const { goals: readingGoals, refetch: refetchReading } = useReadingGoals();
  const { goals: learningGoals, refetch: refetchLearning } = useLearningGoals();

  const [showYearGoal, setShowYearGoal] = useState(false);
  const [showLearningGoal, setShowLearningGoal] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const existingYearGoal = readingGoals.find((g) => g.year === currentYear);
  const target = existingYearGoal?.target || 12;
  const readThisYear = booksFinishedInYear(books, currentYear).length;
  const yearPct = Math.min(100, (readThisYear / target) * 100);

  const deleteLearning = async (id: string) => {
    if (!confirm("Delete this learning goal? (Books stay in library.)")) return;
    setBusyId(id);
    try {
      await api.learningGoals.delete(id);
      refetchLearning();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <BentoShell current="goals">
      <div className="mt-2 mb-6 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: bento.inkSoft, ...display }}>
            Goals · {currentYear}
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight" style={display}>
            {readThisYear}/{target} so far{" "}
            {readThisYear >= target ? (
              <span style={{ color: bento.green }}>— goal met!</span>
            ) : (
              <span style={{ color: bento.pink }}>— keep going.</span>
            )}
          </h1>
        </div>
        <button
          onClick={() => setShowYearGoal(true)}
          className="px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap"
          style={{
            background: bento.card,
            border: `1px solid ${bento.ink}10`,
            color: bento.ink,
            ...display,
          }}
        >
          Edit goal
        </button>
      </div>

      <div
        className="rounded-3xl p-5 sm:p-7 mb-5 relative overflow-hidden"
        style={{ background: bento.ink, color: bento.bg }}
      >
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full opacity-30" style={{ background: bento.pink, filter: "blur(40px)" }} />
        <div className="absolute -left-12 -top-12 w-48 h-48 rounded-full opacity-30" style={{ background: bento.yellow, filter: "blur(30px)" }} />
        <div className="relative">
          <p className="text-xs uppercase tracking-wider opacity-60 mb-2" style={display}>
            Reading Goal · {currentYear}
          </p>
          <p className="text-5xl sm:text-7xl font-bold leading-none mb-1" style={display}>
            {readThisYear}
            <span style={{ color: bento.yellow, fontSize: "0.5em" }}> / {target}</span>
          </p>
          <p className="text-sm opacity-80 mt-2">
            {yearPct.toFixed(0)}% of the way · {Math.max(0, target - readThisYear)} to go
          </p>
          <div className="h-3 rounded-full overflow-hidden mt-5" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${yearPct}%`, background: `linear-gradient(90deg, ${bento.yellow}, ${bento.pink})` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-7">
        <Mini color={bento.green} label="Pages" value={stats.pagesRead.toLocaleString()} sub="this year" inkOnLight />
        <Mini color={bento.lilac} label="In progress" value={String(stats.reading)} sub="active" inkOnLight />
        <Mini color={bento.yellow} label="Avg ★" value={stats.avgRating.toFixed(1)} sub="overall" inkOnLight />
      </div>

      {learningGoals.length > 0 && (
        <>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-xl font-bold flex items-center gap-2" style={display}>
              <span className="w-2 h-2 rounded-full" style={{ background: bento.pink }} />
              Learning goals
              <span className="text-sm font-normal" style={{ color: bento.inkSoft }}>
                ({learningGoals.length})
              </span>
            </h2>
            <button
              onClick={() => setShowLearningGoal(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full text-white"
              style={{ background: bento.pink, ...display }}
            >
              + New
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {learningGoals.map((g, i) => (
              <GoalCard
                key={g.id}
                g={g}
                hue={g.color || HUES[i % HUES.length]}
                books={books}
                busy={busyId === g.id}
                onDelete={() => deleteLearning(g.id)}
              />
            ))}
          </div>
        </>
      )}

      {learningGoals.length === 0 && (
        <div
          className="rounded-3xl p-8 text-center"
          style={{ background: bento.card, border: `1px dashed ${bento.ink}20`, color: bento.inkSoft }}
        >
          <p className="text-sm italic mb-3">
            No learning goals yet. Track a multi-book project (e.g. &ldquo;all of Calvino&rdquo;).
          </p>
          <button
            onClick={() => setShowLearningGoal(true)}
            className="px-4 py-2 rounded-full text-xs font-semibold text-white"
            style={{ background: bento.pink, ...display }}
          >
            + New learning goal
          </button>
        </div>
      )}

      {showYearGoal && (
        <SetReadingGoalModal
          year={currentYear}
          current={existingYearGoal ? { id: existingYearGoal.id, target: existingYearGoal.target } : undefined}
          onClose={() => setShowYearGoal(false)}
          onSuccess={() => refetchReading()}
        />
      )}
      {showLearningGoal && (
        <AddLearningGoalModal
          onClose={() => setShowLearningGoal(false)}
          onSuccess={() => refetchLearning()}
        />
      )}
    </BentoShell>
  );
}

function GoalCard({
  g,
  hue,
  books,
  busy,
  onDelete,
}: {
  g: LibraryLearningGoal;
  hue: string;
  books: MockBook[];
  busy?: boolean;
  onDelete?: () => void;
}) {
  // Naively match books to a goal by topic substring of the goal name —
  // good enough for a preview. The real /api/learning-goal-books join would
  // wire this up properly when this graduates.
  const tokens = g.name.toLowerCase().split(/\s+/);
  const matches = books.filter((b) =>
    b.topics.some((t) => tokens.some((tok) => tok.length > 2 && t.toLowerCase().includes(tok)))
  );
  const read = matches.filter((b) => b.status === "read").length;
  const target = Math.max(matches.length, 1);
  const pct = (read / target) * 100;

  return (
    <article className="rounded-3xl p-5 sm:p-6" style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}>
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-2xl grid place-items-center text-xl flex-shrink-0"
          style={{ background: hue + "33" }}
        >
          📚
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base sm:text-lg font-bold leading-tight" style={display}>{g.name}</p>
          {g.description && (
            <p className="text-xs mt-0.5" style={{ color: bento.inkSoft }}>{g.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm mb-2">
        <span className="font-semibold" style={display}>
          {read} <span style={{ color: bento.inkSoft }}>of</span> {target}
        </span>
        <span style={{ color: hue, ...display, fontWeight: 700 }}>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: bento.ink + "10" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: hue }} />
      </div>

      {matches.length > 0 && (
        <div className="flex items-end mt-4">
          {matches.slice(0, 5).map((b, i) => (
            <img
              key={b.id}
              src={b.cover}
              alt=""
              className="w-9 sm:w-10 aspect-[2/3] object-cover rounded-md shadow"
              style={{
                transform: `rotate(${(i - 2) * 3}deg)`,
                marginLeft: i === 0 ? 0 : "-8px",
                zIndex: 5 - i,
                filter: i < read ? "none" : "grayscale(0.5) opacity(0.7)",
              }}
            />
          ))}
          {matches.length > 5 && (
            <span className="text-xs ml-2 font-semibold" style={{ color: bento.inkSoft, ...display }}>
              +{matches.length - 5}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-4">
        <Link
          href="/mockups/1/list"
          className="text-xs font-semibold"
          style={{ color: hue, ...display }}
        >
          Manage books →
        </Link>
        {onDelete && (
          <button
            onClick={onDelete}
            disabled={busy}
            className="text-xs font-semibold disabled:opacity-50"
            style={{ color: bento.inkSoft, ...display }}
          >
            Delete
          </button>
        )}
      </div>
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
      <p className="text-[10px] uppercase tracking-wider font-semibold opacity-90" style={display}>{label}</p>
      <p className="text-2xl sm:text-3xl font-bold mt-1" style={display}>{value}</p>
      {sub && <p className="text-[10px] opacity-80 mt-0.5">{sub}</p>}
    </div>
  );
}
