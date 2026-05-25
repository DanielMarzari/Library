export const dynamic = "force-static";

import { MOCK_BOOKS, MOCK_STATS } from "../../data";
import { BentoShell, bento, display } from "../theme";

// Mockup 1 — Bento Pop · Stats

export default function BentoStats() {
  const finished = MOCK_BOOKS.filter((b) => b.status === "read");
  const totalPages = finished.reduce((s, b) => s + b.pages, 0);
  const avgPages = totalPages / Math.max(1, finished.length);

  // Mock heatmap data — 12 weeks × 7 days
  const heatmap = Array.from({ length: 12 * 7 }, (_, i) => {
    const h = (i * 37 + 11) % 100;
    return h < 35 ? 0 : h < 60 ? 1 : h < 80 ? 2 : 3;
  });

  // Reading by month — mock
  const months = [
    { name: "JAN", read: 1, pages: 320 },
    { name: "FEB", read: 1, pages: 420 },
    { name: "MAR", read: 2, pages: 690 },
    { name: "APR", read: 2, pages: 815 },
    { name: "MAY", read: 1, pages: 502 },
    { name: "JUN", read: 0, pages: 0 },
  ];
  const maxPages = Math.max(...months.map((m) => m.pages));

  // Top authors (from MOCK_BOOKS)
  const topAuthors = Array.from(
    MOCK_BOOKS.reduce((m, b) => {
      m.set(b.author, (m.get(b.author) || 0) + 1);
      return m;
    }, new Map<string, number>()).entries()
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Diversity
  const diversity = {
    nationalities: 6,
    women: 2,
    living: 5,
    century20: 9,
    century21: 1,
  };

  return (
    <BentoShell current="stats">
      {/* Header */}
      <div className="mt-2 mb-6">
        <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: bento.inkSoft, ...display }}>
          Stats
        </p>
        <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight" style={display}>
          You&apos;ve been{" "}
          <span style={{
            background: `linear-gradient(120deg, ${bento.pink}, ${bento.yellow})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            busy.
          </span>
        </h1>
      </div>

      {/* Top stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <BigStat color={bento.green} label="BOOKS READ" value={MOCK_STATS.read} sub="this year" />
        <BigStat color={bento.yellow} label="PAGES" value={MOCK_STATS.pagesRead.toLocaleString()} sub="devoured" inkOnLight />
        <BigStat color={bento.pink} label="AVG / BOOK" value={Math.round(avgPages)} sub="pages" />
        <BigStat color={bento.lilac} label="RATING" value={`${MOCK_STATS.avgRating.toFixed(1)}★`} sub="biased high" inkOnLight />
      </div>

      <div className="grid grid-cols-12 gap-3 sm:gap-4">
        {/* Reading by month — bar chart */}
        <div
          className="col-span-12 md:col-span-7 rounded-3xl p-5 sm:p-6"
          style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}
        >
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-xl font-bold" style={display}>Reading by month</h2>
            <p className="text-xs" style={{ color: bento.inkSoft }}>2026 · pages per month</p>
          </div>
          <div className="grid grid-cols-6 gap-3 items-end" style={{ minHeight: "160px" }}>
            {months.map((m) => {
              const h = m.pages > 0 ? Math.max(8, (m.pages / maxPages) * 140) : 4;
              return (
                <div key={m.name} className="flex flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-lg relative group cursor-default"
                    style={{
                      height: `${h}px`,
                      background: m.pages === 0
                        ? bento.ink + "12"
                        : `linear-gradient(180deg, ${bento.pink}, ${bento.yellow})`,
                    }}
                  >
                    {m.pages > 0 && (
                      <p
                        className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold"
                        style={display}
                      >
                        {m.pages}
                      </p>
                    )}
                  </div>
                  <p className="text-[10px] font-semibold" style={{ ...display, color: bento.inkSoft }}>
                    {m.name}
                  </p>
                  <p className="text-[10px] -mt-1" style={{ color: bento.inkSoft }}>
                    {m.read} 📖
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pace tile */}
        <div
          className="col-span-12 md:col-span-5 rounded-3xl p-5 sm:p-6 flex flex-col justify-between"
          style={{ background: bento.ink, color: bento.bg }}
        >
          <p className="text-[10px] uppercase tracking-wider font-semibold opacity-80" style={display}>
            Pace
          </p>
          <div>
            <p className="text-5xl sm:text-6xl font-bold leading-none" style={display}>
              42<span style={{ ...display, fontSize: "2rem", color: bento.yellow }}> pp</span>
            </p>
            <p className="text-sm opacity-80 mt-1">per day on average</p>
            <div className="flex items-center gap-2 mt-4">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: bento.green, color: bento.ink, ...display }}>
                ↑ 12%
              </span>
              <p className="text-xs opacity-80">vs last year</p>
            </div>
          </div>
        </div>

        {/* Heatmap */}
        <div
          className="col-span-12 rounded-3xl p-5 sm:p-6"
          style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}
        >
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-bold" style={display}>Reading heatmap</h2>
            <p className="text-xs" style={{ color: bento.inkSoft }}>last 12 weeks</p>
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {Array.from({ length: 12 }).map((_, week) => (
              <div key={week} className="flex flex-col gap-1 flex-shrink-0">
                {Array.from({ length: 7 }).map((_, day) => {
                  const v = heatmap[week * 7 + day];
                  const bg =
                    v === 0
                      ? bento.ink + "10"
                      : v === 1
                      ? `${bento.yellow}88`
                      : v === 2
                      ? bento.pink + "cc"
                      : bento.pink;
                  return (
                    <div
                      key={day}
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded-md"
                      style={{ background: bg }}
                      title={v ? `${v * 30} pages` : "no reading"}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-4 text-[10px]" style={{ color: bento.inkSoft }}>
            <span>less</span>
            {[bento.ink + "10", bento.yellow + "88", bento.pink + "cc", bento.pink].map((c, i) => (
              <div key={i} className="w-3 h-3 rounded" style={{ background: c }} />
            ))}
            <span>more</span>
          </div>
        </div>

        {/* Top authors */}
        <div
          className="col-span-12 md:col-span-6 rounded-3xl p-5 sm:p-6"
          style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}
        >
          <h2 className="text-xl font-bold mb-4" style={display}>Top authors</h2>
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
                        background: [bento.pink, bento.yellow, bento.green, bento.lilac, bento.blue][i],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Diversity */}
        <div
          className="col-span-12 md:col-span-6 rounded-3xl p-5 sm:p-6"
          style={{ background: bento.green, color: bento.ink }}
        >
          <h2 className="text-xl font-bold mb-4" style={display}>Author diversity</h2>
          <div className="grid grid-cols-2 gap-3">
            <DivStat label="Nationalities" value={diversity.nationalities} />
            <DivStat label="Women" value={diversity.women} sub={`of ${MOCK_STATS.totalBooks}`} />
            <DivStat label="Living" value={diversity.living} sub="contemporary" />
            <DivStat label="20th c." value={diversity.century20} sub={`+ ${diversity.century21} from 21st`} />
          </div>
        </div>

        {/* Pages vs duration scatter (simplified) */}
        <div
          className="col-span-12 rounded-3xl p-5 sm:p-6"
          style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}
        >
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-bold" style={display}>Pages vs days to finish</h2>
            <p className="text-xs" style={{ color: bento.inkSoft }}>each dot is a book</p>
          </div>
          <div className="relative h-48" style={{ background: bento.bg, borderRadius: "16px" }}>
            {/* axes */}
            <div className="absolute left-2 bottom-2 right-2 top-2">
              {finished.map((b, i) => {
                const x = ((b.pages - 100) / 800) * 100;
                const days = 8 + (b.pages / 30) + (i % 5) * 3;
                const y = 100 - (days / 60) * 100;
                const color = [bento.pink, bento.yellow, bento.green, bento.lilac, bento.blue][i % 5];
                return (
                  <div
                    key={b.id}
                    className="absolute w-3 h-3 rounded-full ring-2 ring-white"
                    style={{
                      left: `${Math.min(95, Math.max(2, x))}%`,
                      top: `${Math.min(90, Math.max(5, y))}%`,
                      background: color,
                    }}
                    title={`${b.title} · ${b.pages}pp`}
                  />
                );
              })}
              {/* axis labels */}
              <span
                className="absolute bottom-0 left-1 text-[10px]"
                style={{ ...display, color: bento.inkSoft }}
              >
                100pp
              </span>
              <span
                className="absolute bottom-0 right-1 text-[10px]"
                style={{ ...display, color: bento.inkSoft }}
              >
                900pp
              </span>
              <span
                className="absolute top-0 left-1 text-[10px]"
                style={{ ...display, color: bento.inkSoft }}
              >
                60d
              </span>
              <span
                className="absolute bottom-0 left-1 text-[10px]"
                style={{ ...display, color: bento.inkSoft, transform: "translateY(140%)" }}
              >
              </span>
            </div>
          </div>
        </div>
      </div>
    </BentoShell>
  );
}

function BigStat({
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
    <div
      className="rounded-3xl p-4 sm:p-5 flex flex-col justify-between"
      style={{ background: color, color: text, minHeight: "120px" }}
    >
      <p className="text-[10px] uppercase tracking-wider font-semibold opacity-90" style={display}>
        {label}
      </p>
      <div>
        <p className="text-3xl sm:text-4xl font-bold leading-none" style={display}>
          {value}
        </p>
        <p className="text-[11px] mt-1 opacity-80">{sub}</p>
      </div>
    </div>
  );
}

function DivStat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-black/10 rounded-2xl p-3">
      <p className="text-[10px] uppercase tracking-wider font-semibold opacity-80" style={display}>
        {label}
      </p>
      <p className="text-2xl font-bold mt-1" style={display}>
        {value}
      </p>
      {sub && <p className="text-[10px] opacity-70 mt-0.5">{sub}</p>}
    </div>
  );
}
