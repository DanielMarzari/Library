"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Book } from "@/types/book";
import Link from "next/link";

interface ReadingUpdate {
  id: string;
  book_id: string;
  pages_read: number;
  created_at: string;
}

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

interface AuthorMeta {
  name: string;
  gender: string | null;
  ethnicity: string | null;
  nationality: string | null;
}

export default function StatsPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [readingUpdates, setReadingUpdates] = useState<ReadingUpdate[]>([]);
  const [authorMeta, setAuthorMeta] = useState<AuthorMeta[]>([]);
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

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("reading_updates")
        .select("*");
      if (!ignore) {
        if (!error && data) setReadingUpdates(data as ReadingUpdate[]);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      const { data } = await supabase
        .from("authors")
        .select("name,gender,ethnicity,nationality");
      if (!ignore && data) setAuthorMeta(data as AuthorMeta[]);
    };
    load();
    return () => { ignore = true; };
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
    const avgPagesPerDay = Math.round(recentPages / daysSinceJan1);

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

    // --- Scatter plot: duration vs book length, sized by rating ---
    const scatterData: Array<{ title: string; days: number; pages: number; rating: number }> = [];
    read.forEach((b) => {
      if (!b.start_date || !b.complete_date) return;
      const pages = b.reading_pages || b.pages || 0;
      if (pages === 0) return;
      const startDate = new Date(b.start_date);
      const endDate = new Date(b.complete_date);
      const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));
      scatterData.push({
        title: b.title || "Unknown",
        days: Math.min(days, 365),
        pages: Math.min(pages, 1000),
        rating: b.rating || 0,
      });
    });
    const maxScatterDays = Math.max(...scatterData.map((d) => d.days), 30);
    const maxScatterPages = Math.max(...scatterData.map((d) => d.pages), 100);

    // --- Projected books this year ---
    const thisYearStart = new Date(now.getFullYear(), 0, 1);
    const booksThisYear = read.filter(
      (b) => b.complete_date && new Date(b.complete_date) >= thisYearStart
    ).length;
    const daysSoFarThisYear = Math.max(1, Math.ceil((now.getTime() - thisYearStart.getTime()) / 86400000));
    const projectedBooksThisYear = Math.round((booksThisYear / daysSoFarThisYear) * 365);

    // --- Reading heatmap (last 12 months) ---
    const heatmapStartDate = new Date(now);
    heatmapStartDate.setFullYear(heatmapStartDate.getFullYear() - 1);

    // Normalize dates to start of day for comparison
    const pagesPerDay: Record<string, number> = {};
    const daysWithActivity = new Set<string>();

    // Add pages from reading_updates
    readingUpdates.forEach((update) => {
      const date = new Date(update.created_at);
      if (date >= heatmapStartDate && date <= now) {
        const dateKey = date.toISOString().split('T')[0];
        pagesPerDay[dateKey] = (pagesPerDay[dateKey] || 0) + update.pages_read;
        daysWithActivity.add(dateKey);
      }
    });

    // Add completion dates (if no reading_updates that day)
    read.forEach((b) => {
      if (b.complete_date) {
        const date = new Date(b.complete_date);
        if (date >= heatmapStartDate && date <= now) {
          const dateKey = date.toISOString().split('T')[0];
          if (!pagesPerDay[dateKey]) {
            pagesPerDay[dateKey] = b.reading_pages || b.pages || 0;
          }
          daysWithActivity.add(dateKey);
        }
      }
    });

    const totalHeatmapPages = Object.values(pagesPerDay).reduce((a, b) => a + b, 0);
    const maxPagesInDay = Math.max(...Object.values(pagesPerDay), 1);

    // --- Author stats ---
    const authorCounts: Record<string, { books: number; read: number }> = {};
    books.forEach((b) => {
      if (!b.author) return;
      b.author.split(",").map((a) => a.trim()).filter(Boolean).forEach((name) => {
        if (!authorCounts[name]) authorCounts[name] = { books: 0, read: 0 };
        authorCounts[name].books++;
        if (b.status === "read") authorCounts[name].read++;
      });
    });
    const uniqueAuthors = Object.keys(authorCounts).length;
    const topAuthors = Object.entries(authorCounts)
      .sort((a, b) => b[1].books - a[1].books)
      .slice(0, 8);

    // --- Skill/topic stats ---
    const allTopicCounts: Record<string, { total: number; read: number }> = {};
    books.forEach((b) => {
      const allT = new Set<string>();
      b.topics?.forEach((t) => allT.add(t));
      b.auto_topics?.forEach((t) => allT.add(t));
      allT.forEach((t) => {
        if (!allTopicCounts[t]) allTopicCounts[t] = { total: 0, read: 0 };
        allTopicCounts[t].total++;
        if (b.status === "read") allTopicCounts[t].read++;
      });
    });
    const expertSkills = Object.values(allTopicCounts).filter((t) => t.read >= 20).length;
    const masterSkills = Object.values(allTopicCounts).filter((t) => t.read >= 50).length;

    // --- Top sources ---
    const sourceCounts: Record<string, number> = {};
    books.forEach((b) => {
      if (b.source) sourceCounts[b.source] = (sourceCounts[b.source] || 0) + 1;
    });
    const topSources = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // --- Author diversity ---
    const metaByName: Record<string, AuthorMeta> = {};
    authorMeta.forEach((a) => { metaByName[a.name] = a; });

    // Gender counts weighted by number of books
    const genderBookCounts: Record<string, number> = { Male: 0, Female: 0, Unknown: 0 };
    const genderAuthorCounts: Record<string, number> = { Male: 0, Female: 0, Unknown: 0 };
    const ethnicityBookCounts: Record<string, number> = {};
    const ethnicityAuthorCounts: Record<string, number> = {};

    Object.entries(authorCounts).forEach(([name, counts]) => {
      const meta = metaByName[name];
      const gender = meta?.gender || "Unknown";
      const genderKey = gender.charAt(0).toUpperCase() === "M" ? "Male" : gender.charAt(0).toUpperCase() === "F" ? "Female" : "Unknown";
      genderBookCounts[genderKey] = (genderBookCounts[genderKey] || 0) + counts.books;
      genderAuthorCounts[genderKey] = (genderAuthorCounts[genderKey] || 0) + 1;

      const ethnicity = meta?.ethnicity || null;
      if (ethnicity) {
        ethnicityBookCounts[ethnicity] = (ethnicityBookCounts[ethnicity] || 0) + counts.books;
        ethnicityAuthorCounts[ethnicity] = (ethnicityAuthorCounts[ethnicity] || 0) + 1;
      }
    });

    const totalGenderBooks = genderBookCounts.Male + genderBookCounts.Female + genderBookCounts.Unknown;
    const topEthnicities = Object.entries(ethnicityBookCounts)
      .sort((a, b) => b[1] - a[1]);

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
      avgPagesPerDay,
      pagesPerDay,
      avgDaysPerBook,
      topUserTopics,
      topAutoTopics,
      scatterData,
      maxScatterDays,
      maxScatterPages,
      projectedBooksThisYear,
      booksThisYear,
      uniqueAuthors,
      topAuthors,
      expertSkills,
      masterSkills,
      topSources,
      goalPct,
      goalRemaining,
      goalProjectedDate,
      lifeGoal: LIFE_GOAL,
      heatmapStartDate,
      totalHeatmapPages,
      maxPagesInDay,
      daysWithActivity,
      genderBookCounts,
      genderAuthorCounts,
      totalGenderBooks,
      topEthnicities,
      ethnicityAuthorCounts,
    };
  }, [books, readingUpdates, authorMeta]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border-custom border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border-custom">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Reading Stats</h1>
          <Link
            href="/"
            className="text-muted hover:text-foreground text-sm font-medium transition-colors"
          >
            Back to Library
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-6 space-y-8">
        {/* Overview cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Books" value={stats.total} />
          <StatCard label="Read" value={stats.readCount} color="emerald" />
          <StatCard label="Reading" value={stats.readingCount} color="blue" />
          <StatCard label="Not Read" value={stats.notReadCount} />
        </div>

        {/* Percentages */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface border border-border-custom rounded-xl p-4">
            <p className="text-xs text-muted mb-2">Books Read</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-emerald-400">{stats.pctBooksRead}%</span>
              <span className="text-xs text-muted-2 mb-1">{stats.readCount} / {stats.total}</span>
            </div>
            <div className="w-full bg-surface-2 rounded-full h-2 mt-3">
              <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${stats.pctBooksRead}%` }} />
            </div>
          </div>
          <div className="bg-surface border border-border-custom rounded-xl p-4">
            <p className="text-xs text-muted mb-2">Pages Read</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-blue-400">{stats.pctPagesRead}%</span>
              <span className="text-xs text-muted-2 mb-1">{(stats.readPages + stats.readingPages).toLocaleString()} / {stats.totalPages.toLocaleString()}</span>
            </div>
            <div className="w-full bg-surface-2 rounded-full h-2 mt-3">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${stats.pctPagesRead}%` }} />
            </div>
          </div>
        </div>

        {/* 1000 Book Life Goal */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Life Goal: {stats.lifeGoal.toLocaleString()} Books</h2>
          <div className="bg-surface border border-border-custom rounded-xl p-5">
            <div className="flex items-end gap-3 mb-3">
              <span className="text-4xl font-bold text-amber-400">{stats.goalPct}%</span>
              <span className="text-sm text-muted mb-1">{stats.readCount} / {stats.lifeGoal.toLocaleString()}</span>
            </div>
            <div className="w-full bg-surface-2 rounded-full h-3 mb-3">
              <div className="bg-gradient-to-r from-amber-600 to-amber-400 h-3 rounded-full transition-all" style={{ width: `${Math.min(parseFloat(stats.goalPct), 100)}%` }} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">{stats.goalRemaining} books to go</span>
              {stats.goalProjectedDate && (
                <span className="text-muted">On track for <span className="text-amber-400 font-medium">{stats.goalProjectedDate}</span></span>
              )}
            </div>
          </div>
        </section>

        {/* Reading rate */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Reading Rate <span className="text-sm text-muted font-normal">(Jan {new Date().getFullYear() - 1} - Present)</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatCard label="Books Completed" value={stats.recentBooksCount} color="emerald" />
            <StatCard label="Books / Month" value={stats.booksPerMonth} />
            <StatCard label="Books / Week" value={stats.booksPerWeek} />
            <StatCard label="Pages / Day" value={stats.avgPagesPerDay} />
            <StatCard label={`Projected ${new Date().getFullYear()}`} value={stats.projectedBooksThisYear} color="blue" />
          </div>
          {stats.avgDaysPerBook > 0 && (
            <p className="text-sm text-muted mt-3">
              Average time to finish a book: <span className="text-foreground font-medium">{stats.avgDaysPerBook} days</span>
            </p>
          )}
        </section>

        {/* Reading Activity Heatmap */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Reading Activity Heatmap</h2>
          <div className="bg-surface border border-border-custom rounded-xl p-6">
            <ContributionHeatmap
              startDate={stats.heatmapStartDate}
              pagesPerDay={stats.pagesPerDay}
              maxPagesInDay={stats.maxPagesInDay}
            />
            <p className="text-sm text-muted mt-4">
              {stats.totalHeatmapPages.toLocaleString()} pages across {stats.daysWithActivity.size} days in the last year
            </p>
          </div>
        </section>

        {/* Year-over-year cumulative chart */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Books Completed by Year
          </h2>
          <div className="bg-surface border border-border-custom rounded-xl p-4">
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
                  <span className="text-[10px] text-muted font-medium">{yr}</span>
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
                <span className="text-[9px] text-muted-2">{stats.maxCumulative}</span>
                <span className="text-[9px] text-muted-2">{Math.round(stats.maxCumulative / 2)}</span>
                <span className="text-[9px] text-muted-2">0</span>
              </div>

              {/* X-axis labels */}
              <div className="flex justify-between mt-1">
                {[0, 10, 20, 30, 40, 52].map((w) => (
                  <span key={w} className="text-[9px] text-muted-2">
                    {w}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-muted-2 text-center mt-1">Week of Year</p>
          </div>
        </section>

        {/* Ratio by book length */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Read / Unread Ratio by Book Length
          </h2>
          <div className="bg-surface border border-border-custom rounded-xl p-4">
            <div className="flex items-center gap-4 mb-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span className="text-muted">Read</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-blue-500" />
                <span className="text-muted">Reading</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-rose-400/60" />
                <span className="text-muted">Unread</span>
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
                    <div className="w-full bg-surface-2 h-2 rounded-t" />
                  )}
                  <span className="text-[9px] text-muted mt-2 whitespace-nowrap">{d.label}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-2 text-center mt-1">Book Length (pages)</p>
          </div>
        </section>

        {/* Duration vs Book Length scatter plot */}
        {stats.scatterData.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-1">Reading Duration vs Book Length</h2>
            <p className="text-sm text-muted mb-3">How long do different sized books take? Dot size = rating.</p>
            <div className="bg-surface border border-border-custom rounded-xl p-4">
              <div className="relative" style={{ height: 320 }}>
                <svg viewBox="0 0 520 310" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                    <g key={`grid-${pct}`}>
                      <line x1={60 + pct * 420} y1="20" x2={60 + pct * 420} y2="270" stroke="#27272a" strokeWidth="1" />
                      <line x1="60" y1={270 - pct * 250} x2="480" y2={270 - pct * 250} stroke="#27272a" strokeWidth="1" />
                    </g>
                  ))}

                  {/* Axes */}
                  <line x1="60" y1="270" x2="480" y2="270" stroke="#52525b" strokeWidth="2" />
                  <line x1="60" y1="20" x2="60" y2="270" stroke="#52525b" strokeWidth="2" />

                  {/* Y-axis labels (pages) */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                    <text key={`yl-${pct}`} x="55" y={273 - pct * 250} textAnchor="end" fill="#52525b" fontSize="9" dominantBaseline="middle">
                      {Math.round(pct * stats.maxScatterPages)}
                    </text>
                  ))}

                  {/* X-axis labels (days) */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
                    <text key={`xl-${pct}`} x={60 + pct * 420} y="285" textAnchor="middle" fill="#52525b" fontSize="9">
                      {Math.round(pct * stats.maxScatterDays)}d
                    </text>
                  ))}

                  {/* Data points — unrated first, rated on top */}
                  {stats.scatterData
                    .sort((a, b) => a.rating - b.rating)
                    .map((point, idx) => {
                    const x = 60 + (point.days / stats.maxScatterDays) * 420;
                    const y = 270 - (point.pages / stats.maxScatterPages) * 250;
                    const radius = point.rating > 0 ? 4 + point.rating * 2.5 : 4;
                    const color = point.rating >= 5 ? "#3b82f6" : point.rating >= 4 ? "#10b981" : point.rating >= 3 ? "#eab308" : point.rating >= 2 ? "#f97316" : point.rating >= 1 ? "#ef4444" : "#52525b";

                    return (
                      <circle key={idx} cx={x} cy={y} r={radius} fill={color} opacity="0.65" className="hover:opacity-100 cursor-pointer">
                        <title>{point.title} — {point.days} days, {point.pages} pages{point.rating > 0 ? `, ${point.rating}★` : ""}</title>
                      </circle>
                    );
                  })}

                  {/* Axis titles */}
                  <text x="270" y="302" textAnchor="middle" fill="#71717a" fontSize="10">Days to Read →</text>
                  <text x="15" y="145" textAnchor="middle" fill="#71717a" fontSize="10" transform="rotate(-90, 15, 145)">Pages ↑</text>
                </svg>
              </div>

              <div className="flex flex-wrap gap-3 mt-3 text-xs items-center">
                <span className="text-muted">Dot size = rating:</span>
                {[{r:1,c:"bg-red-500"},{r:2,c:"bg-orange-500"},{r:3,c:"bg-yellow-500"},{r:4,c:"bg-emerald-500"},{r:5,c:"bg-blue-500"}].map(({r,c}) => (
                  <div key={r} className="flex items-center gap-1">
                    <div className={`rounded-full ${c}`} style={{width: 4+r*2.5, height: 4+r*2.5}} />
                    <span className="text-muted">{r}★</span>
                  </div>
                ))}
                <div className="flex items-center gap-1">
                  <div className="rounded-full bg-muted" style={{width: 4, height: 4}} />
                  <span className="text-muted">unrated</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Author stats */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Authors</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard label="Unique Authors" value={stats.uniqueAuthors} />
            <StatCard label={`Books This Year (${new Date().getFullYear()})`} value={`${stats.booksThisYear} → ${stats.projectedBooksThisYear} proj.`} color="emerald" />
          </div>
          {stats.topAuthors.length > 0 && (
            <div className="bg-surface border border-border-custom rounded-xl p-4 space-y-2">
              {stats.topAuthors.map(([author, counts]) => (
                <div key={author} className="flex items-center justify-between">
                  <span className="text-sm text-foreground truncate mr-3">{author}</span>
                  <span className="text-xs text-muted flex-shrink-0">{counts.books} books · {counts.read} read</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Author Diversity */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Author Diversity</h2>
          <div className="bg-surface border border-border-custom rounded-xl p-5 space-y-5">
            {/* Gender breakdown */}
            <div>
              <p className="text-xs text-muted mb-3">Gender (by books owned)</p>
              <div className="flex gap-1 h-6 rounded-full overflow-hidden mb-3">
                {stats.totalGenderBooks > 0 && (
                  <>
                    <div
                      className="bg-blue-500 transition-all"
                      style={{ width: `${(stats.genderBookCounts.Male / stats.totalGenderBooks) * 100}%` }}
                    />
                    <div
                      className="bg-pink-500 transition-all"
                      style={{ width: `${(stats.genderBookCounts.Female / stats.totalGenderBooks) * 100}%` }}
                    />
                    <div
                      className="bg-surface-2 transition-all"
                      style={{ width: `${(stats.genderBookCounts.Unknown / stats.totalGenderBooks) * 100}%` }}
                    />
                  </>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-blue-400">{stats.genderBookCounts.Male}</p>
                  <p className="text-[10px] text-muted">Male · {stats.genderAuthorCounts.Male} authors</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-pink-400">{stats.genderBookCounts.Female}</p>
                  <p className="text-[10px] text-muted">Female · {stats.genderAuthorCounts.Female} authors</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-muted">{stats.genderBookCounts.Unknown}</p>
                  <p className="text-[10px] text-muted">Unknown · {stats.genderAuthorCounts.Unknown} authors</p>
                </div>
              </div>
            </div>

            {/* Ethnicity breakdown */}
            {stats.topEthnicities.length > 0 && (
              <div>
                <p className="text-xs text-muted mb-3">Ethnicity (by books owned) — {stats.topEthnicities.reduce((s, e) => s + e[1], 0)} books classified</p>
                <div className="space-y-2">
                  {stats.topEthnicities.map(([ethnicity, bookCount]) => (
                    <div key={ethnicity} className="flex items-center gap-3">
                      <span className="text-sm text-foreground w-32 flex-shrink-0">{ethnicity}</span>
                      <div className="flex-1 bg-surface-2 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full"
                          style={{ width: `${(bookCount / stats.topEthnicities[0][1]) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted w-20 text-right flex-shrink-0">
                        {bookCount} books · {stats.ethnicityAuthorCounts[ethnicity]} auth.
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Skill stats */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Skills</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Expert-level Skills (20+)" value={stats.expertSkills} color="emerald" />
            <StatCard label="Master-level Skills (50+)" value={stats.masterSkills} color="blue" />
          </div>
        </section>

        {/* Top sources */}
        {stats.topSources.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Top Sources</h2>
            <div className="bg-surface border border-border-custom rounded-xl p-4 space-y-2.5">
              {stats.topSources.map(([source, count]) => (
                <div key={source} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{source}</span>
                  <span className="text-sm text-muted">{count}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Topics - two columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {stats.topUserTopics.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Your Topics</h2>
              <div className="flex flex-wrap gap-1.5">
                {stats.topUserTopics.map(([topic, count]) => (
                  <span key={topic} className="bg-surface-2 text-foreground px-2.5 py-1 rounded-full text-xs">
                    {topic} <span className="text-muted">({count})</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          {stats.topAutoTopics.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Standard Subjects</h2>
              <div className="flex flex-wrap gap-1.5">
                {stats.topAutoTopics.map(([topic, count]) => (
                  <span key={topic} className="bg-surface-2/50 text-muted px-2.5 py-1 rounded-full text-xs">
                    {topic} <span className="text-muted">({count})</span>
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

function ContributionHeatmap({
  startDate,
  pagesPerDay,
  maxPagesInDay,
}: {
  startDate: Date;
  pagesPerDay: Record<string, number>;
  maxPagesInDay: number;
}) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const getColorClass = (pages: number) => {
    if (pages === 0) return "bg-surface-2";
    const ratio = pages / maxPagesInDay;
    if (ratio >= 0.8) return "bg-emerald-400";
    if (ratio >= 0.6) return "bg-emerald-500";
    if (ratio >= 0.35) return "bg-emerald-700";
    return "bg-emerald-950";
  };

  const getHoverColor = (pages: number) => {
    if (pages === 0) return "hover:bg-border-custom";
    const ratio = pages / maxPagesInDay;
    if (ratio >= 0.8) return "hover:bg-emerald-300";
    if (ratio >= 0.6) return "hover:bg-emerald-400";
    if (ratio >= 0.35) return "hover:bg-emerald-600";
    return "hover:bg-emerald-900";
  };

  // Generate 52 weeks of dates
  const weeks: Array<Date[]> = [];
  const currentDate = new Date(startDate);

  // Start from Sunday
  const dayOfWeek = currentDate.getDay();
  currentDate.setDate(currentDate.getDate() - dayOfWeek);

  for (let week = 0; week < 53; week++) {
    const weekDays: Date[] = [];
    for (let day = 0; day < 7; day++) {
      weekDays.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeks.push(weekDays);
  }

  // Month labels with positions
  const monthLabels: Array<{ month: string; weekIndex: number }> = [];
  let lastMonth = -1;
  weeks.forEach((week, weekIdx) => {
    const month = week[0].getMonth();
    if (month !== lastMonth) {
      monthLabels.push({
        month: week[0].toLocaleDateString("en-US", { month: "short" }),
        weekIndex: weekIdx,
      });
      lastMonth = month;
    }
  });

  // Day labels
  const dayLabels = ["Mon", "Wed", "Fri"];
  const dayLabelRows = [1, 3, 5]; // Indices for Mon, Wed, Fri

  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        {/* Month labels */}
        <div className="flex" style={{ marginLeft: "30px" }}>
          {monthLabels.map((label, idx) => (
            <div
              key={`${label.month}-${idx}`}
              className="text-xs text-muted font-medium"
              style={{
                width: `${(label.weekIndex === monthLabels[idx + 1]?.weekIndex ? monthLabels[idx + 1].weekIndex - label.weekIndex : 4) * 14}px`,
              }}
            >
              {label.month}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="flex gap-1">
          {/* Day labels on left */}
          <div className="flex flex-col justify-between pt-1 text-xs text-muted-2 mr-1" style={{ width: "20px" }}>
            {dayLabelRows.map((dayIdx) => (
              <div key={dayIdx} style={{ height: "12px", marginTop: dayIdx === 0 ? 0 : "2px" }}>
                {dayLabels[dayLabelRows.indexOf(dayIdx)]}
              </div>
            ))}
          </div>

          {/* Weeks grid */}
          <div className="flex gap-1">
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-1">
                {week.map((date, dayIdx) => {
                  const dateKey = date.toISOString().split("T")[0];
                  const pages = pagesPerDay[dateKey] || 0;
                  const isInRange = date >= startDate && date <= new Date();

                  return (
                    <div
                      key={dateKey}
                      className={`w-3 h-3 rounded-sm cursor-pointer transition-colors ${
                        isInRange ? `${getColorClass(pages)} ${getHoverColor(pages)}` : "bg-transparent"
                      }`}
                      onMouseEnter={() => setHoveredDate(dateKey)}
                      onMouseLeave={() => setHoveredDate(null)}
                      title={`${new Date(dateKey).toLocaleDateString("en-US", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}: ${pages} pages`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip for hovered date */}
      {hoveredDate && pagesPerDay[hoveredDate] !== undefined && (
        <div className="mt-3 text-sm text-muted">
          <span className="text-foreground font-medium">
            {new Date(hoveredDate).toLocaleDateString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
          {": "}
          {pagesPerDay[hoveredDate]} pages
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border-custom text-xs">
        <span className="text-muted">Less</span>
        <div className="w-3 h-3 rounded-sm bg-surface-2" />
        <div className="w-3 h-3 rounded-sm bg-emerald-950" />
        <div className="w-3 h-3 rounded-sm bg-emerald-700" />
        <div className="w-3 h-3 rounded-sm bg-emerald-500" />
        <div className="w-3 h-3 rounded-sm bg-emerald-400" />
        <span className="text-muted">More</span>
      </div>
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
    default: "text-foreground",
  };

  return (
    <div className="bg-surface border border-border-custom rounded-xl p-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueColor[color]}`}>{value}</p>
    </div>
  );
}
