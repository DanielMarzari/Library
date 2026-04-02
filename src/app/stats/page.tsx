"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Book } from "@/types/book";
import Link from "next/link";

interface MonthBucket {
  label: string;
  count: number;
  pages: number;
}

export default function StatsPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("complete_date", { ascending: false });
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

    // Total pages across all books with page data
    const totalPages = books.reduce((sum, b) => sum + (b.reading_pages || b.pages || 0), 0);
    const readPages = read.reduce((sum, b) => sum + (b.reading_pages || b.pages || 0), 0);

    // Average pages per book (read books only)
    const avgPages = read.length > 0 ? Math.round(readPages / read.length) : 0;

    // Books completed by month (last 12 months)
    const now = new Date();
    const monthBuckets: MonthBucket[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthBooks = read.filter(
        (b) => b.complete_date && b.complete_date.startsWith(monthStr)
      );
      monthBuckets.push({
        label,
        count: monthBooks.length,
        pages: monthBooks.reduce(
          (s, b) => s + (b.reading_pages || b.pages || 0),
          0
        ),
      });
    }

    // Reading speed: average days per book for read books with both dates
    const booksWithDates = read.filter((b) => b.start_date && b.complete_date);
    let avgDaysPerBook = 0;
    if (booksWithDates.length > 0) {
      const totalDays = booksWithDates.reduce((sum, b) => {
        const start = new Date(b.start_date!);
        const end = new Date(b.complete_date!);
        return sum + Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
      }, 0);
      avgDaysPerBook = Math.round(totalDays / booksWithDates.length);
    }

    // Average pages per day (across books with page + date data)
    let avgPagesPerDay = 0;
    if (booksWithDates.length > 0) {
      const totalReadingDays = booksWithDates.reduce((sum, b) => {
        const start = new Date(b.start_date!);
        const end = new Date(b.complete_date!);
        return sum + Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
      }, 0);
      const totalReadingPages = booksWithDates.reduce(
        (sum, b) => sum + (b.reading_pages || b.pages || 0),
        0
      );
      avgPagesPerDay = totalReadingDays > 0 ? Math.round(totalReadingPages / totalReadingDays) : 0;
    }

    // Top sources
    const sourceCounts: Record<string, number> = {};
    books.forEach((b) => {
      if (b.source) {
        sourceCounts[b.source] = (sourceCounts[b.source] || 0) + 1;
      }
    });
    const topSources = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Top topics
    const topicCounts: Record<string, number> = {};
    books.forEach((b) => {
      b.topics?.forEach((t) => {
        topicCounts[t] = (topicCounts[t] || 0) + 1;
      });
    });
    const topTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      total,
      readCount: read.length,
      readingCount: reading.length,
      notReadCount: notRead.length,
      totalPages,
      readPages,
      avgPages,
      monthBuckets,
      avgDaysPerBook,
      avgPagesPerDay,
      topSources,
      topTopics,
    };
  }, [books]);

  const maxMonthCount = Math.max(...stats.monthBuckets.map((b) => b.count), 1);

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
          <StatCard label="Not Read" value={stats.notReadCount} color="zinc" />
        </div>

        {/* Page stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Pages" value={stats.totalPages.toLocaleString()} />
          <StatCard label="Pages Read" value={stats.readPages.toLocaleString()} />
          <StatCard label="Avg Pages/Book" value={stats.avgPages} />
          <StatCard label="Avg Pages/Day" value={stats.avgPagesPerDay} />
        </div>

        {stats.avgDaysPerBook > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-sm text-zinc-400">
              On average, you finish a book in{" "}
              <span className="text-emerald-400 font-semibold">
                {stats.avgDaysPerBook} days
              </span>
            </p>
          </div>
        )}

        {/* Monthly chart */}
        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">
            Books Completed by Month
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-end gap-1 h-40">
              {stats.monthBuckets.map((bucket) => (
                <div
                  key={bucket.label}
                  className="flex-1 flex flex-col items-center justify-end h-full"
                >
                  <span className="text-[10px] text-zinc-400 mb-1">
                    {bucket.count > 0 ? bucket.count : ""}
                  </span>
                  <div
                    className="w-full rounded-t-sm bg-emerald-600/70 transition-all min-h-[2px]"
                    style={{
                      height: `${Math.max(
                        2,
                        (bucket.count / maxMonthCount) * 100
                      )}%`,
                    }}
                  />
                  <span className="text-[9px] text-zinc-500 mt-2 rotate-[-45deg] origin-top-left whitespace-nowrap">
                    {bucket.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Top sources */}
        {stats.topSources.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">
              Top Sources
            </h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
              {stats.topSources.map(([source, count]) => (
                <div key={source} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-300">{source}</span>
                  <span className="text-sm text-zinc-500">{count} book{count !== 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Top topics */}
        {stats.topTopics.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">
              Top Topics
            </h2>
            <div className="flex flex-wrap gap-2">
              {stats.topTopics.map(([topic, count]) => (
                <span
                  key={topic}
                  className="bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-full text-xs"
                >
                  {topic}{" "}
                  <span className="text-zinc-500">({count})</span>
                </span>
              ))}
            </div>
          </section>
        )}
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
  color?: "emerald" | "blue" | "zinc" | "default";
}) {
  const valueColor: Record<string, string> = {
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    zinc: "text-zinc-400",
    default: "text-zinc-100",
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueColor[color]}`}>{value}</p>
    </div>
  );
}
