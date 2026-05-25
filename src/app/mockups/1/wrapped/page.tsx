export const dynamic = "force-static";

import { MOCK_BOOKS, MOCK_STATS } from "../../data";
import { BentoShell, bento, display } from "../theme";

// Mockup 1 — Bento Pop · Wrapped (Year in review)

export default function BentoWrapped() {
  const finished = MOCK_BOOKS.filter((b) => b.status === "read");
  const favorite = finished.find((b) => b.rating === 5) || finished[0];
  const topAuthor = "Italo Calvino";
  const longest = finished.reduce((a, b) => (b.pages > a.pages ? b : a));
  const shortest = finished.reduce((a, b) => (b.pages < a.pages ? b : a));
  const topics = Array.from(new Set(MOCK_BOOKS.flatMap((b) => b.topics))).slice(0, 8);

  return (
    <BentoShell current="wrapped">
      {/* Hero */}
      <div
        className="rounded-3xl p-6 sm:p-10 mt-2 mb-5 relative overflow-hidden text-white"
        style={{
          background: `linear-gradient(135deg, ${bento.pink} 0%, ${bento.orange} 40%, ${bento.yellow} 100%)`,
        }}
      >
        <div
          className="absolute -right-12 -bottom-12 w-72 h-72 rounded-full opacity-30"
          style={{ background: bento.lilac, filter: "blur(50px)" }}
        />
        <div
          className="absolute -left-12 -top-12 w-56 h-56 rounded-full opacity-30"
          style={{ background: bento.green, filter: "blur(40px)" }}
        />

        <div className="relative">
          <p
            className="text-xs uppercase tracking-[0.3em] mb-3 opacity-90"
            style={display}
          >
            Year in books · 2026
          </p>
          <h1
            className="text-5xl sm:text-7xl font-bold leading-[0.95] tracking-tight"
            style={display}
          >
            What a<br />
            <span style={{ color: bento.ink }}>year for reading.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm sm:text-base opacity-90">
            You finished {MOCK_STATS.read} books, devoured{" "}
            {MOCK_STATS.pagesRead.toLocaleString()} pages, and rated everything{" "}
            <span style={{ color: bento.ink, fontWeight: 700 }}>
              {MOCK_STATS.avgRating.toFixed(1)}★
            </span>{" "}
            on average. That&apos;s the receipts.
          </p>
        </div>
      </div>

      {/* Big number row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Huge color={bento.green} label="BOOKS" value={MOCK_STATS.read} sub="finished" />
        <Huge color={bento.yellow} label="PAGES" value={MOCK_STATS.pagesRead.toLocaleString()} sub="devoured" inkOnLight />
        <Huge color={bento.lilac} label="AUTHORS" value={new Set(finished.map((b) => b.author)).size} sub="met" inkOnLight />
        <Huge color={bento.pink} label="AVG ★" value={MOCK_STATS.avgRating.toFixed(1)} sub="rating" />
      </div>

      <div className="grid grid-cols-12 gap-3 sm:gap-4">
        {/* Favorite book hero */}
        <div
          className="col-span-12 md:col-span-7 rounded-3xl p-5 sm:p-7 relative overflow-hidden"
          style={{ background: bento.ink, color: bento.bg, minHeight: "280px" }}
        >
          <div
            className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full opacity-30"
            style={{ background: bento.pink, filter: "blur(40px)" }}
          />
          <div className="relative flex gap-5">
            <img
              src={favorite.cover}
              alt=""
              className="w-28 sm:w-36 aspect-[2/3] object-cover rounded-xl shadow-2xl flex-shrink-0"
            />
            <div className="flex-1 min-w-0 flex flex-col">
              <p className="text-[10px] uppercase tracking-wider mb-2 opacity-60" style={display}>
                Favorite of the year
              </p>
              <p className="text-2xl sm:text-3xl font-bold leading-tight" style={display}>
                {favorite.title}
              </p>
              <p className="opacity-80 mt-1">{favorite.author}</p>
              <div className="mt-auto pt-4">
                <p
                  className="text-2xl tracking-widest"
                  style={{ color: bento.yellow, ...display }}
                >
                  ★★★★★
                </p>
                <p className="text-xs opacity-70 mt-1 italic">
                  &ldquo;Better than I remembered. Closed it slowly.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Top author tile */}
        <div
          className="col-span-12 md:col-span-5 rounded-3xl p-5 sm:p-7 flex flex-col justify-between"
          style={{ background: bento.lilac, color: bento.ink, minHeight: "280px" }}
        >
          <p className="text-[10px] uppercase tracking-wider font-semibold" style={display}>
            Author of the year
          </p>
          <div>
            <p className="text-3xl sm:text-4xl font-bold leading-tight" style={display}>
              {topAuthor}
            </p>
            <p className="text-sm opacity-80 mt-2">
              You read 3 of his books this year. The cities are still echoing.
            </p>
            <div className="flex gap-1 mt-4">
              {MOCK_BOOKS.filter((b) => b.author === topAuthor)
                .slice(0, 3)
                .map((b, i) => (
                  <img
                    key={b.id}
                    src={b.cover}
                    alt=""
                    className="w-12 aspect-[2/3] object-cover rounded shadow"
                    style={{
                      transform: `rotate(${(i - 1) * 4}deg)`,
                      marginLeft: i === 0 ? 0 : "-6px",
                    }}
                  />
                ))}
            </div>
          </div>
        </div>

        {/* Longest / shortest */}
        <ExtremeCard
          color={bento.green}
          label="Longest read"
          book={longest}
          stat={`${longest.pages} pp`}
          sub="took 6 weeks"
        />
        <ExtremeCard
          color={bento.yellow}
          label="Shortest read"
          book={shortest}
          stat={`${shortest.pages} pp`}
          sub="single sitting"
          inkOnLight
        />

        {/* Topics */}
        <div
          className="col-span-12 rounded-3xl p-5 sm:p-7"
          style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}
        >
          <p
            className="text-[10px] uppercase tracking-wider font-semibold mb-3"
            style={{ color: bento.inkSoft, ...display }}
          >
            Your reading vibe this year
          </p>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {topics.map((t, i) => (
              <span
                key={t}
                className="rounded-full font-bold"
                style={{
                  ...display,
                  background: [bento.pink, bento.yellow, bento.green, bento.lilac, bento.orange, bento.blue][i % 6],
                  color: i % 3 === 0 ? "#FFF" : bento.ink,
                  fontSize: `${0.95 + (i % 3) * 0.2}rem`,
                  padding: `${0.4 + (i % 3) * 0.1}rem ${1 + (i % 3) * 0.2}rem`,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Big quote */}
        <div
          className="col-span-12 md:col-span-8 rounded-3xl p-6 sm:p-8"
          style={{ background: bento.pink, color: "#FFF" }}
        >
          <p
            className="text-2xl sm:text-3xl leading-[1.2] font-bold"
            style={display}
          >
            &ldquo;A reader lives a thousand lives. You lived{" "}
            <span style={{ color: bento.yellow }}>{MOCK_STATS.read} of them</span>{" "}
            this year.&rdquo;
          </p>
          <p className="text-xs uppercase tracking-wider mt-4 opacity-80" style={display}>
            — Your library says hi
          </p>
        </div>

        {/* Share */}
        <div
          className="col-span-12 md:col-span-4 rounded-3xl p-5 sm:p-6 flex flex-col justify-between"
          style={{ background: bento.card, border: `1px solid ${bento.ink}10`, minHeight: "150px" }}
        >
          <p
            className="text-[10px] uppercase tracking-wider font-semibold"
            style={{ color: bento.inkSoft, ...display }}
          >
            Share your year
          </p>
          <div>
            <button
              className="w-full px-4 py-3 rounded-2xl font-semibold mb-2 text-white"
              style={{ background: bento.ink, ...display }}
            >
              Download card
            </button>
            <button
              className="w-full px-4 py-3 rounded-2xl font-semibold"
              style={{
                background: bento.bg,
                border: `1px solid ${bento.ink}10`,
                ...display,
              }}
            >
              Copy summary
            </button>
          </div>
        </div>
      </div>
    </BentoShell>
  );
}

function Huge({
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
  const text = inkOnLight ? bento.ink : "#FFF";
  return (
    <div
      className="rounded-3xl p-5 flex flex-col justify-between"
      style={{ background: color, color: text, minHeight: "120px" }}
    >
      <p
        className="text-[10px] uppercase tracking-[0.2em] font-semibold opacity-90"
        style={display}
      >
        {label}
      </p>
      <div>
        <p className="text-4xl sm:text-5xl font-bold leading-none" style={display}>
          {value}
        </p>
        <p className="text-xs opacity-80 mt-1">{sub}</p>
      </div>
    </div>
  );
}

function ExtremeCard({
  color,
  label,
  book,
  stat,
  sub,
  inkOnLight,
}: {
  color: string;
  label: string;
  book: typeof MOCK_BOOKS[number];
  stat: string;
  sub: string;
  inkOnLight?: boolean;
}) {
  const text = inkOnLight ? bento.ink : "#FFF";
  return (
    <div
      className="col-span-6 md:col-span-6 rounded-3xl p-4 sm:p-5"
      style={{ background: color, color: text }}
    >
      <p className="text-[10px] uppercase tracking-wider font-semibold opacity-90" style={display}>
        {label}
      </p>
      <div className="flex gap-3 items-end mt-3">
        <img
          src={book.cover}
          alt=""
          className="w-12 sm:w-14 aspect-[2/3] object-cover rounded-md shadow"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xl sm:text-2xl font-bold leading-tight" style={display}>
            {stat}
          </p>
          <p className="text-xs opacity-90 line-clamp-1 mt-0.5">{book.title}</p>
          <p className="text-[10px] opacity-70 mt-0.5">{sub}</p>
        </div>
      </div>
    </div>
  );
}
