"use client";

import { BentoShell, bento, display } from "../theme";
import {
  useBooks,
  useStats,
  useReadingUpdates,
  booksFinishedInYear,
} from "../useLibraryData";

export default function BentoStats() {
  const { books, loading } = useBooks();
  const stats = useStats(books);
  const { updates } = useReadingUpdates(); // global — all reading updates

  const currentYear = new Date().getFullYear();
  const finished = books.filter((b) => b.status === "read");
  const finishedThisYear = booksFinishedInYear(books, currentYear);
  const totalPages = finished.reduce((s, b) => s + (b.pages || 0), 0);
  const pagesThisYear = finishedThisYear.reduce((s, b) => s + (b.pages || 0), 0);
  const avgPages = finished.length > 0 ? totalPages / finished.length : 0;

  // -- Reading-by-month: bucket finished books by complete_date month (current year)
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const byMonth = monthNames.map((name) => ({ name, read: 0, pages: 0 }));
  finishedThisYear.forEach((b) => {
    if (!b.complete_date) return;
    const m = new Date(b.complete_date).getMonth();
    byMonth[m].read += 1;
    byMonth[m].pages += b.pages || 0;
  });
  // Show through current month
  const currentMonth = new Date().getMonth();
  const monthsToShow = byMonth.slice(0, Math.max(currentMonth + 1, 1));
  const maxPages = Math.max(1, ...monthsToShow.map((m) => m.pages));

  // -- Top authors by READ count (not owned)
  const authorMap = new Map<string, number>();
  finished.forEach((b) => {
    b.author
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean)
      .forEach((n) => authorMap.set(n, (authorMap.get(n) || 0) + 1));
  });
  const topAuthors = Array.from(authorMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // -- Real heatmap: last 12 weeks of reading_updates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weeks = 12;
  // Build a date key → pages map
  const pagesByDay = new Map<string, number>();
  updates.forEach((u) => {
    const d = new Date(u.created_at);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    pagesByDay.set(key, (pagesByDay.get(key) || 0) + (u.pages_read || 0));
  });
  // Grid: oldest week first, Mon→Sun within each week (visual flow left→right)
  const heatmapDays: { date: Date; key: string; pages: number }[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - w * 7 - (6 - d));
      const key = date.toISOString().slice(0, 10);
      heatmapDays.push({ date, key, pages: pagesByDay.get(key) || 0 });
    }
  }
  const maxDayPages = Math.max(1, ...heatmapDays.map((d) => d.pages));
  const totalUpdates = updates.length;
  const activeDays = new Set([...pagesByDay.keys()]).size;

  // -- Pace: pages per day across reading_updates with activity (this year only)
  const yearStart = new Date(currentYear, 0, 1);
  const pagesYearFromUpdates = updates
    .filter((u) => new Date(u.created_at) >= yearStart)
    .reduce((s, u) => s + (u.pages_read || 0), 0);
  const activeDaysYear = new Set(
    updates
      .filter((u) => new Date(u.created_at) >= yearStart)
      .map((u) => new Date(u.created_at).toISOString().slice(0, 10))
  ).size;
  const pacePerActiveDay =
    activeDaysYear > 0 ? Math.round(pagesYearFromUpdates / activeDaysYear) : 0;

  return (
    <BentoShell current="stats">
      <div className="mt-2 mb-6">
        <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: bento.inkSoft, ...display }}>
          Stats
        </p>
        <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight" style={display}>
          {loading ? "Loading..." : (
            <>You&apos;ve been{" "}
              <span style={{
                background: `linear-gradient(120deg, ${bento.pink}, ${bento.yellow})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>busy.</span>
            </>
          )}
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Big color={bento.green} label="BOOKS READ" value={stats.read} sub={`of ${stats.totalBooks}`} />
        <Big color={bento.yellow} label="PAGES" value={totalPages.toLocaleString()} sub="all-time" inkOnLight />
        <Big color={bento.pink} label="AVG / BOOK" value={Math.round(avgPages)} sub="pages" />
        <Big color={bento.lilac} label="RATING" value={`${stats.avgRating.toFixed(1)}★`} sub="overall" inkOnLight />
      </div>

      <div className="grid grid-cols-12 gap-3 sm:gap-4">
        {/* Reading by month */}
        <div className="col-span-12 md:col-span-7 rounded-3xl p-5 sm:p-6" style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-xl font-bold" style={display}>Reading by month</h2>
            <p className="text-xs" style={{ color: bento.inkSoft }}>
              {currentYear} · {pagesThisYear.toLocaleString()} pp this year
            </p>
          </div>
          {monthsToShow.every((m) => m.pages === 0) ? (
            <p className="text-sm italic py-6 text-center" style={{ color: bento.inkSoft }}>
              No books finished yet this year — finish one and it&apos;ll plot here.
            </p>
          ) : (
            <div
              className="grid items-end gap-2 sm:gap-3"
              style={{
                gridTemplateColumns: `repeat(${monthsToShow.length}, minmax(0, 1fr))`,
                minHeight: "180px",
              }}
            >
              {monthsToShow.map((m) => {
                const h = m.pages > 0 ? Math.max(8, (m.pages / maxPages) * 140) : 4;
                return (
                  <div key={m.name} className="flex flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-lg relative"
                      style={{
                        height: `${h}px`,
                        background: m.pages === 0
                          ? bento.ink + "12"
                          : `linear-gradient(180deg, ${bento.pink}, ${bento.yellow})`,
                      }}
                    >
                      {m.pages > 0 && (
                        <p className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold whitespace-nowrap" style={display}>
                          {m.pages}
                        </p>
                      )}
                    </div>
                    <p className="text-[10px] font-semibold" style={{ ...display, color: bento.inkSoft }}>
                      {m.name}
                    </p>
                    {m.read > 0 && (
                      <p className="text-[9px] -mt-1" style={{ color: bento.inkSoft }}>
                        {m.read} 📖
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pace */}
        <div className="col-span-12 md:col-span-5 rounded-3xl p-5 sm:p-6 flex flex-col justify-between" style={{ background: bento.ink, color: bento.bg }}>
          <p className="text-[10px] uppercase tracking-wider font-semibold opacity-80" style={display}>Pace</p>
          <div>
            <p className="text-5xl sm:text-6xl font-bold leading-none" style={display}>
              {pacePerActiveDay}
              <span style={{ ...display, fontSize: "2rem", color: bento.yellow }}> pp</span>
            </p>
            <p className="text-sm opacity-80 mt-1">
              per active reading day {activeDaysYear > 0 && `(${activeDaysYear} days)`}
            </p>
            {totalUpdates === 0 && (
              <p className="text-xs opacity-60 mt-2 italic">
                Log progress on a book to start tracking pace.
              </p>
            )}
          </div>
        </div>

        {/* REAL heatmap — last 12 weeks of reading_updates */}
        <div className="col-span-12 rounded-3xl p-5 sm:p-6" style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-bold" style={display}>Reading heatmap</h2>
            <p className="text-xs" style={{ color: bento.inkSoft }}>
              last 12 weeks · {activeDays} active days
            </p>
          </div>
          {totalUpdates === 0 ? (
            <p className="text-sm italic py-4" style={{ color: bento.inkSoft }}>
              No reading updates yet. Log progress on a book to see your heatmap.
            </p>
          ) : (
            <>
              <div className="flex gap-1 overflow-x-auto">
                {Array.from({ length: weeks }).map((_, week) => (
                  <div key={week} className="flex flex-col gap-1 flex-shrink-0">
                    {Array.from({ length: 7 }).map((_, day) => {
                      const cell = heatmapDays[week * 7 + day];
                      const ratio = cell.pages / maxDayPages;
                      const bg =
                        cell.pages === 0
                          ? bento.ink + "10"
                          : ratio < 0.25
                          ? `${bento.yellow}88`
                          : ratio < 0.55
                          ? bento.yellow
                          : ratio < 0.8
                          ? bento.pink + "cc"
                          : bento.pink;
                      return (
                        <div
                          key={day}
                          className="w-4 h-4 sm:w-5 sm:h-5 rounded-md"
                          style={{ background: bg }}
                          title={`${cell.date.toLocaleDateString()} — ${cell.pages} pages`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-4 text-[10px]" style={{ color: bento.inkSoft }}>
                <span>less</span>
                {[bento.ink + "10", bento.yellow + "88", bento.yellow, bento.pink + "cc", bento.pink].map((c, i) => (
                  <div key={i} className="w-3 h-3 rounded" style={{ background: c }} />
                ))}
                <span>more</span>
              </div>
            </>
          )}
        </div>

        {/* Top authors by READ count */}
        <div className="col-span-12 md:col-span-6 rounded-3xl p-5 sm:p-6" style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}>
          <h2 className="text-xl font-bold mb-4" style={display}>Most read authors</h2>
          {topAuthors.length === 0 ? (
            <p className="text-sm italic" style={{ color: bento.inkSoft }}>
              No books read yet.
            </p>
          ) : (
            <div className="space-y-3">
              {topAuthors.map((a, i) => {
                const max = topAuthors[0].count;
                const w = (a.count / max) * 100;
                return (
                  <div key={a.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold" style={display}>
                        <span style={{ color: bento.inkSoft }}>0{i + 1}.</span> {a.name}
                      </span>
                      <span style={{ color: bento.inkSoft }}>
                        {a.count} {a.count === 1 ? "book read" : "books read"}
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: bento.ink + "10" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${w}%`,
                          background: [bento.pink, bento.yellow, bento.green, bento.lilac, bento.blue, bento.orange][i % 6],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="col-span-12 md:col-span-6 rounded-3xl p-5 sm:p-6" style={{ background: bento.green, color: bento.ink }}>
          <h2 className="text-xl font-bold mb-4" style={display}>Status breakdown</h2>
          <div className="grid grid-cols-2 gap-3">
            <Div label="Read" value={stats.read} />
            <Div label="Reading" value={stats.reading} />
            <Div label="Up next" value={stats.notRead} />
            <Div label="Total" value={stats.totalBooks} />
          </div>
        </div>
      </div>
    </BentoShell>
  );
}

function Big({
  color,
  label,
  value,
  sub,
  inkOnLight,
}: {
  color: string;
  label: string;
  value: string | number;
  sub: string;
  inkOnLight?: boolean;
}) {
  const text = inkOnLight ? bento.ink : "#FFFFFF";
  return (
    <div className="rounded-3xl p-4 sm:p-5 flex flex-col justify-between" style={{ background: color, color: text, minHeight: "120px" }}>
      <p className="text-[10px] uppercase tracking-wider font-semibold opacity-90" style={display}>{label}</p>
      <div>
        <p className="text-3xl sm:text-4xl font-bold leading-none" style={display}>{value}</p>
        <p className="text-[11px] mt-1 opacity-80">{sub}</p>
      </div>
    </div>
  );
}

function Div({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-black/10 rounded-2xl p-3">
      <p className="text-[10px] uppercase tracking-wider font-semibold opacity-80" style={display}>{label}</p>
      <p className="text-2xl font-bold mt-1" style={display}>{value}</p>
    </div>
  );
}
