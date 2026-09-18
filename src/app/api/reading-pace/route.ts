import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { observedPace, tierStats, MIN_BOOKS_FOR_TIER } from '@/lib/readingPace';

/**
 * Library-wide reading pace, measured from the gaps between consecutive log
 * entries (see src/lib/readingPace.ts for why that works).
 *
 * Returns:
 *   perBook  — observed pages/hour for every book with enough timed reading
 *   tiers    — pages/hour range per density tag, for estimating unread books
 *   needsTag — books with a measured rate but no density tag. These are the
 *              highest-value tagging targets: each one directly sharpens the
 *              tier estimates, and no other book can.
 */
export async function GET() {
  try {
    const db = getDb();

    const rows = db.prepare(`
      SELECT u.book_id, u.pages_read, u.created_at,
             b.title, b.author, b.density, b.pages, b.status
      FROM reading_updates u
      JOIN books b ON b.id = u.book_id
      ORDER BY u.book_id, u.created_at
    `).all() as Array<{
      book_id: string; pages_read: number | null; created_at: string;
      title: string; author: string; density: string | null;
      pages: number | null; status: string;
    }>;

    const grouped = new Map<string, typeof rows>();
    for (const r of rows) {
      if (!grouped.has(r.book_id)) grouped.set(r.book_id, []);
      grouped.get(r.book_id)!.push(r);
    }

    const perBook: Record<string, {
      title: string; author: string; density: string | null;
      pagesPerHour: number; pairs: number; observedMinutes: number;
    }> = {};

    for (const [bookId, updates] of grouped) {
      const pace = observedPace(updates);
      if (!pace) continue;
      const first = updates[0];
      perBook[bookId] = {
        title: first.title,
        author: first.author,
        density: first.density,
        ...pace,
      };
    }

    const measured = Object.values(perBook).map(b => ({
      density: (b.density || null) as any,
      pagesPerHour: b.pagesPerHour,
    }));
    const tiers = tierStats(measured);

    // Untagged books that already have a rate — tagging these is the only way
    // to improve the tier estimates, so surface them explicitly.
    const needsTag = Object.entries(perBook)
      .filter(([, b]) => !b.density)
      .map(([id, b]) => ({ id, title: b.title, author: b.author, pagesPerHour: b.pagesPerHour, pairs: b.pairs }))
      .sort((a, b) => b.pairs - a.pairs);

    return NextResponse.json({
      perBook,
      tiers,
      needsTag,
      meta: {
        booksMeasured: Object.keys(perBook).length,
        tiersCalibrated: Object.keys(tiers).length,
        minBooksPerTier: MIN_BOOKS_FOR_TIER,
      },
    });
  } catch (error) {
    console.error('GET /api/reading-pace error:', error);
    return NextResponse.json({ error: 'Failed to compute reading pace' }, { status: 500 });
  }
}
