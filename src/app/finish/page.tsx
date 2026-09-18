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
import { Book } from "@/types/book";
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
  // The mis-shelved sweep. This lives here rather than on /next because it is
  // pile management, not a reading decision.
  const [sweepOpen, setSweepOpen] = useState(false);
  const [sweepSelected, setSweepSelected] = useState<Set<string>>(new Set());
  const [sweepBusy, setSweepBusy] = useState(false);
  const [undo, setUndo] = useState<{ previous: Array<{ id: string; status: Book["status"] }>; count: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api.next.get({ full: true });
      setData(d);
      setSweepSelected(new Set(d.misShelved.books.map(b => b.id)));
    } catch (error) {
      console.error("Error loading /finish:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Undo expires so a stale banner can't reapply an old state later.
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 30000);
    return () => clearTimeout(t);
  }, [undo]);

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

  const setAside = (id: string) => act(id, () => api.books.update(id, { status: "paused" }));
  // Resuming does not touch start_date or current_page — it's the same read.
  const resume = (id: string) => act(id, () => api.books.update(id, { status: "reading" }));

  const runSweep = async (status: "not_read" | "paused") => {
    if (!data) return;
    const ids = data.misShelved.books.filter(b => sweepSelected.has(b.id)).map(b => b.id);
    if (ids.length === 0) return;
    if (!confirm(`Move ${ids.length} book${ids.length === 1 ? "" : "s"} from "reading" to "${status === "not_read" ? "Not Read" : "Paused"}"?`)) return;
    setSweepBusy(true);
    try {
      const res = await api.booksBulk.setStatus(ids.map(id => ({ id, status })));
      setUndo({ previous: res.previous, count: res.changed });
      setSweepOpen(false);
      await load();
    } catch {
      alert("Could not update those books. Nothing was changed.");
    } finally {
      setSweepBusy(false);
    }
  };

  const applyUndo = async () => {
    if (!undo) return;
    try {
      await api.booksBulk.setStatus(undo.previous);
      setUndo(null);
      await load();
    } catch {
      alert("Could not undo.");
    }
  };

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
            {undo && (
              <div className="flex items-center gap-3 rounded-lg border border-border-custom bg-surface px-4 py-2.5 text-sm">
                <span className="text-muted flex-1">Moved {undo.count} books.</span>
                <button onClick={applyUndo} className="text-emerald-400 hover:text-emerald-300 font-medium">Undo</button>
              </div>
            )}
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
                      onSetAside={() => resume(b.id)}
                      asideLabel="Resume"
                    />
                  ))}
                </div>
              </section>
            )}

        {/* §3 — the mis-shelved sweep */}
        {data && data.misShelved.count >= 10 && (
          <section>
            <h2 className="text-[11px] uppercase tracking-wider text-muted-2 font-semibold mb-1">Never really started</h2>
            <p className="text-sm text-muted mb-3">
              {data.misShelved.count}{" "}books are marked &ldquo;reading&rdquo; but sit under 10% with nothing ever
              logged, all cold for over a year. They&apos;re inflating every count on the site.
            </p>
            {!sweepOpen ? (
              <button onClick={() => setSweepOpen(true)} className="bg-surface-2 hover:bg-border-custom text-foreground px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                Review and fix
              </button>
            ) : (
              <div className="rounded-xl border border-border-custom overflow-hidden">
                <div className="max-h-72 overflow-y-auto divide-y divide-border-custom">
                  {data.misShelved.books.map(b => (
                    <label key={b.id} className="flex items-center gap-3 px-4 py-2 bg-surface cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sweepSelected.has(b.id)}
                        onChange={e => {
                          setSweepSelected(prev => {
                            const n = new Set(prev);
                            if (e.target.checked) n.add(b.id); else n.delete(b.id);
                            return n;
                          });
                        }}
                        className="accent-emerald-600"
                      />
                      <span className="flex-1 min-w-0 text-sm truncate">{b.title}</span>
                      <span className="text-[11px] text-muted-2 flex-shrink-0">
                        p.{b.currentPage}/{b.totalPages} · {b.daysSince}d
                      </span>
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-surface-2 border-t border-border-custom">
                  <span className="text-xs text-muted flex-1">{sweepSelected.size} selected</span>
                  <button disabled={sweepBusy || sweepSelected.size === 0} onClick={() => runSweep("not_read")}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                    Mark Not Read
                  </button>
                  <button disabled={sweepBusy || sweepSelected.size === 0} onClick={() => runSweep("paused")}
                    className="bg-surface hover:bg-border-custom disabled:opacity-50 text-foreground px-3 py-1.5 rounded-lg text-xs font-medium">
                    Mark Paused
                  </button>
                  <button onClick={() => setSweepOpen(false)} className="text-xs text-muted hover:text-foreground px-2 py-1.5">Cancel</button>
                </div>
              </div>
            )}
          </section>
        )}

            {data?.needsPageData && data.needsPageData.length > 0 && (
              <section>
                <div className="flex items-baseline gap-2 mb-1">
                  <h2 className="text-[11px] uppercase tracking-wider text-amber-500/80 font-semibold">Missing page numbers</h2>
                  <span className="text-[11px] text-muted-2">{data.needsPageData.length}</span>
                </div>
                <p className="text-[11px] text-muted-2 mb-3">
                  Every book needs intro, start and end pages. Without them a book can&apos;t be ranked,
                  progressed, or estimated — it&apos;s invisible to this page.
                  {data.needsPageData.some(b => b.status === "reading") && (
                    <> The ones you&apos;re reading are listed first.</>
                  )}
                </p>
                <div className="divide-y divide-border-custom rounded-xl border border-amber-500/25 overflow-hidden">
                  {data.needsPageData.map(b => (
                    <PageDataRow key={b.id} book={b} onSaved={load} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * Fill in a book's page numbers without leaving the page.
 *
 * These are entered by hand and never inferred — a guessed page count silently
 * corrupts every percentage, pace estimate and ranking downstream of it. Total
 * is offered too, because a book with no total can't be ranked at all even if
 * start and end are present.
 */
function PageDataRow({
  book,
  onSaved,
}: {
  book: NonNullable<NextPayload["needsPageData"]>[number];
  onSaved: () => Promise<void> | void;
}) {
  const [intro, setIntro] = useState(book.introPages?.toString() ?? "");
  const [start, setStart] = useState(book.startPage?.toString() ?? "");
  const [end, setEnd] = useState(book.endPage?.toString() ?? "");
  const [total, setTotal] = useState(
    book.pages != null && book.pages >= 5 ? String(book.pages) : ""
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const num = (s: string) => (s.trim() === "" ? null : parseInt(s, 10));

  const save = async () => {
    const i = num(intro), s = num(start), e = num(end), t = num(total);
    setErr("");
    if (s != null && e != null && e < s) { setErr("End page is before the start page."); return; }
    if (t != null && e != null && e > t) { setErr(`End page ${e} is past the ${t}-page total.`); return; }
    setSaving(true);
    try {
      await api.books.update(book.id, {
        intro_pages: i, start_page: s, end_page: e,
        ...(t != null ? { pages: t } : {}),
      });
      await onSaved();
    } catch (e2: unknown) {
      setErr(e2 instanceof Error ? e2.message : "Could not save.");
      setSaving(false);
    }
  };

  const complete = intro.trim() && start.trim() && end.trim() && total.trim();
  const cls = "w-16 bg-surface-2 border border-border-custom rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-emerald-600";

  return (
    <div className="bg-surface px-4 py-3">
      <div className="flex items-baseline gap-2 mb-2">
        <p className="text-sm truncate flex-1 min-w-0">{book.title}</p>
        {book.status === "reading" && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 flex-shrink-0">
            reading{book.logs > 0 ? ` · ${book.logs} logs` : ""}
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-2 mb-2 truncate">
        {book.author}
        {book.currentPage ? ` · currently at p.${book.currentPage}` : ""}
        {` · missing ${book.missing.join(", ")}`}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[10px] text-muted-2">
          <span className="block mb-0.5">Intro</span>
          <input className={cls} inputMode="numeric" value={intro}
            onChange={e => setIntro(e.target.value.replace(/[^0-9]/g, ""))} />
        </label>
        <label className="text-[10px] text-muted-2">
          <span className="block mb-0.5">Start</span>
          <input className={cls} inputMode="numeric" value={start}
            onChange={e => setStart(e.target.value.replace(/[^0-9]/g, ""))} />
        </label>
        <label className="text-[10px] text-muted-2">
          <span className="block mb-0.5">End</span>
          <input className={cls} inputMode="numeric" value={end}
            onChange={e => setEnd(e.target.value.replace(/[^0-9]/g, ""))} />
        </label>
        <label className="text-[10px] text-muted-2">
          <span className="block mb-0.5">Total</span>
          <input className={cls} inputMode="numeric" value={total}
            onChange={e => setTotal(e.target.value.replace(/[^0-9]/g, ""))} />
        </label>
        <button
          onClick={save}
          disabled={saving || !complete}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          title={complete ? "Save" : "Fill all four to save"}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {err && <p className="text-[11px] text-red-400 mt-2">{err}</p>}
    </div>
  );
}

function Row({
  book,
  busy,
  onSetAside,
  asideLabel = "Pause",
}: {
  book: NextBook;
  busy: boolean;
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
