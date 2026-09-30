import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { scoreAll, type LibBook, type RecInput, type GoalInfo } from '@/lib/recScore';

/**
 * Recompute every recommendation's score from the current library.
 *
 * An endpoint rather than a script because nothing here touches the network:
 * it's a read of three tables and some arithmetic, so it can run on demand from
 * the shelf itself. That matters — the score is only as good as its last run,
 * and the library changes every time a book is finished, rated or set down.
 */
export async function POST() {
  try {
    const db = getDb();

    const books = (db.prepare(`
      SELECT id, title, author, status, rating, favorite, topics, auto_topics
      FROM books
    `).all() as Array<Record<string, unknown>>).map((r): LibBook => {
      const parse = (v: unknown) => {
        if (typeof v !== 'string' || !v) return [] as string[];
        try { const a = JSON.parse(v); return Array.isArray(a) ? a.map(String) : []; } catch { return []; }
      };
      return {
        id: String(r.id),
        title: String(r.title || ''),
        author: (r.author as string) ?? null,
        status: (r.status as string) ?? null,
        rating: (r.rating as number) ?? null,
        favorite: (r.favorite as number) ?? null,
        // Hand-entered and auto tags both describe the book; either can carry
        // the signal, so they're pooled.
        topics: [...parse(r.topics), ...parse(r.auto_topics)],
      };
    });

    const goalRows = db.prepare(`
      SELECT g.id, g.name,
             (SELECT COUNT(*) FROM learning_goal_books lb WHERE lb.goal_id = g.id AND lb.book_id IS NOT NULL) AS book_count
      FROM learning_goals g
    `).all() as Array<{ id: string; name: string; book_count: number }>;
    const goals: GoalInfo[] = goalRows.map(g => ({ id: g.id, name: g.name, bookCount: g.book_count }));

    // Goal membership for recommendations, gathered once rather than per row.
    const links = db.prepare(`
      SELECT rec_id, goal_id FROM learning_goal_books WHERE rec_id IS NOT NULL
    `).all() as Array<{ rec_id: string; goal_id: string }>;
    const byRec = new Map<string, string[]>();
    for (const l of links) {
      const arr = byRec.get(l.rec_id) || [];
      arr.push(l.goal_id);
      byRec.set(l.rec_id, arr);
    }

    const recRows = db.prepare(`
      SELECT id, title, author, topic, starred
      FROM recommendations
      WHERE COALESCE(item_type,'book') = 'book'
    `).all() as Array<{ id: string; title: string; author: string | null; topic: string | null; starred: number | null }>;

    const recs: RecInput[] = recRows.map(r => ({
      id: r.id,
      title: r.title,
      author: r.author,
      topic: r.topic,
      starred: r.starred,
      goalIds: byRec.get(r.id) || [],
    }));

    const scored = scoreAll(recs, books, goals);
    const now = new Date().toISOString();

    const stmt = db.prepare(`UPDATE recommendations SET score = ?, score_reasons = ?, scored_at = ? WHERE id = ?`);
    const write = db.transaction((rows: typeof scored) => {
      for (const s of rows) stmt.run(s.score, JSON.stringify(s.signals), now, s.id);
    });
    write(scored);

    const values = scored.map(s => s.score).sort((a, b) => a - b);
    const at = (q: number) => values.length ? values[Math.min(values.length - 1, Math.floor(values.length * q))] : 0;

    return NextResponse.json({
      scored: scored.length,
      scoredAt: now,
      booksConsidered: books.length,
      goalsConsidered: goals.length,
      // A quick shape check: if these collapse together the score has stopped
      // discriminating and is not worth sorting by.
      distribution: { min: at(0), p25: at(0.25), median: at(0.5), p75: at(0.75), p90: at(0.9), max: values[values.length - 1] ?? 0 },
    });
  } catch (error) {
    console.error('POST /api/recommendations/score error:', error);
    return NextResponse.json({ error: 'Failed to score recommendations', details: String(error) }, { status: 500 });
  }
}
