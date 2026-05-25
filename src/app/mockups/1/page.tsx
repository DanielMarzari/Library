"use client";

import Link from "next/link";
import { useState } from "react";
import { BentoShell, bento, display } from "./theme";
import { useBooks, useStats, useReadingGoals, booksFinishedInYear } from "./useLibraryData";
import { AddBookModal, LogProgressModal } from "./modals";
import type { MockBook } from "../data";

// Mockup 1 — Bento Pop · Dashboard

export default function BentoDashboard() {
  const { books, loading, usingMock, refetch } = useBooks();
  const stats = useStats(books);
  const { goals, refetch: refetchGoals } = useReadingGoals();

  const [showAdd, setShowAdd] = useState(false);
  const [showLog, setShowLog] = useState<MockBook | null>(null);

  const reading = books.filter((b) => b.status === "reading");
  const featured = reading[0];
  const recent = books.filter((b) => b.status === "read").slice(0, 8);
  const queued = books.filter((b) => b.status === "not_read");
  const topics = Array.from(new Set(books.flatMap((b) => b.topics))).slice(0, 16);

  // Year-aware reading goal: count books finished THIS year, not all-time
  const currentYear = new Date().getFullYear();
  const target = goals.find((g) => g.year === currentYear)?.target || 12;
  const readThisYear = booksFinishedInYear(books, currentYear).length;
  const goalPct = Math.min(100, (readThisYear / target) * 100);

  return (
    <BentoShell current="home">
      {loading && (
        <div
          className="mb-3 mt-2 text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-2"
          style={{ background: bento.card, color: bento.inkSoft, border: `1px solid ${bento.ink}10` }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: bento.pink }} />
          Loading your library...
        </div>
      )}
      {!loading && usingMock && (
        <div
          className="mb-3 mt-2 text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-2"
          style={{ background: bento.yellow, color: bento.ink }}
        >
          Showing sample data — your DB returned no books.
        </div>
      )}

      {/* Hero greeting */}
      <div className="mb-6 md:mb-8 mt-2">
        <h1
          className="text-3xl sm:text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight"
          style={display}
        >
          Hi, Dan.{" "}
          <span style={{ color: bento.inkSoft }}>You&apos;ve read</span>{" "}
          <span
            style={{
              background: `linear-gradient(120deg, ${bento.pink}, ${bento.yellow})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {stats.pagesRead.toLocaleString()} pages
          </span>{" "}
          <span style={{ color: bento.inkSoft }}>across {stats.read} books.</span>
        </h1>
      </div>

      <div className="grid grid-cols-12 gap-3 sm:gap-4 md:auto-rows-[140px]">
        {/* Currently reading hero */}
        {featured ? (
          <div
            className="col-span-12 md:col-span-6 md:row-span-4 rounded-3xl p-5 sm:p-6 relative overflow-hidden"
            style={{ background: bento.ink, color: bento.bg, minHeight: "380px" }}
          >
            <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full opacity-30" style={{ background: bento.pink, filter: "blur(40px)" }} />
            <div className="absolute -left-12 -top-12 w-48 h-48 rounded-full opacity-30" style={{ background: bento.yellow, filter: "blur(30px)" }} />

            <div className="relative h-full flex flex-col">
              <p className="text-[10px] sm:text-xs uppercase tracking-wider opacity-60 mb-3" style={display}>
                Now reading
              </p>

              {/* Side-by-side layout — cover keeps its 2:3 aspect; explicit width prevents squishing */}
              <Link
                href={`/mockups/1/book?id=${encodeURIComponent(featured.id)}`}
                className="flex gap-4 sm:gap-5 flex-1 min-h-0"
              >
                {featured.cover ? (
                  <img
                    src={featured.cover}
                    alt={featured.title}
                    className="rounded-xl shadow-2xl flex-shrink-0 object-cover"
                    style={{ width: "160px", height: "240px", aspectRatio: "2 / 3" }}
                  />
                ) : (
                  <CoverFallback book={featured} style={{ width: "160px", height: "240px" }} />
                )}
                <div className="flex-1 min-w-0 flex flex-col">
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight line-clamp-3" style={display}>
                    {featured.title}
                  </p>
                  <p className="opacity-70 mt-1 text-sm sm:text-base line-clamp-1">{featured.author}</p>

                  {featured.progress !== undefined && (
                    <div className="mt-auto pt-3">
                      <div className="flex justify-between text-xs sm:text-sm mb-2">
                        <span>
                          Page {Math.round((featured.pages * featured.progress) / 100)} of {featured.pages}
                        </span>
                        <span className="font-bold" style={{ color: bento.yellow }}>
                          {featured.progress}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${featured.progress}%`,
                            background: `linear-gradient(90deg, ${bento.yellow}, ${bento.pink})`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Link>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowLog(featured)}
                  className="flex-1 px-3 py-2 rounded-full text-xs font-semibold"
                  style={{ background: bento.yellow, color: bento.ink, ...display }}
                >
                  ▶ Log progress
                </button>
                <Link
                  href={`/mockups/1/book?id=${encodeURIComponent(featured.id)}`}
                  className="px-3 py-2 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(255,255,255,0.15)", color: "#FFF", ...display }}
                >
                  Open
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="col-span-12 md:col-span-6 md:row-span-4 rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-center text-center"
            style={{
              background: bento.card,
              border: `2px dashed ${bento.ink}20`,
              minHeight: "260px",
            }}
          >
            <p className="text-4xl mb-3">📖</p>
            <p className="text-lg font-bold" style={display}>
              Nothing in progress
            </p>
            <p className="text-sm mt-1" style={{ color: bento.inkSoft }}>
              Start reading a book and it&apos;ll show up here.
            </p>
            <span
              className="mt-4 px-4 py-2 rounded-full text-xs font-semibold text-white"
              style={{ background: bento.pink, ...display }}
            >
              + Add a book
            </span>
          </button>
        )}

        {/* Stats — 3 tiles */}
        <StatTile href="/mockups/1/stats" color={bento.green} label="Books read" value={stats.read} sub={`of ${stats.totalBooks} total`} />
        <StatTile href="/mockups/1/stats" color={bento.yellow} label="In progress" value={stats.reading} sub="currently reading" inkOnLight />
        <StatTile href="/mockups/1/stats" color={bento.lilac} label="Avg. rating" value={stats.avgRating.toFixed(1)} sub="★ overall" inkOnLight />

        {/* Goal */}
        <Link
          href="/mockups/1/goals"
          className="col-span-6 md:col-span-3 md:row-span-2 rounded-3xl p-4 sm:p-5 flex flex-col"
          style={{ background: bento.card, border: `1px solid ${bento.ink}10`, minHeight: "130px" }}
        >
          <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: bento.inkSoft, ...display }}>
            Goal · {currentYear}
          </p>
          <p className="text-2xl sm:text-3xl font-bold mt-1" style={display}>
            {readThisYear}/{target}
          </p>
          <div className="h-2 rounded-full overflow-hidden mt-2" style={{ background: bento.ink + "10" }}>
            <div className="h-full rounded-full" style={{ width: `${goalPct}%`, background: bento.pink }} />
          </div>
          <p className="text-xs mt-2" style={{ color: bento.inkSoft }}>
            {goalPct.toFixed(0)}% · {Math.max(0, target - readThisYear)} to go
          </p>
        </Link>

        {/* Up next pile */}
        <Link
          href="/mockups/1/list"
          className="col-span-6 md:col-span-3 md:row-span-2 rounded-3xl p-4 sm:p-5"
          style={{ background: bento.card, border: `1px solid ${bento.ink}10`, minHeight: "130px" }}
        >
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-3" style={{ color: bento.inkSoft, ...display }}>
            Up next
          </p>
          {queued.length === 0 ? (
            <p className="text-sm italic" style={{ color: bento.inkSoft }}>
              Queue is empty.
            </p>
          ) : (
            <div className="flex">
              {queued.slice(0, 4).map((b, i) => (
                <CoverThumb
                  key={b.id}
                  book={b}
                  size="w-10 sm:w-12"
                  style={{
                    transform: `rotate(${(i - 1.5) * 4}deg)`,
                    marginLeft: i === 0 ? 0 : "-12px",
                    zIndex: 4 - i,
                  }}
                />
              ))}
            </div>
          )}
          <p className="text-xs mt-3" style={{ color: bento.inkSoft }}>
            {queued.length} on the queue
          </p>
        </Link>

        {/* Recently read */}
        <div
          className="col-span-12 md:row-span-3 rounded-3xl p-5 sm:p-6"
          style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}
        >
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-xl sm:text-2xl font-bold" style={display}>
              Recently finished
            </h3>
            <Link href="/mockups/1/shelf" className="text-sm font-medium" style={{ color: bento.pink }}>
              See all →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm italic" style={{ color: bento.inkSoft }}>
              Nothing finished yet. Mark a book read to populate this.
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-8 gap-2.5 sm:gap-3">
              {recent.map((b) => (
                <Link
                  href={`/mockups/1/book?id=${encodeURIComponent(b.id)}`}
                  key={b.id}
                  className="group block"
                >
                  <div className="relative">
                    {b.cover ? (
                      <img
                        src={b.cover}
                        alt={b.title}
                        className="w-full aspect-[2/3] object-cover rounded-xl shadow-lg group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <CoverFallback book={b} className="w-full" />
                    )}
                    {b.rating === 5 && (
                      <div
                        className="absolute -top-1.5 -right-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full grid place-items-center text-xs font-bold shadow"
                        style={{ background: bento.yellow }}
                      >
                        ★
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs font-semibold mt-2 line-clamp-1" style={display}>
                    {b.title}
                  </p>
                  <p className="text-[10px]" style={{ color: bento.inkSoft }}>
                    {b.author}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Interests */}
        <div
          className="col-span-12 md:col-span-6 md:row-span-2 rounded-3xl p-5 sm:p-6"
          style={{ background: bento.green, color: bento.ink }}
        >
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-3" style={display}>
            Your interests
          </p>
          <div className="flex flex-wrap gap-2">
            {topics.length === 0 ? (
              <span className="text-sm italic opacity-70">No topics yet — tag a few books.</span>
            ) : (
              topics.map((t, i) => (
                <span
                  key={t}
                  className="px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{
                    background: i % 2 === 0 ? bento.ink : bento.card,
                    color: i % 2 === 0 ? bento.bg : bento.ink,
                    fontSize: `${0.85 + (i % 3) * 0.08}rem`,
                  }}
                >
                  {t}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Add book */}
        <button
          onClick={() => setShowAdd(true)}
          className="col-span-6 md:col-span-3 md:row-span-2 rounded-3xl p-4 sm:p-5 flex flex-col justify-between text-left"
          style={{ background: bento.pink, color: "#FFF", minHeight: "130px" }}
        >
          <p className="text-[10px] uppercase tracking-wider font-semibold" style={display}>
            Quick add
          </p>
          <div>
            <p className="text-4xl sm:text-5xl font-bold leading-none" style={display}>
              +
            </p>
            <p className="text-xs sm:text-sm opacity-90 mt-2">
              Search, scan ISBN, or DOI
            </p>
          </div>
        </button>

        {/* Random pick / surprise */}
        <Link
          href="/mockups/1/recommendations"
          className="col-span-6 md:col-span-3 md:row-span-2 rounded-3xl p-4 sm:p-5 flex flex-col justify-between"
          style={{ background: bento.lilac, color: bento.ink, minHeight: "130px" }}
        >
          <p className="text-[10px] uppercase tracking-wider font-semibold" style={display}>
            Recommendations
          </p>
          <div>
            <p className="text-base sm:text-lg font-bold leading-tight" style={display}>
              See what people are recommending
            </p>
            <span
              className="inline-block mt-2.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: bento.ink, color: bento.bg }}
            >
              View →
            </span>
          </div>
        </Link>
      </div>

      {/* Floating FAB on mobile */}
      <button
        onClick={() => setShowAdd(true)}
        className="md:hidden fixed bottom-24 right-5 w-14 h-14 rounded-full shadow-xl grid place-items-center text-2xl font-bold z-30"
        style={{ background: bento.pink, color: "#FFF", boxShadow: `0 10px 30px -5px ${bento.pink}aa`, ...display }}
        aria-label="Add book"
      >
        +
      </button>

      {showAdd && (
        <AddBookModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            refetch();
            refetchGoals();
          }}
        />
      )}
      {showLog && (
        <LogProgressModal
          book={showLog}
          onClose={() => setShowLog(null)}
          onSuccess={() => refetch()}
        />
      )}
    </BentoShell>
  );
}

function StatTile({
  color,
  label,
  value,
  sub,
  inkOnLight,
  href,
}: {
  color: string;
  label: string;
  value: string | number;
  sub: string;
  inkOnLight?: boolean;
  href?: string;
}) {
  const text = inkOnLight ? bento.ink : "#FFFFFF";
  const className =
    "col-span-4 md:col-span-2 md:row-span-2 rounded-3xl p-4 sm:p-5 flex flex-col justify-between";
  const style = { background: color, color: text, minHeight: "130px" };
  const inner = (
    <>
      <p className="text-[10px] uppercase tracking-wider font-semibold opacity-90" style={display}>
        {label}
      </p>
      <div>
        <p className="text-2xl sm:text-4xl font-bold leading-none" style={display}>
          {value}
        </p>
        <p className="text-[10px] sm:text-xs mt-1 opacity-80">{sub}</p>
      </div>
    </>
  );
  return href ? (
    <Link href={href} className={className} style={style}>
      {inner}
    </Link>
  ) : (
    <div className={className} style={style}>
      {inner}
    </div>
  );
}

function CoverFallback({
  book,
  className,
  style,
}: {
  book: MockBook;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-2 text-center rounded-xl ${className || "aspect-[2/3]"} flex-shrink-0`}
      style={{
        background: `linear-gradient(135deg, ${bento.lilac}, ${bento.pink})`,
        color: "#FFF",
        ...style,
      }}
    >
      <span className="text-[10px] font-bold leading-tight line-clamp-3" style={display}>
        {book.title}
      </span>
      <span className="text-[9px] opacity-80 mt-1 line-clamp-1">{book.author}</span>
    </div>
  );
}

function CoverThumb({
  book,
  size,
  style,
}: {
  book: MockBook;
  size: string;
  style?: React.CSSProperties;
}) {
  if (book.cover) {
    return (
      <img
        src={book.cover}
        alt={book.title}
        className={`${size} aspect-[2/3] object-cover rounded-md shadow-md`}
        style={style}
      />
    );
  }
  return (
    <div
      className={`${size} aspect-[2/3] rounded-md shadow-md flex items-center justify-center text-[8px] text-center p-1`}
      style={{
        background: `linear-gradient(135deg, ${bento.lilac}, ${bento.pink})`,
        color: "#FFF",
        ...style,
      }}
    >
      <span style={display}>{book.title.slice(0, 24)}</span>
    </div>
  );
}
