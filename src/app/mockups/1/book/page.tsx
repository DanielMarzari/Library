"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/lib/api-client";
import { BentoShell, bento, display } from "../theme";
import { useBooks, useReadingUpdates } from "../useLibraryData";
import { EditBookModal, LogProgressModal } from "../modals";
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
  const { books, loading, refetch } = useBooks();
  const b =
    (idParam && books.find((x) => x.id === idParam)) ||
    books.find((x) => x.status === "reading") ||
    books[0];

  const { updates, refetch: refetchUpdates } = useReadingUpdates(b?.id);
  const [showLog, setShowLog] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading || !b) {
    return (
      <BentoShell current="book">
        <Loading />
      </BentoShell>
    );
  }

  // Inline rating change — no modal needed, single tap
  const setRating = async (r: number) => {
    if (busy) return;
    setBusy(true);
    try {
      await api.books.update(b.id, { rating: r === b.rating ? undefined : r });
      refetch();
    } finally {
      setBusy(false);
    }
  };

  // Cycle status: not_read → reading → read → not_read
  const quickStatus = async (next: MockBook["status"]) => {
    if (busy) return;
    setBusy(true);
    try {
      const now = new Date().toISOString().split("T")[0];
      await api.books.update(b.id, {
        status: next,
        complete_date: next === "read" && b.status !== "read" ? now : undefined,
        start_date: next === "reading" && !b.start_date ? now : undefined,
      });
      refetch();
    } finally {
      setBusy(false);
    }
  };

  const toggleFavorite = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.books.update(b.id, { favorite: !b.favorite });
      refetch();
    } finally {
      setBusy(false);
    }
  };

  const deleteUpdate = async (id: string) => {
    if (!confirm("Remove this reading update?")) return;
    await api.readingUpdates.delete(id);
    refetchUpdates();
  };

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
              className="object-cover rounded-2xl shadow-2xl mx-auto sm:mx-0 flex-shrink-0"
              style={{ width: "144px", height: "216px", aspectRatio: "2 / 3" }}
            />
          ) : (
            <div
              className="rounded-2xl shadow-2xl mx-auto sm:mx-0 flex items-center justify-center p-3 flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${bento.lilac}, ${bento.pink})`,
                width: "144px",
                height: "216px",
                aspectRatio: "2 / 3",
              }}
            >
              <span className="text-sm font-bold leading-tight text-center" style={display}>
                {b.title}
              </span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] uppercase tracking-wider opacity-60 mb-2" style={display}>
                {b.status === "reading" ? "Now reading" : b.status === "read" ? "Read" : "On the queue"}
              </p>
              <button
                onClick={toggleFavorite}
                className="text-xl"
                style={{ color: b.favorite ? bento.yellow : "rgba(255,255,255,0.3)" }}
                aria-label="Toggle favorite"
              >
                {b.favorite ? "★" : "☆"}
              </button>
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold leading-[1.05]" style={display}>
              {b.title}
            </h1>
            <p className="text-base sm:text-lg opacity-80 mt-1.5">
              {b.author}
              {b.pages > 0 && ` · ${b.pages} pp`}
            </p>

            {/* Inline star rating */}
            <div className="mt-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    disabled={busy}
                    className="text-2xl leading-none disabled:opacity-50 transition-transform hover:scale-110"
                    style={{ color: n <= (b.rating || 0) ? bento.yellow : "rgba(255,255,255,0.25)" }}
                  >
                    ★
                  </button>
                ))}
                {b.rating && (
                  <button
                    onClick={() => setRating(0)}
                    className="ml-2 text-[10px] uppercase tracking-wider"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    clear
                  </button>
                )}
              </div>
            </div>

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

            <div className="flex flex-wrap gap-2 mt-5">
              <button
                onClick={() => setShowLog(true)}
                className="px-4 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: bento.yellow, color: bento.ink, ...display }}
              >
                ▶ Log progress
              </button>
              {b.status !== "read" && (
                <button
                  onClick={() => quickStatus("read")}
                  disabled={busy}
                  className="px-4 py-2.5 rounded-full text-sm font-semibold"
                  style={{ background: bento.green, color: bento.ink, ...display }}
                >
                  ✓ Mark read
                </button>
              )}
              {b.status !== "reading" && (
                <button
                  onClick={() => quickStatus("reading")}
                  disabled={busy}
                  className="px-4 py-2.5 rounded-full text-sm font-semibold"
                  style={{ background: "rgba(255,255,255,0.15)", color: "#FFF", ...display }}
                >
                  📖 Start reading
                </button>
              )}
              <button
                onClick={() => setShowEdit(true)}
                className="px-4 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.15)", color: "#FFF", ...display }}
              >
                Edit
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
              onClick={() => setShowLog(true)}
              className="text-xs font-medium px-3 py-1.5 rounded-full text-white"
              style={{ background: bento.pink, ...display }}
            >
              + Add note
            </button>
          </div>
          {updates.length === 0 ? (
            <div
              className="rounded-2xl p-5 text-sm italic text-center"
              style={{ background: bento.bg, color: bento.inkSoft }}
            >
              No reading updates yet. Tap &ldquo;Add note&rdquo; to log your first one.
            </div>
          ) : (
            <ul className="space-y-3">
              {updates.slice(0, 12).map((u, i) => (
                <li key={u.id} className="flex gap-3 p-3 rounded-2xl group" style={{ background: bento.bg }}>
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
                      {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    {u.notes && <p className="text-sm mt-0.5 leading-snug">{u.notes}</p>}
                  </div>
                  <button
                    onClick={() => deleteUpdate(u.id)}
                    className="opacity-0 group-hover:opacity-100 text-[10px] font-semibold transition-opacity"
                    style={{ color: bento.pink, ...display }}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Side info */}
        <div className="md:col-span-5 space-y-3 sm:space-y-4">
          <div className="rounded-3xl p-5" style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}>
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: bento.inkSoft, ...display }}>
                Details
              </p>
              <button
                onClick={() => setShowEdit(true)}
                className="text-[10px] uppercase tracking-wider font-semibold"
                style={{ color: bento.pink, ...display }}
              >
                Edit
              </button>
            </div>
            <dl className="space-y-2.5 text-sm">
              <Row label="Pages" value={b.pages > 0 ? `${b.pages}` : "—"} />
              <Row label="Source" value={b.source || "—"} />
              <Row
                label="Status"
                value={b.status === "read" ? "Read" : b.status === "reading" ? "Reading" : "Up next"}
                pill={b.status === "read" ? bento.green : b.status === "reading" ? bento.yellow : bento.lilac}
              />
              <Row label="Rating" value={b.rating ? `${b.rating}★` : "—"} />
              {b.start_date && <Row label="Started" value={fmtDate(b.start_date)} />}
              {b.complete_date && <Row label="Finished" value={fmtDate(b.complete_date)} />}
            </dl>
          </div>

          {allReads.length > 0 && (
            <div className="rounded-3xl p-5" style={{ background: bento.blue, color: "#FFF" }}>
              <p className="text-[10px] uppercase tracking-wider font-semibold mb-3" style={display}>
                More from {b.author.split(" ").pop()}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {allReads.map((other) => (
                  <a
                    key={other.id}
                    href={`/mockups/1/book?id=${encodeURIComponent(other.id)}`}
                  >
                    {other.cover ? (
                      <img
                        src={other.cover}
                        alt={other.title}
                        className="w-full aspect-[2/3] object-cover rounded-md shadow"
                      />
                    ) : (
                      <div className="w-full aspect-[2/3] rounded-md" style={{ background: "rgba(255,255,255,0.2)" }} />
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showLog && (
        <LogProgressModal
          book={b}
          onClose={() => setShowLog(false)}
          onSuccess={() => {
            refetchUpdates();
            refetch();
          }}
        />
      )}
      {showEdit && (
        <EditBookModal
          book={b}
          onClose={() => setShowEdit(false)}
          onSuccess={() => refetch()}
          onDelete={() => {
            // Send the user back to the shelf after a delete
            window.location.href = "/mockups/1/shelf";
          }}
        />
      )}
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

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
