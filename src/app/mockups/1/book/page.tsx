"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BentoShell, bento, display } from "../theme";
import { useBooks, useReadingUpdates } from "../useLibraryData";
import type { MockBook } from "../../data";

export default function BentoBookDetailPage() {
  return (
    <Suspense fallback={<BentoShell current="book"><Loading /></BentoShell>}>
      <BentoBookDetail />
    </Suspense>
  );
}

function BentoBookDetail() {
  const search = useSearchParams();
  const idParam = search.get("id");
  const { books, loading } = useBooks();
  const b =
    (idParam && books.find((x) => x.id === idParam)) ||
    books.find((x) => x.status === "reading") ||
    books[0];

  const { updates } = useReadingUpdates(b?.id);

  if (loading || !b) {
    return (
      <BentoShell current="book">
        <Loading />
      </BentoShell>
    );
  }

  const progress = b.progress ?? 0;
  const pagesIn = b.pages ? Math.round((b.pages * progress) / 100) : 0;
  const allReads = books
    .filter((x) => x.author === b.author && x.id !== b.id)
    .slice(0, 4);

  return (
    <BentoShell current="book">
      {/* Hero */}
      <div
        className="rounded-3xl p-5 sm:p-7 relative overflow-hidden mt-2"
        style={{ background: bento.ink, color: bento.bg }}
      >
        <div className="absolute -right-16 -bottom-16 w-72 h-72 rounded-full opacity-30" style={{ background: bento.pink, filter: "blur(50px)" }} />
        <div className="absolute -left-16 -top-16 w-56 h-56 rounded-full opacity-30" style={{ background: bento.yellow, filter: "blur(40px)" }} />
        <div className="relative flex flex-col sm:flex-row gap-5 sm:gap-7">
          {b.cover ? (
            <img
              src={b.cover}
              alt={b.title}
              className="w-32 sm:w-44 aspect-[2/3] object-cover rounded-2xl shadow-2xl mx-auto sm:mx-0"
            />
          ) : (
            <div
              className="w-32 sm:w-44 aspect-[2/3] rounded-2xl shadow-2xl mx-auto sm:mx-0 flex items-center justify-center p-3"
              style={{ background: `linear-gradient(135deg, ${bento.lilac}, ${bento.pink})` }}
            >
              <span className="text-sm font-bold leading-tight text-center" style={display}>
                {b.title}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider opacity-60 mb-2" style={display}>
              {b.status === "reading" ? "Now reading" : b.status === "read" ? "Read" : "On the queue"}
            </p>
            <h1 className="text-3xl sm:text-5xl font-bold leading-[1.05]" style={display}>
              {b.title}
            </h1>
            <p className="text-base sm:text-lg opacity-80 mt-1.5">
              {b.author}
              {b.pages > 0 && ` · ${b.pages} pp`}
            </p>

            {b.topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {b.topics.map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                    style={{ background: "rgba(255,255,255,0.12)" }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {b.status === "reading" && b.pages > 0 && (
              <div className="mt-5">
                <div className="flex justify-between text-xs sm:text-sm mb-2">
                  <span>Page {pagesIn} of {b.pages}</span>
                  <span className="font-bold" style={{ color: bento.yellow }}>
                    {progress}%
                  </span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${bento.yellow}, ${bento.pink})` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <button
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: bento.yellow, color: bento.ink, ...display }}
              >
                Log progress
              </button>
              <button
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.15)", color: "#FFF", ...display }}
              >
                {b.status === "read" ? "Mark unread" : "Mark read"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 mt-3">
        {/* Reading log */}
        <div className="md:col-span-7 rounded-3xl p-5 sm:p-6" style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-bold" style={display}>Reading log</h2>
            <button
              className="text-xs font-medium px-3 py-1.5 rounded-full"
              style={{ background: bento.pink, color: "#FFF", ...display }}
            >
              + Add note
            </button>
          </div>
          {updates.length === 0 ? (
            <div
              className="rounded-2xl p-5 text-sm italic text-center"
              style={{ background: bento.bg, color: bento.inkSoft }}
            >
              No reading updates yet for this book.
            </div>
          ) : (
            <ul className="space-y-3">
              {updates.slice(0, 8).map((u, i) => (
                <li key={u.id} className="flex gap-3 p-3 rounded-2xl" style={{ background: bento.bg }}>
                  <div
                    className="w-12 flex-shrink-0 rounded-xl grid place-items-center text-center"
                    style={{
                      background: i === 0 ? bento.pink : bento.ink + "10",
                      color: i === 0 ? "#FFF" : bento.ink,
                    }}
                  >
                    <span className="text-lg font-bold leading-none" style={display}>
                      {u.pages_read || 0}
                    </span>
                    <span className="text-[9px] uppercase opacity-70 mt-0.5">pages</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[10px] uppercase tracking-wider font-semibold"
                      style={{ color: bento.inkSoft, ...display }}
                    >
                      {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                    {u.notes && <p className="text-sm mt-0.5 leading-snug">{u.notes}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Side info */}
        <div className="md:col-span-5 space-y-3 sm:space-y-4">
          <div className="rounded-3xl p-5" style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-3" style={{ color: bento.inkSoft, ...display }}>
              Details
            </p>
            <dl className="space-y-2.5 text-sm">
              <Row label="Pages" value={b.pages > 0 ? `${b.pages}` : "—"} />
              <Row label="Source" value={b.source || "—"} />
              <Row
                label="Status"
                value={b.status === "read" ? "Read" : b.status === "reading" ? "Reading" : "Up next"}
                pill={b.status === "read" ? bento.green : b.status === "reading" ? bento.yellow : bento.lilac}
              />
              <Row label="Rating" value={b.rating ? `${b.rating}★` : "—"} />
            </dl>
          </div>

          {allReads.length > 0 && (
            <div className="rounded-3xl p-5" style={{ background: bento.blue, color: "#FFF" }}>
              <p className="text-[10px] uppercase tracking-wider font-semibold mb-3" style={display}>
                More from {b.author.split(" ").pop()}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {allReads.map((other) => (
                  <img
                    key={other.id}
                    src={other.cover}
                    alt={other.title}
                    className="w-full aspect-[2/3] object-cover rounded-md shadow"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </BentoShell>
  );
}

function Row({ label, value, pill }: { label: string; value: string; pill?: string }) {
  return (
    <div className="flex justify-between items-center">
      <dt className="text-xs uppercase tracking-wider" style={{ color: bento.inkSoft, ...display }}>
        {label}
      </dt>
      <dd>
        {pill ? (
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-bold"
            style={{ background: pill, color: bento.ink }}
          >
            {value}
          </span>
        ) : (
          <span className="text-sm font-medium">{value}</span>
        )}
      </dd>
    </div>
  );
}

function Loading() {
  return (
    <div
      className="mt-10 p-8 rounded-3xl text-center"
      style={{ background: bento.card, border: `1px solid ${bento.ink}10`, color: bento.inkSoft }}
    >
      Loading book...
    </div>
  );
}
