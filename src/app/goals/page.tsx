"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Book } from "@/types/book";

export const dynamic = "force-dynamic";

interface ReadingGoal {
  id: string;
  year: number;
  target: number;
  created_at: string;
}

interface YearStats {
  year: number;
  target: number;
  booksRead: number;
  progress: number;
  badge?: string;
  badgeEmoji?: string;
}

const getBadge = (progress: number): { emoji: string; label: string } | null => {
  if (progress >= 125) return { emoji: "💎", label: "Exceeded by 25%+" };
  if (progress >= 100) return { emoji: "🥇", label: "Goal Completed!" };
  if (progress >= 75) return { emoji: "🥈", label: "75% Done!" };
  if (progress >= 50) return { emoji: "🥉", label: "Halfway There!" };
  return null;
};

const calculatePace = (
  booksRead: number,
  monthsElapsed: number,
  target: number
): { projected: number; onPace: boolean } => {
  if (monthsElapsed === 0) return { projected: 0, onPace: false };
  const projected = Math.round((booksRead / monthsElapsed) * 12);
  return { projected, onPace: projected >= target };
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<ReadingGoal[]>([]);
  const [yearStats, setYearStats] = useState<YearStats[]>([]);
  const [lifeProgress, setLifeProgress] = useState({ total: 0, target: 1000 });
  const [loading, setLoading] = useState(true);
  const [editingYear, setEditingYear] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-11

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch reading goals
        const { data: goalsData, error: goalsError } = await supabase
          .from("reading_goals")
          .select("*")
          .order("year", { ascending: false });

        if (goalsError) throw goalsError;

        // Fetch all books to calculate stats
        const { data: booksData, error: booksError } = await supabase
          .from("books")
          .select("*");

        if (booksError) throw booksError;

        const books = booksData as Book[];

        // Get or create goal for current year
        let currentGoal = goalsData?.find((g) => g.year === currentYear);
        if (!currentGoal) {
          const { data: newGoal } = await supabase
            .from("reading_goals")
            .insert({ year: currentYear, target: 12 })
            .select()
            .single();
          currentGoal = newGoal;
        }

        // Calculate stats for each year
        const allYears = new Set([
          currentYear,
          ...(goalsData?.map((g) => g.year) || []),
          ...books
            .filter((b) => b.complete_date)
            .map((b) => new Date(b.complete_date!).getFullYear()),
        ]);

        const stats: YearStats[] = Array.from(allYears)
          .sort((a, b) => b - a)
          .map((year) => {
            const goal = goalsData?.find((g) => g.year === year) || {
              year,
              target: 12,
            };
            const booksRead = books.filter((b) => {
              if (!b.complete_date || b.status !== "read") return false;
              return new Date(b.complete_date).getFullYear() === year;
            }).length;
            const progress = (booksRead / goal.target) * 100;

            return {
              year,
              target: goal.target,
              booksRead,
              progress: Math.round(progress),
            };
          });

        setGoals(goalsData || []);
        setYearStats(stats);

        // Calculate life progress
        const totalBooksRead = books.filter(
          (b) => b.status === "read"
        ).length;
        setLifeProgress({ total: totalBooksRead, target: 1000 });
      } catch (error) {
        console.error("Error fetching goals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleUpdateTarget = async (year: number, newTarget: number) => {
    if (newTarget < 1) return;

    try {
      const existingGoal = goals.find((g) => g.year === year);

      if (existingGoal) {
        await supabase
          .from("reading_goals")
          .update({ target: newTarget })
          .eq("id", existingGoal.id);
      } else {
        await supabase
          .from("reading_goals")
          .insert({ year, target: newTarget });
      }

      // Recalculate stats
      setYearStats((prev) =>
        prev.map((stat) => {
          if (stat.year === year) {
            const progress = (stat.booksRead / newTarget) * 100;
            return { ...stat, target: newTarget, progress: Math.round(progress) };
          }
          return stat;
        })
      );

      setEditingYear(null);
      setEditValue("");
    } catch (error) {
      console.error("Error updating goal:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 text-emerald-500">
            Reading Goals
          </h1>
          <p className="text-zinc-400 mb-8">Loading your goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-emerald-500">
              Reading Goals
            </h1>
            <p className="text-zinc-400 mt-1">
              Track your reading journey and celebrate milestones
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-emerald-500 rounded-lg transition"
          >
            ← Back to Library
          </Link>
        </div>

        {/* Life Goal */}
        <div className="bg-zinc-900 rounded-lg p-6 mb-8 border border-zinc-800">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">
            The Big Goal: 1000 Books
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-semibold">
                  {lifeProgress.total} / {lifeProgress.target} books
                </span>
                <span className="text-emerald-400 font-bold">
                  {Math.round(
                    (lifeProgress.total / lifeProgress.target) * 100
                  )}
                  %
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-4">
                <div
                  className="bg-emerald-500 h-4 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      (lifeProgress.total / lifeProgress.target) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
            <div className="text-3xl">
              {lifeProgress.total >= 1000
                ? "🎊"
                : lifeProgress.total >= 750
                  ? "🚀"
                  : "📚"}
            </div>
          </div>
        </div>

        {/* Yearly Goals */}
        <div className="space-y-6">
          {yearStats.map((stat) => {
            const badge = getBadge(stat.progress);
            const isCurrentYear = stat.year === currentYear;
            const monthsElapsed = isCurrentYear ? currentMonth + 1 : 12;
            const pace = isCurrentYear
              ? calculatePace(stat.booksRead, monthsElapsed, stat.target)
              : null;

            return (
              <div
                key={stat.year}
                className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 hover:border-emerald-500/30 transition"
              >
                {/* Year Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold text-white">
                      {stat.year}
                    </h3>
                    {badge && (
                      <span
                        className="text-2xl"
                        title={badge.label}
                      >
                        {badge.emoji}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-zinc-400 mb-1">Target:</div>
                    {editingYear === stat.year ? (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-16 px-2 py-1 bg-zinc-800 text-white rounded border border-emerald-500 text-center"
                          min="1"
                          autoFocus
                        />
                        <button
                          onClick={() =>
                            handleUpdateTarget(stat.year, parseInt(editValue))
                          }
                          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold rounded text-sm transition"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingYear(null)}
                          className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm transition"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingYear(stat.year);
                          setEditValue(stat.target.toString());
                        }}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                      >
                        {stat.target} books
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-semibold">
                      {stat.booksRead} / {stat.target} books
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {stat.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(stat.progress, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-zinc-800 rounded p-3">
                    <div className="text-zinc-400 text-xs uppercase tracking-wide">
                      Books Read
                    </div>
                    <div className="text-emerald-400 font-bold text-lg mt-1">
                      {stat.booksRead}
                    </div>
                  </div>

                  <div className="bg-zinc-800 rounded p-3">
                    <div className="text-zinc-400 text-xs uppercase tracking-wide">
                      Remaining
                    </div>
                    <div className="text-emerald-400 font-bold text-lg mt-1">
                      {Math.max(0, stat.target - stat.booksRead)}
                    </div>
                  </div>

                  {pace && (
                    <>
                      <div className="bg-zinc-800 rounded p-3">
                        <div className="text-zinc-400 text-xs uppercase tracking-wide">
                          Current Pace
                        </div>
                        <div className="text-emerald-400 font-bold text-lg mt-1">
                          {pace.projected}
                        </div>
                      </div>

                      <div className="bg-zinc-800 rounded p-3">
                        <div className="text-zinc-400 text-xs uppercase tracking-wide">
                          Status
                        </div>
                        <div
                          className={`font-bold text-lg mt-1 ${
                            pace.onPace
                              ? "text-emerald-400"
                              : "text-amber-400"
                          }`}
                        >
                          {pace.onPace ? "On Track" : "Behind"}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Badge Description */}
                {badge && (
                  <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded text-sm text-emerald-300">
                    <span className="font-semibold">{badge.emoji}</span>{" "}
                    {badge.label}
                  </div>
                )}
              </div>
            );
          })}

          {yearStats.length === 0 && (
            <div className="bg-zinc-900 rounded-lg p-8 text-center border border-zinc-800">
              <p className="text-zinc-400">No reading goals yet.</p>
            </div>
          )}
        </div>

        {/* Footer Tips */}
        <div className="mt-12 p-6 bg-zinc-900 rounded-lg border border-zinc-800">
          <h3 className="text-emerald-400 font-bold mb-3">Tips</h3>
          <ul className="text-zinc-300 text-sm space-y-2">
            <li>
              Click on your target to edit it for any year
            </li>
            <li>
              Current year shows your projected total based on pace so far
            </li>
            <li>
              Badges are earned at 50%, 75%, 100%, and 125%+ of your target
            </li>
            <li>
              Your big goal is to read 1000 books in a lifetime
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
