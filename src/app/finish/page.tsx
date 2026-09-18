"use client";

export const dynamic = "force-dynamic";

// Every book you have open, closest to done first.
//
// /next shows the top of this list as one section, capped at 12, because its
// job is to pick one thing. This page's job is the opposite: show the whole
// pile in the order that makes it finishable, and let you work down it.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, NextBook, NextPayload } from "@/lib/api-client";
import { AppNav } from "@/components/AppNav";

type Band = "nearly" | "halfway" | "started" | "barely";

/** Group by how close to done, so the long tail doesn't bury the winnable ones. */
const BANDS: Array<{ key: Band; label: string; hint: string; min: number }> = [
  { key: "nearly",  label: "Nearly done",    hint: "75% and up — one sitting each",     min: 75 },
  { key: "halfway", label: "Past halfway",   hint: "50–74%",                            min: 50 },
  { key: "started", label: "Underway",       hint: "20–49%",                            min: 20 },
  { key: "barely",  label: "Barely opened",  hint: "under 20% — consider setting aside", min: 0 },
];

export default function FinishPage() {
  const [data, setData] = useState<NextPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.next.get({ full: true }));
    } catch (error) {
      console.error("Error loading /finish:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Paused books are deliberately not being worked on, so they don't belong in
  // the bands — otherwise tapping Pause appears to do nothing, since the pool
  // behind this page counts reading and paused alike. They get their own
  // section at the bottom so they're still resumable.
  const all = data?.allInProgress ?? [];
  const books = all.filter(b => b.status !== "paused");
  const pausedBooks = all.filter(b => b.status === "paused");

  const banded = useMemo(() => {
    return BANDS.map(b => ({
      ...b,
      books: books.filter(bk => {
        const band = BANDS.find(x => bk.percentDone >= x.min)!;
        return band.key === b.key;
      }),
    })).filter(b => b.books.length > 0);
  }, [books]);

  const totalPagesLeft = books.reduce((s, b) => s + b.pagesLeft, 0);

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    try { await fn(); await load(); }
    catch { alert("That didn't save. Nothing was changed."); }
    finally { setBusyId(null); }
  };

  const markFinished = (id: string) =>
    act(id, () => api.books.update(id, {
      status: "read",
      complete_date: new Date().toISOString().split("T")[0],
    }));

  const setAside = (id: string) => act(id, () => api.books.update(id, { status: "paused" }));
  // Resuming does not touch start_date or current_page — it's the same read.
  const resume = (id: string) => act(id, () => api.books.update(id, { status: "reading" }));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border-custom">
        <div className="w-full px-4 py-3 flex items-center gap-3">
          <AppNav />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight truncate">Finish</h1>
            {!loading && books.length > 0 && (
              <p className="text-[10px] text-muted-2">
                {books.length} open · {totalPagesLeft.toLocaleString()} pages to close them all
              </p>
            )}
          </div>
          <Link href="/next" className="text-xs text-muted hover:text-foreground transition-colors hidden sm:inline">
            What next →
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-border-custom border-t-emerald-500" />
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-muted">Nothing in progress. Start something from <Link href="/next" className="text-emerald-400 hover:underline">What next</Link>.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {banded.map(band => (
              <section key={band.key}>
                <div className="flex items-baseline gap-2 mb-1">
                  <h2 className="text-[11px] uppercase tracking-wider text-muted-2 font-semibold">{band.label}</h2>
                  <span className="text-[11px] text-muted-2">
                    {band.books.length} · {band.books.reduce((s, b) => s + b.pagesLeft, 0).toLocaleString()} pages
                  </span>
                </div>
                <p className="text-[11px] text-muted-2 mb-3">{band.hint}</p>
                <div className="divide-y divide-border-custom rounded-xl border border-border-custom overflow-hidden">
                  {band.books.map(b => (
                    <Row
                      key={b.id}
                      book={b}
                      busy={busyId === b.id}
                      onFinish={() => markFinished(b.id)}
                      onSetAside={() => setAside(b.id)}
                    />
                  ))}
                </div>
              </section>
            ))}

            {pausedBooks.length > 0 && (
              <section>
                <div className="flex items-baseline gap-2 mb-1">
                  <h2 className="text-[11px] uppercase tracking-wider text-muted-2 font-semibold">Set aside</h2>
                  <span className="text-[11px] text-muted-2">{pausedBooks.length}</span>
                </div>
                <p className="text-[11px] text-muted-2 mb-3">Paused on purpose. Your place is kept.</p>
                <div className="divide-y divide-border-custom rounded-xl border border-border-custom overflow-hidden opacity-70">
                  {pausedBooks.map(b => (
                    <Row
                      key={b.id}
                      book={b}
                      busy={busyId === b.id}
                      onFinish={() => markFinished(b.id)}
                      onSetAside={() => resume(b.id)}
                      asideLabel="Resume"
                    />
                  ))}
                </div>
              </section>
            )}

            {data && data.unrankable > 0 && (
              <p className="text-[11px] text-muted-2">
                {data.unrankable} more in-progress books aren&apos;t shown — they have no page count, or a
                current page past the end of the book.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Row({
  book,
  busy,
  onFinish,
  onSetAside,
  asideLabel = "Pause",
}: {
  book: NextBook;
  busy: boolean;
  onFinish: () => void;
  onSetAside: () => void;
  asideLabel?: string;
}) {
  return (
    <div className="bg-surface px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-14 flex-shrink-0 text-right">
          <span className="text-sm font-semibold text-emerald-400">{book.pagesLeft}</span>
          <span className="text-[10px] text-muted-2"> pg</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate">{book.title}</p>
          <p className="text-[11px] text-muted-2 truncate">
            {book.author} · p.{book.currentPage} of {book.totalPages}
            {book.hoursLeft != null && <> · ~{book.hoursLeft}h at your pace</>}
            {book.daysSince > 0 && <> · {book.daysSince}d untouched</>}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Link href={`/?open=${book.id}`} className="text-xs text-muted hover:text-foreground px-2 py-1">Log</Link>
          <button disabled={busy} onClick={onFinish} className="text-xs text-muted hover:text-emerald-400 disabled:opacity-40 px-2 py-1">Done</button>
          <button
            disabled={busy}
            onClick={onSetAside}
            className="text-xs text-muted hover:text-amber-400 disabled:opacity-40 px-2 py-1"
            title={asideLabel === "Pause" ? "Pause — keeps your place" : "Put it back in progress"}
          >
            {asideLabel}
          </button>
        </div>
      </div>
      <div className="mt-2 h-1 rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full bg-emerald-500/70 rounded-full" style={{ width: `${Math.min(book.percentDone, 100)}%` }} />
      </div>
    </div>
  );
}
