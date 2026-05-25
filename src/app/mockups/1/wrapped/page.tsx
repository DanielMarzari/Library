"use client";

import { BentoShell, bento, display } from "../theme";
import { useBooks, useStats } from "../useLibraryData";
import type { MockBook } from "../../data";

export default function BentoWrapped() {
  const { books, loading } = useBooks();
  const stats = useStats(books);
  const finished = books.filter((b) => b.status === "read");
  const favorite = finished.find((b) => b.rating === 5) || finished[0];
  // Top author by count among finished
  const authorMap = new Map<string, number>();
  finished.forEach((b) => {
    const names = b.author.split(",").map((n) => n.trim()).filter(Boolean);
    names.forEach((n) => authorMap.set(n, (authorMap.get(n) || 0) + 1));
  });
  const topAuthor = Array.from(authorMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topAuthorBooks = topAuthor
    ? books.filter((b) => b.author.includes(topAuthor)).slice(0, 3)
    : [];

  const longest = finished.reduce<MockBook | null>(
    (a, b) => (!a || b.pages > a.pages ? b : a),
    null
  );
  const shortest = finished.reduce<MockBook | null>(
    (a, b) => (!a || (b.pages > 0 && b.pages < a.pages) ? b : a),
    null
  );

  const topics = Array.from(new Set(books.flatMap((b) => b.topics))).slice(0, 8);

  const currentYear = new Date().getFullYear();
  const uniqueAuthors = new Set(finished.flatMap((b) => b.author.split(",").map((n) => n.trim()))).size;

  return (
    <BentoShell current="wrapped">
      <div
        className="rounded-3xl p-6 sm:p-10 mt-2 mb-5 relative overflow-hidden text-white"
        style={{
          background: `linear-gradient(135deg, ${bento.pink} 0%, ${bento.orange} 40%, ${bento.yellow} 100%)`,
        }}
      >
        <div className="absolute -right-12 -bottom-12 w-72 h-72 rounded-full opacity-30" style={{ background: bento.lilac, filter: "blur(50px)" }} />
        <div className="absolute -left-12 -top-12 w-56 h-56 rounded-full opacity-30" style={{ background: bento.green, filter: "blur(40px)" }} />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.3em] mb-3 opacity-90" style={display}>
            Year in books · {currentYear}
          </p>
          <h1 className="text-5xl sm:text-7xl font-bold leading-[0.95] tracking-tight" style={display}>
            {loading ? "Loading..." : (
              <>What a<br /><span style={{ color: bento.ink }}>year for reading.</span></>
            )}
          </h1>
          <p className="mt-4 max-w-md text-sm sm:text-base opacity-90">
            You finished {stats.read} books, devoured {stats.pagesRead.toLocaleString()} pages, and
            rated everything{" "}
            <span style={{ color: bento.ink, fontWeight: 700 }}>{stats.avgRating.toFixed(1)}★</span>{" "}
            on average. That&apos;s the receipts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Huge color={bento.green} label="BOOKS" value={stats.read} sub="finished" />
        <Huge color={bento.yellow} label="PAGES" value={stats.pagesRead.toLocaleString()} sub="devoured" inkOnLight />
        <Huge color={bento.lilac} label="AUTHORS" value={uniqueAuthors} sub="met" inkOnLight />
        <Huge color={bento.pink} label="AVG ★" value={stats.avgRating.toFixed(1)} sub="rating" />
      </div>

      <div className="grid grid-cols-12 gap-3 sm:gap-4">
        {favorite && (
          <div
            className="col-span-12 md:col-span-7 rounded-3xl p-5 sm:p-7 relative overflow-hidden"
            style={{ background: bento.ink, color: bento.bg, minHeight: "280px" }}
          >
            <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full opacity-30" style={{ background: bento.pink, filter: "blur(40px)" }} />
            <div className="relative flex gap-5">
              {favorite.cover ? (
                <img src={favorite.cover} alt="" className="w-28 sm:w-36 aspect-[2/3] object-cover rounded-xl shadow-2xl flex-shrink-0" />
              ) : (
                <div className="w-28 sm:w-36 aspect-[2/3] rounded-xl shadow-2xl flex-shrink-0" style={{ background: bento.pink }} />
              )}
              <div className="flex-1 min-w-0 flex flex-col">
                <p className="text-[10px] uppercase tracking-wider mb-2 opacity-60" style={display}>
                  Favorite of the year
                </p>
                <p className="text-2xl sm:text-3xl font-bold leading-tight" style={display}>{favorite.title}</p>
                <p className="opacity-80 mt-1">{favorite.author}</p>
                <div className="mt-auto pt-4">
                  <p className="text-2xl tracking-widest" style={{ color: bento.yellow, ...display }}>
                    {"★".repeat(favorite.rating || 0)}
                    <span style={{ color: "rgba(255,255,255,0.2)" }}>{"★".repeat(5 - (favorite.rating || 0))}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {topAuthor && (
          <div
            className="col-span-12 md:col-span-5 rounded-3xl p-5 sm:p-7 flex flex-col justify-between"
            style={{ background: bento.lilac, color: bento.ink, minHeight: "280px" }}
          >
            <p className="text-[10px] uppercase tracking-wider font-semibold" style={display}>
              Author of the year
            </p>
            <div>
              <p className="text-3xl sm:text-4xl font-bold leading-tight" style={display}>{topAuthor}</p>
              <p className="text-sm opacity-80 mt-2">
                You read {topAuthorBooks.length}{" "}
                {topAuthorBooks.length === 1 ? "book" : "books"} of theirs this year.
              </p>
              <div className="flex gap-1 mt-4">
                {topAuthorBooks.map((b, i) => (
                  <img
                    key={b.id}
                    src={b.cover}
                    alt=""
                    className="w-12 aspect-[2/3] object-cover rounded shadow"
                    style={{ transform: `rotate(${(i - 1) * 4}deg)`, marginLeft: i === 0 ? 0 : "-6px" }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {longest && (
          <ExtremeCard color={bento.green} label="Longest read" book={longest} stat={`${longest.pages} pp`} sub="finished" />
        )}
        {shortest && (
          <ExtremeCard color={bento.yellow} label="Shortest read" book={shortest} stat={`${shortest.pages} pp`} sub="quick win" inkOnLight />
        )}

        {topics.length > 0 && (
          <div className="col-span-12 rounded-3xl p-5 sm:p-7" style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-3" style={{ color: bento.inkSoft, ...display }}>
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
        )}
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
    <div className="rounded-3xl p-5 flex flex-col justify-between" style={{ background: color, color: text, minHeight: "120px" }}>
      <p className="text-[10px] uppercase tracking-[0.2em] font-semibold opacity-90" style={display}>{label}</p>
      <div>
        <p className="text-4xl sm:text-5xl font-bold leading-none" style={display}>{value}</p>
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
  book: MockBook;
  stat: string;
  sub: string;
  inkOnLight?: boolean;
}) {
  const text = inkOnLight ? bento.ink : "#FFF";
  return (
    <div className="col-span-6 md:col-span-6 rounded-3xl p-4 sm:p-5" style={{ background: color, color: text }}>
      <p className="text-[10px] uppercase tracking-wider font-semibold opacity-90" style={display}>{label}</p>
      <div className="flex gap-3 items-end mt-3">
        {book.cover ? (
          <img src={book.cover} alt="" className="w-12 sm:w-14 aspect-[2/3] object-cover rounded-md shadow" />
        ) : (
          <div className="w-12 sm:w-14 aspect-[2/3] rounded-md shadow" style={{ background: "rgba(0,0,0,0.15)" }} />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xl sm:text-2xl font-bold leading-tight" style={display}>{stat}</p>
          <p className="text-xs opacity-90 line-clamp-1 mt-0.5">{book.title}</p>
          <p className="text-[10px] opacity-70 mt-0.5">{sub}</p>
        </div>
      </div>
    </div>
  );
}
