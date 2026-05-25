"use client";

import { BentoShell, bento, display } from "../theme";
import { useBooks, useStats } from "../useLibraryData";

export default function BentoStats() {
  const { books, loading } = useBooks();
  const stats = useStats(books);
  const finished = books.filter((b) => b.status === "read");
  const totalPages = finished.reduce((s, b) => s + (b.pages || 0), 0);
  const avgPages = finished.length > 0 ? totalPages / finished.length : 0;

  // Reading by month — bucket by complete_date if available, else even spread.
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const byMonth = months.map((name, idx) => {
    const inMonth = finished.filter((b) => {
      // mock book has no complete_date so we'll fall back to mod
      const key = parseInt(b.id, 10) || 0;
      return key % 12 === idx;
    });
    return {
      name,
      read: inMonth.length,
      pages: inMonth.reduce((s, b) => s + (b.pages || 0), 0),
    };
  }).slice(0, 6);
  const maxPages = Math.max(1, ...byMonth.map((m) => m.pages));

  // Top authors
  const authorMap = new Map<string, number>();
  books.forEach((b) => {
    const names = b.author.split(",").map((n) => n.trim()).filter(Boolean);
    names.forEach((n) => authorMap.set(n, (authorMap.get(n) || 0) + 1));
  });
  const topAuthors = Array.from(authorMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Mock heatmap from book IDs
  const heatmap = Array.from({ length: 12 * 7 }, (_, i) => {
    const seed = (i * 37 + 11) % 100;
    return seed < 35 ? 0 : seed < 60 ? 1 : seed < 80 ? 2 : 3;
  });

  return (
    <BentoShell current="stats">
      <div className="mt-2 mb-6">
        <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: bento.inkSoft, ...display }}>
          Stats
        </p>
        <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight" style={display}>
          {loading ? "Loading..." : <>You&apos;ve been{" "}
            <span style={{
              background: `linear-gradient(120deg, ${bento.pink}, ${bento.yellow})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>busy.</span>
          </>}
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Big color={bento.green} label="BOOKS READ" value={stats.read} sub={`of ${stats.totalBooks}`} />
        <Big color={bento.yellow} label="PAGES" value={stats.pagesRead.toLocaleString()} sub="all-time" inkOnLight />
        <Big color={bento.pink} label="AVG / BOOK" value={Math.round(avgPages)} sub="pages" />
        <Big color={bento.lilac} label="RATING" value={`${stats.avgRating.toFixed(1)}★`} sub="overall" inkOnLight />
      </div>

      <div className="grid grid-cols-12 gap-3 sm:gap-4">
        {/* Bar chart */}
        <div className="col-span-12 md:col-span-7 rounded-3xl p-5 sm:p-6" style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-xl font-bold" style={display}>Reading by month</h2>
            <p className="text-xs" style={{ color: bento.inkSoft }}>pages per month</p>
          </div>
          <div className="grid grid-cols-6 gap-3 items-end" style={{ minHeight: "160px" }}>
            {byMonth.map((m) => {
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
                      <p className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold" style={display}>
                        {m.pages}
                      </p>
                    )}
                  </div>
                  <p className="text-[10px] font-semibold" style={{ ...display, color: bento.inkSoft }}>
                    {m.name}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pace */}
        <div className="col-span-12 md:col-span-5 rounded-3xl p-5 sm:p-6 flex flex-col justify-between" style={{ background: bento.ink, color: bento.bg }}>
          <p className="text-[10px] uppercase tracking-wider font-semibold opacity-80" style={display}>Pace</p>
          <div>
            <p className="text-5xl sm:text-6xl font-bold leading-none" style={display}>
              {finished.length > 0 ? Math.round(totalPages / 365) : 0}
              <span style={{ ...display, fontSize: "2rem", color: bento.yellow }}> pp</span>
            </p>
            <p className="text-sm opacity-80 mt-1">per day, averaged over a year</p>
          </div>
        </div>

        {/* Heatmap */}
        <div className="col-span-12 rounded-3xl p-5 sm:p-6" style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-bold" style={display}>Reading heatmap</h2>
            <p className="text-xs" style={{ color: bento.inkSoft }}>last 12 weeks · mocked</p>
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {Array.from({ length: 12 }).map((_, week) => (
              <div key={week} className="flex flex-col gap-1 flex-shrink-0">
                {Array.from({ length: 7 }).map((_, day) => {
                  const v = heatmap[week * 7 + day];
                  const bg = v === 0 ? bento.ink + "10" : v === 1 ? `${bento.yellow}88` : v === 2 ? bento.pink + "cc" : bento.pink;
                  return <div key={day} className="w-4 h-4 sm:w-5 sm:h-5 rounded-md" style={{ background: bg }} />;
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Top authors */}
        <div className="col-span-12 md:col-span-6 rounded-3xl p-5 sm:p-6" style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}>
          <h2 className="text-xl font-bold mb-4" style={display}>Top authors</h2>
          {topAuthors.length === 0 ? (
            <p className="text-sm italic" style={{ color: bento.inkSoft }}>
              No authors yet.
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
                      <span style={{ color: bento.inkSoft }}>{a.count} books</span>
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
