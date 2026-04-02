"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Book } from "@/types/book";
import Link from "next/link";

// Colors for each year in the cumulative chart
const YEAR_COLORS: Record<number, string> = {
  2016: "#9ca3af",
  2017: "#a78bfa",
  2018: "#f472b6",
  2019: "#60a5fa",
  2020: "#ef4444",
  2021: "#eab308",
  2022: "#22c55e",
  2023: "#f97316",
  2024: "#06b6d4",
  2025: "#3b82f6",
  2026: "#ef4444",
};

const LENGTH_BUCKETS = [
  { label: "0-50", min: 0, max: 50 },
  { label: "51-100", min: 51, max: 100 },
  { label: "101-150", min: 101, max: 150 },
  { label: "151-200", min: 151, max: 200 },
  { label: "201-250", min: 201, max: 250 },
  { label: "251-300", min: 251, max: 300 },
  { label: "301-500", min: 301, max: 500 },
  { label: "501+", min: 501, max: 99999 },
];

export default function StatsPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("complete_date", { ascending: true });
      if (!ignore) {
        if (!error && data) setBooks(data);
        setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const stats = useMemo(() => {
    const total = books.length;
    const read = books.filter((b) => b.status === "read");
    const reading = books.filter((b) => b.status === "reading");
    const notRead = books.filter((b) => b.status === "not_read");

    const totalPages = books.reduce((s, b) => s + (b.reading_pages || b.pages || 0), 0);
    const readPages = read.reduce((s, b) => s + (b.reading_pages || b.pages || 0), 0);
    const readingPages = reading.reduce((s, b) => s + (b.current_page || 0), 0);
    const pctBooksRead = total > 0 ? ((read.length / total) * 100).toFixed(1) : "0";
    const pctPagesRead = totalPages > 0 ? (((readPages + readingPages) / totalPages) * 100).toFixed(1) : "0";

    // --- Year-over-year cumulative chart (books completed per week) ---
    const yearData: Record<number, number[]> = {};
    read.forEach((b) => {
      if (!b.complete_date) return;
      const d = new Date(b.complete_date);
      const year = d.getFullYear();
      const dayOfYear = Math.floor(
        (d.getTime() - new Date(year, 0, 1).getTime()) / 86400000
      );
      const week = Math.floor(dayOfYear / 7);
      if (!yearData[year]) yearData[year] = [];
      yearData[year].push(week);
    });

    // Build cumulative per year (53 weeks)
    const yearCumulative: Record<number, number[]> = {};
    Object.entries(yearData).forEach(([yr, weeks]) => {
      const y = parseInt(yr);
      const counts = new Array(53).fill(0);
      weeks.forEach((w) => {
        if (w < 53) counts[w]++;
      });
      // Cumulate
      const cum = new Array(53).fill(0);
      cum[0] = counts[0];
      for (let i = 1; i < 53; i++) {
        cum[i] = cum[i - 1] + counts[i];
      }
      yearCumulative[y] = cum;
    });

    const years = Object.keys(yearCumulative)
      .map(Number)
      .sort();
    const maxCumulative = Math.max(
      ...Object.values(yearCumulative).map((c) => Math.max(...c)),
      1
    );

    // --- Read/Unread/Reading by book length ---
    const lengthData = LENGTH_BUCKETS.map((bucket) => {
      const inBucket = books.filter((b) => {
        const p = b.reading_pages || b.pages || 0;
        return p >= bucket.min && p <= bucket.max;
      });
      const r = inBucket.filter((b) => b.status === "read").length;
      const rding = inBucket.filter((b) => b.status === "reading").length;
      const nr = inBucket.filter((b) => b.status === "not_read").length;
      const t = inBucket.length;
      return {
        label: bucket.label,
        read: r,
        reading: rding,
        notRead: nr,
        total: t,
        readPct: t > 0 ? (r / t) * 100 : 0,
        readingPct: t > 0 ? (rding / t) * 100 : 0,
        notReadPct: t > 0 ? (nr / t) * 100 : 0,
      };
    });

    // --- Reading rate from Jan 1 last year to present ---
    const jan1LastYear = new Date(new Date().getFullYear() - 1, 0, 1);
    const now = new Date();
    const recentBooks = read.filter(
      (b) => b.complete_date && new Date(b.complete_date) >= jan1LastYear
    );
    const daysSinceJan1 = Math.max(
      1,
      Math.ceil((now.getTime() - jan1LastYear.getTime()) / 86400000)
    );
    const booksPerMonth = recentBooks.length / (daysSinceJan1 / 30.44);
    const booksPerWeek = recentBooks.length / (daysSinceJan1 / 7);

    // Pages per day for recent
    const recentPages = recentBooks.reduce(
      (s, b) => s + (b.reading_pages || b.pages || 0),
      0
    );
    const pagesPerDay = Math.round(recentPages / daysSinceJan1);

    // Avg days per book
    const booksWithDates = read.filter((b) => b.start_date && b.complete_date);
    let avgDaysPerBook = 0;
    if (booksWithDates.length > 0) {
      const totalDays = booksWithDates.reduce((sum, b) => {
        const s = new Date(b.start_date!);
        const e = new Date(b.complete_date!);
        return sum + Math.max(1, Math.ceil((e.getTime() - s.getTime()) / 86400000));
      }, 0);
      avgDaysPerBook = Math.round(totalDays / booksWithDates.length);
    }

    // --- Top user topics ---
    const topicCounts: Record<string, number> = {};
    books.forEach((b) => {
      b.topics?.forEach((t) => {
        topicCounts[t] = (topicCounts[t] || 0) + 1;
      });
    });
    const topUserTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    // --- Top auto topics ---
    const autoTopicCounts: Record<string, number> = {};
    books.forEach((b) => {
      b.auto_topics?.forEach((t) => {
        autoTopicCounts[t] = (autoTopicCounts[t] || 0) + 1;
      });
    });
    const topAutoTopics = Object.entries(autoTopicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    // --- 1000 book life goal ---
    const LIFE_GOAL = 1000;
    const goalPct = ((read.length / LIFE_GOAL) * 100).toFixed(1);
    const goalRemaining = LIFE_GOAL - read.length;
    // Projected completion: use recent rate (booksPerMonth)
    let goalProjectedDate: string | null = null;
    const monthlyRate = recentBooks.length / (daysSinceJan1 / 30.44);
    if (monthlyRate > 0 && goalRemaining > 0) {
      const monthsLeft = goalRemaining / monthlyRate;
      const projected = new Date();
      projected.setMonth(projected.getMonth() + Math.ceil(monthsLeft));
      goalProjectedDate = projected.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }

    // --- Top sources ---
    const sourceCounts: Record<string, number> = {};
    books.forEach((b) => {
      if (b.source) sourceCounts[b.source] = (sourceCounts[b.source] || 0) + 1;
    });
    const topSources = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    return {
      total,
      readCount: read.length,
      readingCount: reading.length,
      notReadCount: notRead.length,
      totalPages,
      readPages,
      readingPages,
      pctBooksRead,
      pctPagesRead,
      yearCumulative,
      years,
      maxCumulative,
      lengthData,
      recentBooksCount: recentBooks.length,
      booksPerMonth: booksPerMonth.toFixed(1),
      booksPerWeek: booksPerWeek.toFixed(1),
      pagesPerDay,
      avgDaysPerBook,
      topUserTopics,
      topAutoTopics,
      topSources,
      goalPct,
      goalRemaining,
      goalProjectedDate,
      lifeGoal: LIFE_GOAL,
    };
  }, [books]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-700 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Reading Stats</h1>
          <Link
            href="/"
            className="text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors"
          >
            Back to Library
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-8">
        {/* Overview cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Books" value={stats.total} />
          <StatCard label="Read" value={stats.readCount} color="emerald" />
          <StatCard label="Reading" value={stats.readingCount} color="blue" />
          <StatCard label="Not Read" value={stats.notReadCount} />
        </div>

        {/* Percentages */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-2">Books Read</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-emerald-400">{stats.pctBooksRead}%</span>
              <span className="text-xs text-zinc-600 mb-1">{stats.readCount} / {stats.total}</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 mt-3">
              <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${stats.pctBooksRead}%` }} />
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-2">Pages Read</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-blue-400">{stats.pctPagesRead}%</span>
              <span className="text-xs text-zinc-600 mb-1">{(stats.readPages + stats.readingPages).toLocaleString()} / {stats.totalPages.toLocaleString()}</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 mt-3">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${stats.pctPagesRead}%` }} />
            </div>
          </div>
        </div>

        {/* 1000 Book Life Goal */}
        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">Life Goal: {stats.lifeGoal.toLocaleString()} Books</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-end gap-3 mb-3">
              <span className="text-4xl font-bold text-amber-400">{stats.goalPct}%</span>
              <span className="text-sm text-zinc-500 mb-1">{stats.readCount} / {stats.lifeGoal.toLocaleString()}</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-3 mb-3">
              <div className="bg-gradient-to-r from-amber-600 to-amber-400 h-3 rounded-full transition-all" style={{ width: `${Math.min(parseFloat(stats.goalPct), 100)}%` }} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">{stats.goalRemaining} books to go</span>
              {stats.goalProjectedDate && (
                <span className="text-zinc-500">On track for <span className="text-amber-400 font-medium">{stats.goalProjectedDate}</span></span>
              )}
            </div>
          </div>
        </section>

        {/* Reading rate */}
        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">
            Reading Rate <span className="text-sm text-zinc-500 font-normal">(Jan {new Date().getFullYear() - 1} - Present)</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Books Completed" value={stats.recentBooksCount} color="emerald" />
            <StatCard label="Books / Month" value={stats.booksPerMonth} />
            <StatCard label="Books / Week" value={stats.booksPerWeek} />
            <StatCard label="Pages / Day" value={stats.pagesPerDay} />
          </div>
          {stats.avgDaysPerBook > 0 && (
            <p className="text-sm text-zinc-500 mt-3">
              Average time to finish a book: <span className="text-zinc-300 font-medium">{stats.avgDaysPerBook} days</span>
            </p>
          )}
        </section>

        {/* Year-over-year cumulative chart */}
        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">
            Books Completed by Year
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-4">
              {stats.years.map((yr) => (
                <div key={yr} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-1.5 rounded-full"
                    style={{
                      backgroundColor: YEAR_COLORS[yr] || "#6b7280",
                      ...(yr === new Date().getFullYear()
                        ? { borderStyle: "dashed", borderWidth: 1, borderColor: YEAR_COLORS[yr] || "#6b7280", backgroundColor: "transparent" }
                        : {}),
                    }}
                  />
                  <span className="text-[10px] text-zinc-400 font-medium">{yr}</span>
                </div>
              ))}
            </div>

            {/* SVG Chart */}
            <div className="relative" style={{ height: 200 }}>
              <svg viewBox="0 0 530 200" className="w-full h-full" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                  <line
                    key={pct}
                    x1="0"
                    y1={200 - pct * 200}
                    x2="530"
                    y2={200 - pct * 200}
                    stroke="#27272a"
                    strokeWidth="1"
                  />
                ))}

                {/* Lines per year */}
                {stats.years.map((yr) => {
                  const cum = stats.yearCumulative[yr];
                  const points = cum
                    .map((v, i) => `${i * 10},${200 - (v / stats.maxCumulative) * 190}`)
                    .join(" ");

                  const isCurrentYear = yr === new Date().getFullYear();
                  return (
                    <polyline
                      key={yr}
                      points={points}
                      fill="none"
                      stroke={YEAR_COLORS[yr] || "#6b7280"}
                      strokeWidth={isCurrentYear ? 2.5 : 1.5}
                      strokeDasharray={isCurrentYear ? "6 3" : undefined}
                      opacity={isCurrentYear ? 1 : 0.8}
                    />
                  );
                })}
              </svg>

              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between pointer-events-none">
                <span className="text-[9px] text-zinc-600">{stats.maxCumulative}</span>
                <span className="text-[9px] text-zinc-600">{Math.round(stats.maxCumulative / 2)}</span>
                <span className="text-[9px] text-zinc-600">0</span>
              </div>

              {/* X-axis labels */}
              <div className="flex justify-between mt-1">
                {[0, 10, 20, 30, 40, 52].map((w) => (
                  <span key={w} className="text-[9px] text-zinc-600">
                    {w}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-zinc-600 text-center mt-1">Week of Year</p>
          </div>
        </section>

        {/* Ratio by book length */}
        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-3">
            Read / Unread Ratio by Book Length
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-4 mb-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span className="text-zinc-400">Read</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-blue-500" />
                <span className="text-zinc-400">Reading</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-rose-400/60" />
                <span className="text-zinc-400">Unread</span>
              </div>
            </div>

            <div className="flex items-end gap-2 h-48">
              {stats.lengthData.map((d) => (
                <div key={d.label} className="flex-1 flex flex-col items-center h-full justify-end">
                  {d.total > 0 ? (
                    <div className="w-full flex flex-col rounded-t overflow-hidden" style={{ height: "100%" }}>
                      <div className="bg-rose-400/60 transition-all" style={{ flex: d.notReadPct }} />
                      <div className="bg-blue-500 transition-all" style={{ flex: d.readingPct }} />
                      <div className="bg-emerald-500 transition-all" style={{ flex: d.readPct }} />
                    </div>
                  ) : (
                    <div className="w-full bg-zinc-800 h-2 rounded-t" />
                  )}
                  <span className="text-[9px] text-zinc-500 mt-2 whitespace-nowrap">{d.label}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-zinc-600 text-center mt-1">Book Length (pages)</p>
          </div>
        </section>

        {/* Top sources */}
        {stats.topSources.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-3">Top Sources</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2.5">
              {stats.topSources.map(([source, count]) => (
                <div key={source} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-300">{source}</span>
                  <span className="text-sm text-zinc-500">{count}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Topics - two columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {stats.topUserTopics.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-zinc-100 mb-3">Your Topics</h2>
              <div className="flex flex-wrap gap-1.5">
                {stats.topUserTopics.map(([topic, count]) => (
                  <span key={topic} className="bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-full text-xs">
                    {topic} <span className="text-zinc-500">({count})</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          {stats.topAutoTopics.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-zinc-100 mb-3">Standard Subjects</h2>
              <div className="flex flex-wrap gap-1.5">
                {stats.topAutoTopics.map(([topic, count]) => (
                  <span key={topic} className="bg-zinc-800/50 text-zinc-400 px-2.5 py-1 rounded-full text-xs">
                    {topic} <span className="text-zinc-500">({count})</span>
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "default",
}: {
  label: string;
  value: string | number;
  color?: "emerald" | "blue" | "default";
}) {
  const valueColor: Record<string, string> = {
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    default: "text-zinc-100",
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueColor[color]}`}>{value}</p>
    </div>
  );
}
