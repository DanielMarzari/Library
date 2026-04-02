"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Book } from "@/types/book";

// Each milestone has a unique emoji, target, pace label, and description
const MILESTONES = [
  { target: 12,  emoji: "📄", label: "1/month",      desc: "One per month" },
  { target: 24,  emoji: "📕", label: "2/month",      desc: "Two per month" },
  { target: 36,  emoji: "📗", label: "3/month",      desc: "Three per month" },
  { target: 48,  emoji: "📘", label: "4/month",      desc: "Four per month" },
  { target: 52,  emoji: "🎯", label: "1/week",       desc: "One per week" },
  { target: 60,  emoji: "📙", label: "5/month",      desc: "Five per month" },
  { target: 61,  emoji: "🏅", label: "1 / 6 days",   desc: "Every six days" },
  { target: 73,  emoji: "🏆", label: "1 / 5 days",   desc: "Every five days" },
  { target: 91,  emoji: "👑", label: "1 / 4 days",   desc: "Every four days" },
  { target: 104, emoji: "🔥", label: "2/week",       desc: "Two per week" },
  { target: 122, emoji: "💎", label: "1 / 3 days",   desc: "Every three days" },
  { target: 156, emoji: "⚡", label: "3/week",       desc: "Three per week" },
  { target: 183, emoji: "🚀", label: "1 / 2 days",   desc: "Every two days" },
  { target: 208, emoji: "⭐", label: "4/week",       desc: "Four per week" },
  { target: 260, emoji: "🌟", label: "5/week",       desc: "Five per week" },
  { target: 365, emoji: "✨", label: "1/day",        desc: "One per day" },
];

const LIFE_GOAL = 1000;

function getCurrentMilestone(booksRead: number) {
  const achieved = MILESTONES.filter((m) => booksRead >= m.target);
  const next = MILESTONES.find((m) => booksRead < m.target) || null;
  const top = achieved.length > 0 ? achieved[achieved.length - 1] : null;
  return { achieved, top, next };
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

    const years = Object.keys(byYear)
      .map(Number)
      .sort((a, b) => b - a);
    if (!years.includes(currentYear)) years.unshift(currentYear);

    // Current year
    const thisYearCount = byYear[currentYear] || 0;
    const now = new Date();
    const dayOfYear = Math.ceil(
      (now.getTime() - new Date(currentYear, 0, 1).getTime()) / 86400000
    );
    const projectedThisYear = dayOfYear > 0
      ? Math.round((thisYearCount / dayOfYear) * 365)
      : 0;
    const currentMilestone = getCurrentMilestone(thisYearCount);

    // Life goal trajectory
    // Average books/year over all years with data
    const yearsWithData = Object.keys(byYear).map(Number).sort();
    const firstYear = yearsWithData.length > 0 ? yearsWithData[0] : currentYear;
    const spanYears = Math.max(1, currentYear - firstYear + (dayOfYear / 365));
    const avgBooksPerYear = totalRead / spanYears;
    const lifeRemaining = LIFE_GOAL - totalRead;
    const yearsToGoal = avgBooksPerYear > 0 ? Math.ceil(lifeRemaining / avgBooksPerYear) : null;
    const goalYear = yearsToGoal !== null ? currentYear + yearsToGoal : null;
    const lifePct = Math.round((totalRead / LIFE_GOAL) * 100);

    return {
      totalRead,
      byYear,
      years,
      thisYearCount,
      projectedThisYear,
      currentMilestone,
      lifePct,
      lifeRemaining,
      avgBooksPerYear: Math.round(avgBooksPerYear * 10) / 10,
      yearsToGoal,
      goalYear,
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
            {/* Current status */}
            <div className="flex items-center gap-4 mb-5">
              <div className="text-4xl">
                {currentMilestone.top ? currentMilestone.top.emoji : "📖"}
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-100">
                  {thisYearCount} books read
                </p>
                {currentMilestone.top && (
                  <p className="text-sm text-emerald-400 font-medium">
                    {currentMilestone.top.emoji} {currentMilestone.top.label} — {currentMilestone.top.desc}
                  </p>
                )}
              </div>
            </div>

            {/* Progress toward next milestone */}
            {currentMilestone.next && (
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">
                    Next: <span className="text-zinc-200 font-medium">{currentMilestone.next.emoji} {currentMilestone.next.label}</span> ({currentMilestone.next.desc})
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
                  {currentMilestone.next.target - thisYearCount} more to go · Projected: {projectedThisYear} this year
                  {projectedThisYear >= currentMilestone.next.target && (
                    <span className="text-emerald-400 ml-2">On pace!</span>
                  )}
                </p>
              </div>
            )}

            {/* Milestone grid — column-first layout */}
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">All Milestones</p>
            <div className="grid grid-rows-6 grid-flow-col gap-2 auto-cols-fr">
              {MILESTONES.map((m) => {
                const achieved = thisYearCount >= m.target;
                const isCurrent = currentMilestone.next?.target === m.target;
                return (
                  <div
                    key={m.target}
                    className={`px-3 py-2.5 rounded-lg text-xs border transition-all ${
                      achieved
                        ? "bg-emerald-950/80 border-emerald-700 text-emerald-200"
                        : isCurrent
                          ? "bg-zinc-800 border-emerald-500 text-zinc-100 ring-1 ring-emerald-500/30"
                          : "bg-zinc-800/40 border-zinc-800 text-zinc-600"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-base leading-none ${achieved ? "" : "grayscale opacity-40"}`}>{m.emoji}</span>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{m.label}</div>
                        <div className={`text-[10px] truncate ${achieved ? "text-emerald-400" : "text-zinc-600"}`}>
                          {m.target} books
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
            <div className="w-full bg-zinc-800 rounded-full h-3 mb-4">
              <div
                className="bg-gradient-to-r from-amber-600 to-amber-400 h-3 rounded-full transition-all"
                style={{ width: `${Math.min(stats.lifePct, 100)}%` }}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-zinc-500 text-xs">Remaining</p>
                <p className="text-zinc-100 font-bold text-lg">{stats.lifeRemaining}</p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-zinc-500 text-xs">Avg Books / Year</p>
                <p className="text-zinc-100 font-bold text-lg">{stats.avgBooksPerYear}</p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-zinc-500 text-xs">On Track For</p>
                <p className="text-amber-400 font-bold text-lg">
                  {stats.goalYear ? stats.goalYear : "—"}
                </p>
              </div>
            </div>
            {stats.yearsToGoal !== null && stats.avgBooksPerYear > 0 && (
              <p className="text-xs text-zinc-500 mt-3">
                At {stats.avgBooksPerYear} books/year, you'll hit 1,000 in ~{stats.yearsToGoal} years ({stats.goalYear}).
                {stats.lifeRemaining > 0 && (
                  <span className="text-zinc-400">
                    {" "}To reach it by {currentYear + 10}, you'd need ~{Math.ceil(stats.lifeRemaining / 10)} books/year.
                    To reach it by {currentYear + 5}, ~{Math.ceil(stats.lifeRemaining / 5)}/year.
                  </span>
                )}
              </p>
            )}
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
                        {milestone.top ? milestone.top.emoji : "○"}
                      </span>
                      <div>
                        <p className="font-bold text-zinc-100 text-lg">{year}</p>
                        <p className="text-sm text-zinc-400">{count} books read</p>
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
