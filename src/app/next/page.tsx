"use client";

export const dynamic = "force-dynamic";

// Triage page: what to finish, what to start, what to buy.
//
// The organizing principle is that the library's problem is volume, not choice —
// 229 books sit in "reading", 1,845 in recommendations. So every section here is
// capped and opinionated. Nothing on this page is a browsable list; the shelf
// already does that.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, NextPayload } from "@/lib/api-client";
import { AppNav } from "@/components/AppNav";
import { formatHours } from "@/lib/readingPace";

/** Books skipped with "Not today" stay hidden for a week. */
const SNOOZE_DAYS = 7;
const SNOOZE_KEY = "library-next-snoozed";

function loadSnoozed(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(SNOOZE_KEY) || "{}"); } catch { return {}; }
}
function snooze(id: string) {
  try {
    const s = loadSnoozed();
    s[id] = Date.now();
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(s));
  } catch { /* a lost snooze just means it shows again */ }
}

export default function NextPage() {
  const [data, setData] = useState<NextPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [snoozed, setSnoozed] = useState<Record<string, number>>({});
  const [sweepOpen, setSweepOpen] = useState(false);
  const [sweepSelected, setSweepSelected] = useState<Set<string>>(new Set());
  const [sweepBusy, setSweepBusy] = useState(false);
  const [undo, setUndo] = useState<{ previous: Array<{ id: string; status: any }>; count: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api.next.get();
      setData(d);
      setSweepSelected(new Set(d.misShelved.books.map(b => b.id)));
    } catch (error) {
      console.error("Error loading /next:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { setSnoozed(loadSnoozed()); load(); }, [load]);

  // Undo expires on its own so a stale banner can't apply an old state later.
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 30000);
    return () => clearTimeout(t);
  }, [undo]);

  const isSnoozed = (id: string) => {
    const at = snoozed[id];
    return !!at && Date.now() - at < SNOOZE_DAYS * 86400000;
  };

  // The hero is whatever the server picked unless it's snoozed, in which case
  // fall through to the next-cheapest unsnoozed book rather than showing nothing.
  const hero = data
    ? (data.hero && !isSnoozed(data.hero.id)
        ? data.hero
        : data.nearlyDone.find(b => !isSnoozed(b.id)) ?? null)
    : null;

  const markFinished = async (id: string) => {
    try {
      await api.books.update(id, { status: "read", complete_date: new Date().toISOString().split("T")[0] });
      load();
    } catch {
      alert("Could not mark that finished. Nothing was changed.");
    }
  };

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
      load();
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
      load();
    } catch {
      alert("Could not undo.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-border-custom border-t-emerald-500" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />
        <p className="p-6 text-muted">Could not load. Try refreshing.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 space-y-8">
        {undo && (
          <div className="flex items-center gap-3 rounded-lg border border-border-custom bg-surface px-4 py-2.5 text-sm">
            <span className="text-muted flex-1">Moved {undo.count} books.</span>
            <button onClick={applyUndo} className="text-emerald-400 hover:text-emerald-300 font-medium">Undo</button>
          </div>
        )}

        {/* §1 — one book, one decision */}
        <section>
          <h2 className="text-[11px] uppercase tracking-wider text-muted-2 font-semibold mb-3">Finish today</h2>
          {hero ? (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5">
              <p className="text-lg font-bold leading-tight">{hero.title}</p>
              <p className="text-sm text-muted mt-0.5">{hero.author}</p>
              <p className="text-sm mt-3">
                <span className="text-emerald-400 font-semibold">{hero.pagesLeft} pages left</span>
                <span className="text-muted"> · {hero.percentDone}% done · p.{hero.currentPage} of {hero.totalPages}</span>
              </p>
              <p className="text-xs text-muted-2 mt-1">
                {hero.hoursLeft != null && hero.pagesPerHour
                  ? <>At your measured {hero.pagesPerHour} pg/hr on this book, {formatHours(hero.hoursLeft)} left.</>
                  : <>No measured pace for this one yet — log a couple of sittings and it&apos;ll estimate.</>}
                {hero.daysSince > 0 && <> Last opened {hero.daysSince} {hero.daysSince === 1 ? "day" : "days"} ago.</>}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Link href={`/?open=${hero.id}`} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                  Log pages
                </Link>
                <button onClick={() => markFinished(hero.id)} className="bg-surface-2 hover:bg-border-custom text-foreground px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                  Mark finished
                </button>
                <button
                  onClick={() => { snooze(hero.id); setSnoozed(loadSnoozed()); }}
                  className="text-muted hover:text-foreground px-3 py-1.5 rounded-lg text-sm transition-colors"
                >
                  Not today
                </button>
              </div>
              {data.heroAlt && data.heroAlt.id !== hero.id && (
                <p className="text-xs text-muted-2 mt-3">
                  or finish <span className="text-muted">{data.heroAlt.title}</span> — {data.heroAlt.pagesLeft} pages
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">Nothing is close enough to finish right now. Start something below.</p>
          )}
        </section>

        {/* §2 — bound the pile */}
        {data.nearlyDone.length > 0 && (
          <section>
            <h2 className="text-[11px] uppercase tracking-wider text-muted-2 font-semibold mb-1">Nearly yours</h2>
            <p className="text-sm text-muted mb-3">
              {data.nearlyDoneTotal} books are more than {data.poolFloor}% read.{" "}
              <span className="text-foreground font-medium">{data.pagesToClose.toLocaleString()} pages closes all of them.</span>
              {data.poolFloor !== 50 && <span className="text-muted-2"> (Nothing over 50% — showing {data.poolFloor}%+.)</span>}
            </p>
            <div className="divide-y divide-border-custom rounded-xl border border-border-custom overflow-hidden">
              {data.nearlyDone.map(b => (
                <div key={b.id} className="flex items-center gap-3 px-4 py-2.5 bg-surface">
                  <div className="w-14 flex-shrink-0 text-right">
                    <span className="text-sm font-semibold text-emerald-400">{b.pagesLeft}</span>
                    <span className="text-[10px] text-muted-2"> pg</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{b.title}</p>
                    <p className="text-[11px] text-muted-2 truncate">
                      {b.percentDone}% · {b.author}
                      {b.hoursLeft != null && <> · ~{b.hoursLeft}h at your pace</>}
                    </p>
                  </div>
                  <Link href={`/?open=${b.id}`} className="flex-shrink-0 text-xs text-muted hover:text-foreground px-2 py-1">Log</Link>
                  <button onClick={() => markFinished(b.id)} className="flex-shrink-0 text-xs text-muted hover:text-emerald-400 px-2 py-1">Done</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* §3 — the mis-shelved sweep */}
        {data.misShelved.count >= 10 && (
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

        {/* §4 — what to start */}
        {data.readNext.length > 0 && (
          <section>
            <h2 className="text-[11px] uppercase tracking-wider text-muted-2 font-semibold mb-1">Read next</h2>
            <p className="text-sm text-muted mb-3">Unread books from the goals you&apos;re furthest into.</p>
            <div className="divide-y divide-border-custom rounded-xl border border-border-custom overflow-hidden">
              {data.readNext.map(b => (
                <Link key={b.id} href={`/?open=${b.id}`} className="flex items-center gap-3 px-4 py-2.5 bg-surface hover:bg-surface-2 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{b.title}</p>
                    <p className="text-[11px] text-muted-2 truncate">{b.author}{b.pages ? ` · ${b.pages}p` : ""}</p>
                  </div>
                  <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/15 text-indigo-300">
                    {b.goalName} · {b.goalDone}/{b.goalOwned} read
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* §5 — what to buy */}
        {(data.buyNext.starred.length > 0 || data.buyNext.opensGoal.length > 0) && (
          <section>
            <h2 className="text-[11px] uppercase tracking-wider text-muted-2 font-semibold mb-3">Buy next</h2>

            {data.buyNext.starred.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-muted mb-2">
                  Starred, cheapest first —{" "}
                  <span className="text-foreground font-medium">
                    ${data.buyNext.starred.reduce((s, r) => s + r.price, 0).toFixed(2)} for all {data.buyNext.starred.length}
                  </span>
                </p>
                <div className="divide-y divide-border-custom rounded-xl border border-border-custom overflow-hidden">
                  {data.buyNext.starred.map(r => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 bg-surface">
                      <span className="w-16 text-right text-sm font-semibold text-amber-400 flex-shrink-0">${r.price.toFixed(2)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{r.title}</p>
                        <p className="text-[11px] text-muted-2 truncate">{r.author}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.buyNext.opensGoal.length > 0 && (
              <div>
                <p className="text-xs text-muted mb-2">
                  Opens a goal you own nothing in —{" "}
                  <span className="text-foreground font-medium">
                    ${data.buyNext.opensGoal.reduce((s, r) => s + r.price, 0).toFixed(2)} opens{" "}
                    {new Set(data.buyNext.opensGoal.flatMap(r => r.opens)).size} of your {data.buyNext.emptyGoalCount} empty goals
                  </span>
                </p>
                <div className="divide-y divide-border-custom rounded-xl border border-border-custom overflow-hidden">
                  {data.buyNext.opensGoal.map(r => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 bg-surface">
                      <span className="w-16 text-right text-sm font-semibold text-amber-400 flex-shrink-0">${r.price.toFixed(2)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{r.title}</p>
                        <p className="text-[11px] text-muted-2 truncate">{r.author}</p>
                      </div>
                      <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/15 text-indigo-300">
                        {r.opens.join(" · ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {data.unrankable > 0 && (
          <p className="text-[11px] text-muted-2">
            {data.unrankable} in-progress books can&apos;t be ranked — they have no page count, or a current
            page past the end of the book.
          </p>
        )}
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border-custom">
      <div className="w-full px-4 py-3 flex items-center gap-3">
        <AppNav />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight truncate">What next</h1>
        </div>
      </div>
    </header>
  );
}
