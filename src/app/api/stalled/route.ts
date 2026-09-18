import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

/** A book marked "reading" with nothing logged for this long has stalled. */
const STALE_AFTER_DAYS = 42;

/**
 * The stalled pile, and the single best book to pick back up.
 *
 * Deliberately a tiny endpoint rather than something the home page derives from
 * its own book list: the shelf only fetches books matching the active filter,
 * so the nudge would vanish whenever you were looking at, say, "Read".
 *
 * "Closest to done" only considers books with real progress (current_page > 0).
 * Most of the stalled pile is books marked reading and never opened — those
 * aren't nearly-finished, they're mis-shelved, and suggesting one as "almost
 * there" would be wrong.
 */
export async function GET() {
  try {
    const db = getDb();

    const rows = db.prepare(`
      SELECT b.id, b.title, b.author, b.current_page, b.start_date,
             COALESCE(b.reading_pages, b.pages) AS total_pages,
             (SELECT MAX(created_at) FROM reading_updates u WHERE u.book_id = b.id) AS last_read_at,
             b.updated_at
      FROM books b
      WHERE b.status = 'reading' AND COALESCE(b.item_type,'book') = 'book'
        -- A cookbook is never 'stalled'; it's consulted.
        AND COALESCE(b.reading_mode,'linear') = 'linear'
    `).all() as Array<{
      id: string; title: string; author: string;
      current_page: number | null; start_date: string | null;
      total_pages: number | null; last_read_at: string | null; updated_at: string | null;
    }>;

    const cutoff = Date.now() - STALE_AFTER_DAYS * 86400000;
    const lastTouch = (r: typeof rows[number]) =>
      new Date(r.last_read_at || r.start_date || r.updated_at || 0).getTime();

    const stalled = rows.filter(r => lastTouch(r) < cutoff);

    // Candidates: genuinely part-read, and we know how long they are.
    const candidates = stalled
      .filter(r => (r.current_page ?? 0) > 0 && (r.total_pages ?? 0) > 0)
      .map(r => {
        const total = r.total_pages!;
        const pagesLeft = Math.max(total - (r.current_page ?? 0), 0);
        return {
          id: r.id,
          title: r.title,
          author: r.author,
          currentPage: r.current_page ?? 0,
          totalPages: total,
          pagesLeft,
          percentDone: Math.round(((r.current_page ?? 0) / total) * 100),
          lastReadAt: r.last_read_at,
          daysSince: Math.floor((Date.now() - lastTouch(r)) / 86400000),
        };
      })
      .filter(c => c.pagesLeft > 0);

    // "Closest to done" has to mean genuinely near the end, not merely short.
    // Sorting on pages-left alone put a 53-page book you're 6% into above one
    // you're 88% through, which is the opposite of an encouraging suggestion.
    // Require real progress first, then prefer the cheapest finish among those.
    const MEANINGFULLY_STARTED = 40; // percent
    const wellStarted = candidates.filter(c => c.percentDone >= MEANINGFULLY_STARTED);
    const ranked = (wellStarted.length > 0 ? wellStarted : candidates)
      .sort((a, b) => a.pagesLeft - b.pagesLeft);

    return NextResponse.json({
      stalledCount: stalled.length,
      readingCount: rows.length,
      // A short list so the client can rotate past a dismissed one without a refetch.
      candidates: ranked.slice(0, 5),
    });
  } catch (error) {
    console.error('GET /api/stalled error:', error);
    return NextResponse.json({ error: 'Failed to compute stalled books' }, { status: 500 });
  }
}
