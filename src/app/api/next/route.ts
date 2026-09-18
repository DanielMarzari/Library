import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { observedPace, hoursLeft } from '@/lib/readingPace';

/**
 * Everything the /next triage page needs, in one request.
 *
 * Computed server-side because every section is an aggregate over the whole
 * library, and shipping 968 books + 1845 recs to the client to rank them there
 * would be both slow and duplicated work.
 */

/** Books past this are "nearly done" and worth closing out. */
const NEARLY_DONE_PCT = 50;
/** Relaxed floor used only when almost nothing qualifies, and said out loud. */
const NEARLY_DONE_FALLBACK_PCT = 35;
/** A book logged within this window is live, not stalled. */
const RECENT_DAYS = 7;
/** The hero prefers a live book only if finishing it is this cheap. */
const HERO_CHEAP_PAGES = 100;

const DAY = 86400000;

/** lowercase, drop subtitle, drop trailing parens — for owned/duplicate checks. */
function normTitle(t: string): string {
  let s = (t || '').toLowerCase();
  const colon = s.indexOf(':');
  if (colon > 0) s = s.slice(0, colon);
  s = s.replace(/\s*\([^)]*\)\s*$/g, '');
  return s.replace(/[^a-z0-9]+/g, ' ').trim();
}

export async function GET(request: Request) {
  try {
    const db = getDb();
    const now = Date.now();
    // /finish asks for the whole in-progress pile, not the triage summary.
    // Same computation either way — only the cap and the floor differ.
    const url = new URL(request.url);
    const full = url.searchParams.get('full') === 'true';

    // ---- in-progress pool -------------------------------------------------
    // current_page < total drops three rows whose page number is past the end
    // of the book (The Problem of Pain at 560/98, Obadiah 430/39, Reformed
    // Dogmatics 227/165) — those are typos, not progress, and they would
    // otherwise dominate any "pages left" ranking with negative values.
    const inProgress = db.prepare(`
      SELECT b.id, b.title, b.author, b.current_page, b.start_date, b.updated_at, b.density,
             b.status,
             COALESCE(b.reading_pages, b.pages) AS total,
             (SELECT MAX(created_at) FROM reading_updates u WHERE u.book_id = b.id) AS last_read_at
      FROM books b
      WHERE b.status IN ('reading','paused')
        AND COALESCE(b.item_type,'book') = 'book'
        AND COALESCE(b.reading_pages, b.pages) > 0
        AND b.current_page > 0
        AND b.current_page < COALESCE(b.reading_pages, b.pages)
    `).all() as Array<any>;

    const enrich = (r: any) => {
      const pagesLeft = r.total - r.current_page;
      const percentDone = Math.round((r.current_page / r.total) * 100);
      const recency = new Date(r.last_read_at || r.start_date || r.updated_at || 0).getTime();
      return {
        id: r.id, title: r.title, author: r.author, status: r.status,
        currentPage: r.current_page, totalPages: r.total,
        pagesLeft, percentDone,
        daysSince: Math.floor((now - recency) / DAY),
        recency,
        lastReadAt: r.last_read_at as string | null,
      };
    };

    let pool = inProgress.map(enrich).filter(b => b.percentDone >= NEARLY_DONE_PCT);
    let poolFloor = NEARLY_DONE_PCT;
    if (pool.length < 3) {
      pool = inProgress.map(enrich).filter(b => b.percentDone >= NEARLY_DONE_FALLBACK_PCT);
      poolFloor = NEARLY_DONE_FALLBACK_PCT;
    }
    pool.sort((a, b) => a.pagesLeft - b.pagesLeft || b.percentDone - a.percentDone || b.recency - a.recency);

    // Hours left only where this book has its own measured rate. There is no
    // tier or library-median fallback: the two calibrated density tiers overlap
    // almost entirely, and a single median across a 5.75x spread is a guess
    // wearing a decimal point.
    const withHours = (b: typeof pool[number]) => {
      const ups = db.prepare(
        `SELECT pages_read, created_at FROM reading_updates WHERE book_id = ?`
      ).all(b.id) as Array<{ pages_read: number | null; created_at: string }>;
      const pace = observedPace(ups);
      return {
        ...b,
        pagesPerHour: pace?.pagesPerHour ?? null,
        hoursLeft: pace ? hoursLeft(b.pagesLeft, pace.pagesPerHour) : null,
      };
    };

    // ---- §1 hero ----------------------------------------------------------
    // Prefer a book that's actually alive: something logged in the last week
    // and cheap to close beats something marginally shorter but cold for years.
    const live = pool.filter(b => b.daysSince <= RECENT_DAYS && b.pagesLeft <= HERO_CHEAP_PAGES);
    const heroBase = live.length > 0 ? live[0] : pool[0];
    const hero = heroBase ? withHours(heroBase) : null;
    const heroAlt = pool
      .filter(b => b.id !== hero?.id)
      .sort((a, b) => b.recency - a.recency)[0] ?? null;

    // ---- §2 nearly done ---------------------------------------------------
    const nearlyDone = (full ? pool : pool.slice(0, 12)).map(withHours);
    const pagesToClose = pool.reduce((s, b) => s + b.pagesLeft, 0);

    // For /finish: everything in progress regardless of how far along, so the
    // page can show the long tail behind the nearly-done books.
    const allInProgress = full
      ? inProgress
          .map(enrich)
          .sort((a, b) => a.pagesLeft - b.pagesLeft || b.percentDone - a.percentDone)
          .map(withHours)
      : undefined;

    // ---- §3 never really started -----------------------------------------
    // Marked "reading", never logged once, barely opened, cold over a year.
    // All four conditions matter — zero logs is what separates "mis-shelved"
    // from "genuinely just started".
    const misShelvedRows = db.prepare(`
      SELECT b.id, b.title, b.author, b.current_page, b.start_date, b.updated_at,
             COALESCE(b.reading_pages, b.pages) AS total
      FROM books b
      WHERE b.status = 'reading'
        AND COALESCE(b.item_type,'book') = 'book'
        AND COALESCE(b.reading_pages, b.pages) > 0
        AND 100.0 * b.current_page / COALESCE(b.reading_pages, b.pages) < 10
        AND (SELECT COUNT(*) FROM reading_updates u WHERE u.book_id = b.id) = 0
    `).all() as Array<any>;

    const misShelved = misShelvedRows
      .map(r => ({
        id: r.id, title: r.title, author: r.author,
        currentPage: r.current_page ?? 0, totalPages: r.total,
        daysSince: Math.floor((now - new Date(r.start_date || r.updated_at || 0).getTime()) / DAY),
      }))
      .filter(r => r.daysSince >= 365)
      .sort((a, b) => b.daysSince - a.daysSince);

    // ---- §4 read next -----------------------------------------------------
    // Rank GOALS by how invested you already are versus how much is left, then
    // surface the shortest unread book from the best goals. A goal you're 14-of-15
    // through with one book left outranks one you've barely begun.
    const goalRows = db.prepare(`
      SELECT g.id AS goal_id, g.name AS goal_name, b.id AS book_id, b.title, b.author,
             b.status, COALESCE(b.reading_pages, b.pages) AS pages
      FROM learning_goals g
      JOIN learning_goal_books lgb ON lgb.goal_id = g.id
      JOIN books b ON b.id = lgb.book_id
      WHERE COALESCE(b.item_type,'book') = 'book'
    `).all() as Array<any>;

    const byGoal = new Map<string, { name: string; rows: any[] }>();
    for (const r of goalRows) {
      if (!byGoal.has(r.goal_id)) byGoal.set(r.goal_id, { name: r.goal_name, rows: [] });
      byGoal.get(r.goal_id)!.rows.push(r);
    }

    const goalScores = new Map<string, { name: string; score: number; done: number; owned: number }>();
    for (const [goalId, g] of byGoal) {
      const owned = g.rows.length;
      const done = g.rows.filter(r => r.status === 'read').length;
      const engaged = g.rows.filter(r => r.status === 'read' || r.status === 'reading').length;
      const runway = g.rows.filter(r => r.status === 'not_read').length;
      if (owned < 3 || runway < 1) continue;
      goalScores.set(goalId, { name: g.name, score: (engaged / owned) * 100 / runway, done, owned });
    }

    const candidates = new Map<string, any>();
    for (const [goalId, g] of byGoal) {
      const gs = goalScores.get(goalId);
      if (!gs) continue;
      for (const r of g.rows) {
        if (r.status !== 'not_read') continue;
        const score = gs.score - (r.pages || 0) / 100;
        const prev = candidates.get(r.book_id);
        if (!prev || score > prev.score) {
          candidates.set(r.book_id, {
            id: r.book_id, title: r.title, author: r.author, pages: r.pages,
            score, goalId, goalName: gs.name, goalDone: gs.done, goalOwned: gs.owned,
          });
        }
      }
    }

    // One book per goal, so five suggestions aren't five books from one goal.
    const readNext: any[] = [];
    const usedGoals = new Set<string>();
    for (const c of [...candidates.values()].sort((a, b) => b.score - a.score)) {
      if (usedGoals.has(c.goalId)) continue;
      usedGoals.add(c.goalId);
      readNext.push(c);
      if (readNext.length >= 5) break;
    }

    // ---- §5 buy next ------------------------------------------------------
    const recRows = db.prepare(`
      SELECT id, title, author, topic, starred, lowest_price, thriftbooks_price, amazon_price
      FROM recommendations WHERE COALESCE(item_type,'book') = 'book'
    `).all() as Array<any>;

    // MIN across stores, not a preferred-store fallback: the Zondervan
    // Illustrated Bible Backgrounds set is $188.99 on ThriftBooks and $6.99 on
    // Amazon, so picking one store first can be off by 27x.
    const priceOf = (r: any): number | null => {
      const ps = [r.thriftbooks_price, r.amazon_price, r.lowest_price].filter(
        (p): p is number => typeof p === 'number' && p > 0
      );
      return ps.length ? Math.min(...ps) : null;
    };

    const ownedTitles = new Set(
      (db.prepare(`SELECT title FROM books WHERE COALESCE(item_type,'book')='book'`).all() as Array<{ title: string }>)
        .map(b => normTitle(b.title))
    );

    const seenTitles = new Set<string>();
    const starred = recRows
      .filter(r => r.starred === 1)
      .map(r => ({ ...r, price: priceOf(r), norm: normTitle(r.title) }))
      .filter(r => r.price !== null && !ownedTitles.has(r.norm))
      .sort((a, b) => a.price! - b.price! || a.title.localeCompare(b.title))
      .filter(r => { if (seenTitles.has(r.norm)) return false; seenTitles.add(r.norm); return true; })
      .slice(0, 3)
      .map(r => ({ id: r.id, title: r.title, author: r.author, price: r.price }));

    // Goals with nothing readable on the shelf at all.
    const shelfSupply = new Map<string, number>();
    for (const [goalId, g] of byGoal) {
      shelfSupply.set(goalId, g.rows.filter(r => r.status !== 'read').length);
    }
    const goalNames = db.prepare(`SELECT id, name FROM learning_goals`).all() as Array<{ id: string; name: string }>;
    const emptyGoals = goalNames.filter(g => (shelfSupply.get(g.id) ?? 0) === 0);

    const recGoalRows = db.prepare(`
      SELECT lgb.goal_id, lgb.rec_id FROM learning_goal_books lgb WHERE lgb.rec_id IS NOT NULL
    `).all() as Array<{ goal_id: string; rec_id: string }>;

    const recById = new Map(recRows.map(r => [r.id, r]));
    // A rec only counts as "opening" a goal if it's plausibly ABOUT that goal.
    // Without this the cheapest route into Exodus is a children's novel that
    // happens to be filed under it.
    const opensGoalsFor = new Map<string, Set<string>>();
    for (const { goal_id, rec_id } of recGoalRows) {
      const goal = emptyGoals.find(g => g.id === goal_id);
      if (!goal) continue;
      const rec = recById.get(rec_id);
      if (!rec) continue;
      const gname = goal.name.toLowerCase();
      const matches =
        (rec.topic || '').toLowerCase() === `${gname} commentary` ||
        (rec.title || '').toLowerCase().includes(gname);
      if (!matches) continue;
      if (!opensGoalsFor.has(rec_id)) opensGoalsFor.set(rec_id, new Set());
      opensGoalsFor.get(rec_id)!.add(goal_id);
    }

    // Greedy set cover by price per newly-opened goal.
    const covered = new Set<string>();
    const opensGoal: any[] = [];
    for (let pick = 0; pick < 3; pick++) {
      let best: any = null;
      for (const [recId, goalSet] of opensGoalsFor) {
        const rec = recById.get(recId);
        const price = rec ? priceOf(rec) : null;
        if (!rec || price === null) continue;
        if (opensGoal.some(o => o.id === recId)) continue;
        const fresh = [...goalSet].filter(g => !covered.has(g));
        if (fresh.length === 0) continue;
        const ratio = price / fresh.length;
        if (!best || ratio < best.ratio || (ratio === best.ratio && price < best.price)) {
          best = { id: recId, title: rec.title, author: rec.author, price, ratio,
                   goals: fresh.map(g => emptyGoals.find(e => e.id === g)?.name).filter(Boolean) };
        }
      }
      if (!best) break;
      best.goals.forEach((_: string, i: number) => {});
      [...(opensGoalsFor.get(best.id) || [])].forEach(g => covered.add(g));
      opensGoal.push({ id: best.id, title: best.title, author: best.author, price: best.price, opens: best.goals });
    }

    // Books that can't be ranked at all, so the page can admit it rather than
    // silently dropping them.
    const unrankable = db.prepare(`
      SELECT COUNT(*) AS n FROM books
      WHERE status IN ('reading','paused') AND COALESCE(item_type,'book')='book'
        AND (COALESCE(reading_pages, pages) IS NULL
             OR COALESCE(reading_pages, pages) = 0
             OR current_page > COALESCE(reading_pages, pages))
    `).get() as { n: number };

    // Books whose page numbers are missing or implausible. Every book is
    // supposed to carry intro / start / end — these are entered by hand, never
    // guessed — and without them a book is invisible to every ranking here.
    // Eight books currently being read have no page count at all, including
    // ones with a dozen logged sessions.
    const needsPageData = full
      ? (db.prepare(`
          SELECT id, title, author, status, pages, intro_pages, start_page, end_page,
                 current_page,
                 (SELECT COUNT(*) FROM reading_updates u WHERE u.book_id = b.id) AS logs
          FROM books b
          WHERE COALESCE(item_type,'book') = 'book'
            AND (
              pages IS NULL OR pages < 5
              OR intro_pages IS NULL
              OR start_page IS NULL
              OR end_page IS NULL
            )
        `).all() as Array<any>)
          .map(r => ({
            id: r.id, title: r.title, author: r.author, status: r.status,
            pages: r.pages, introPages: r.intro_pages,
            startPage: r.start_page, endPage: r.end_page,
            currentPage: r.current_page, logs: r.logs,
            // What's actually missing, so the UI can point at the right field.
            missing: [
              (r.pages == null || r.pages < 5) && 'pages',
              r.intro_pages == null && 'intro',
              r.start_page == null && 'start',
              r.end_page == null && 'end',
            ].filter(Boolean) as string[],
          }))
          // Books in progress first — those are the ones being actively
          // blocked — then by how much reading is already logged against them.
          .sort((a, b) => {
            const rank = (s: string) => (s === 'reading' ? 0 : s === 'paused' ? 1 : 2);
            return rank(a.status) - rank(b.status) || b.logs - a.logs;
          })
      : undefined;

    return NextResponse.json({
      hero,
      heroAlt,
      nearlyDone,
      nearlyDoneTotal: pool.length,
      allInProgress,
      pagesToClose,
      poolFloor,
      misShelved: { count: misShelved.length, books: misShelved.slice(0, 60) },
      readNext,
      buyNext: { starred, opensGoal, emptyGoalCount: emptyGoals.length },
      unrankable: unrankable.n,
      needsPageData,
    });
  } catch (error) {
    console.error('GET /api/next error:', error);
    return NextResponse.json({ error: 'Failed to build next', details: String(error) }, { status: 500 });
  }
}
