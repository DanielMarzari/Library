"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Book } from "@/types/book";

// Milestone tiers: books per year → label + description
const MILESTONES = [
  { target: 12, label: "1/month", desc: "One book per month" },
  { target: 24, label: "2/month", desc: "Two books per month" },
  { target: 36, label: "3/month", desc: "Three books per month" },
  { target: 48, label: "4/month", desc: "Four books per month" },
  { target: 52, label: "1/week", desc: "One book per week" },
  { target: 60, label: "5/month", desc: "Five books per month" },
  { target: 73, label: "1/5 days", desc: "One every five days" },
  { target: 91, label: "1/4 days", desc: "One every four days" },
  { target: 104, label: "2/week", desc: "Two books per week" },
  { target: 122, label: "1/3 days", desc: "One every three days" },
  { target: 156, label: "3/week", desc: "Three books per week" },
  { target: 183, label: "1/2 days", desc: "One every two days" },
  { target: 365, label: "1/day", desc: "One book per day" },
];

const LIFE_GOAL = 1000;

function getCurrentMilestone(booksRead: number) {
  let achieved = MILESTONES.filter((m) => booksRead >= m.target);
  let next = MILESTONES.find((m) => booksRead < m.target) || null;
  let top = achieved.length > 0 ? achieved[achieved.length - 1] : null;
  return { achieved, top, next };
}

function getMilestoneEmoji(target: number): string {
  if (target >= 183) return "👑";
  if (target >= 104) return "💎";
  if (target >= 73) return "🏆";
  if (target >= 52) return "🥇";
  if (target >= 36) return "🥈";
  if (target >= 24) return "🥉";
  return "📖";
}

export default function GoalsPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("books").select("*");
      if (!error && data) setBooks(data as Book[]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const readBooks = books.filter((b) => b.status === "read" && b.complete_date);
    const totalRead = readBooks.length;

    // Group by year
    const byYear: Record<number, number> = {};
    readBooks.forEach((b) => {
      const year = new Date(b.complete_date!).getFullYear();
      byYear[year] = (byYear[year] || 0) + 1;
    });

    // All years that have data
    const years = Object.keys(byYear)
      .map(Number)
      .sort((a, b) => b - a);

    // Ensure current year is included
    if (!years.includes(currentYear)) years.unshift(currentYear);

    // Current year stats
    const thisYearCount = byYear[currentYear] || 0;
    const now = new Date();
    const dayOfYear = Math.ceil(
      (now.getTime() - new Date(currentYear, 0, 1).getTime()) / 86400000
    );
    const projectedThisYear = Math.round((thisYearCount / Math.max(dayOfYear, 1)) * 365);
    const currentMilestone = getCurrentMilestone(thisYearCount);

    // Life goal
    const lifePct = Math.round((totalRead / LIFE_GOAL) * 100);
    const lifeRemaining = LIFE_GOAL - totalRead;

    return {
      totalRead,
      byYear,
      years,
      thisYearCount,
      projectedThisYear,
      currentMilestone,
      lifePct,
      lifeRemaining,
      dayOfYear,
    };
  }, [books, currentYear]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-700 border-t-emerald-500" />
      </div>
    );
  }

  const { currentMilestone, thisYearCount, projectedThisYear } = stats;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-emerald-500">Reading Goals</h1>
          <Link
            href="/"
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-zinc-200 transition-colors text-sm font-medium"
          >
            Back to Library
          </Link>
        </div>

        {/* Current Year — Active Goal */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">{currentYear} Progress</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            {/* Current milestone achieved */}
            <div className="flex items-center gap-4 mb-5">
              <div className="text-4xl">
                {currentMilestone.top ? getMilestoneEmoji(currentMilestone.top.target) : "📖"}
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">
                  {thisYearCount} books read
                </p>
                {currentMilestone.top && (
                  <p className="text-sm text-emerald-400 font-medium">
                    Achieved: {currentMilestone.top.label} — {currentMilestone.top.desc}
                  </p>
                )}
              </div>
            </div>

            {/* Progress toward next milestone */}
            {currentMilestone.next && (
              <div className="mb-5">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">
                    Next: <span className="text-zinc-200 font-medium">{currentMilestone.next.label}</span> ({currentMilestone.next.desc})
                  </span>
                  <span className="text-zinc-300 font-medium">
                    {thisYearCount} / {currentMilestone.next.target}
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min((thisYearCount / currentMilestone.next.target) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  {currentMilestone.next.target - thisYearCount} more to go · Projected: {projectedThisYear} books this year
                  {projectedThisYear >= currentMilestone.next.target && (
                    <span className="text-emerald-400 ml-2">On pace!</span>
                  )}
                </p>
              </div>
            )}

            {/* All milestones for this year */}
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Milestones</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {MILESTONES.filter((m) => m.target <= 104).map((m) => {
                  const achieved = thisYearCount >= m.target;
                  const isCurrent = currentMilestone.next?.target === m.target;
                  return (
                    <div
                      key={m.target}
                      className={`px-3 py-2 rounded-lg text-xs border transition-colors ${
                        achieved
                          ? "bg-emerald-950 border-emerald-700 text-emerald-300"
                          : isCurrent
                            ? "bg-zinc-800 border-emerald-600 text-zinc-200"
                            : "bg-zinc-800/50 border-zinc-800 text-zinc-600"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{achieved ? getMilestoneEmoji(m.target) : "○"}</span>
                        <div>
                          <span className="font-medium">{m.label}</span>
                          <span className="ml-1 text-zinc-500">({m.target})</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Life Goal */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">Life Goal: {LIFE_GOAL.toLocaleString()} Books</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-end gap-3 mb-3">
              <span className="text-4xl font-bold text-amber-400">{stats.lifePct}%</span>
              <span className="text-sm text-zinc-500 mb-1">{stats.totalRead} / {LIFE_GOAL.toLocaleString()}</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-3 mb-3">
              <div
                className="bg-gradient-to-r from-amber-600 to-amber-400 h-3 rounded-full transition-all"
                style={{ width: `${Math.min(stats.lifePct, 100)}%` }}
              />
            </div>
            <p className="text-sm text-zinc-400">{stats.lifeRemaining} books to go</p>
          </div>
        </section>

        {/* Past Years — Award Summary */}
        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">Past Years</h2>
          <div className="space-y-3">
            {stats.years
              .filter((y) => y !== currentYear)
              .map((year) => {
                const count = stats.byYear[year] || 0;
                const milestone = getCurrentMilestone(count);
                return (
                  <div
                    key={year}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">
                        {milestone.top ? getMilestoneEmoji(milestone.top.target) : "📖"}
                      </span>
                      <div>
                        <p className="font-bold text-zinc-100 text-lg">{year}</p>
                        <p className="text-sm text-zinc-400">
                          {count} books read
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {milestone.top ? (
                        <div>
                          <p className="text-emerald-400 font-semibold text-sm">{milestone.top.label}</p>
                          <p className="text-xs text-zinc-500">{milestone.top.desc}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-600">No milestone reached</p>
                      )}
                    </div>
                  </div>
                );
              })}

            {stats.years.filter((y) => y !== currentYear).length === 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center text-zinc-500">
                No past year data yet. Keep reading!
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
