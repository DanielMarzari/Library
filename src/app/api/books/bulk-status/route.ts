import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

/**
 * Change status on many books at once, atomically, returning what each was
 * before so the caller can offer an undo.
 *
 * This exists for the "never really started" sweep, which reclassifies ~44
 * books in one action. Looping per-book PUTs would leave a half-applied sweep
 * if one failed partway, with no record of the original state to restore.
 */
const ALLOWED = new Set(['not_read', 'reading', 'paused', 'read']);

export async function PATCH(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const updates = body?.updates;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'updates must be a non-empty array' }, { status: 400 });
    }
    if (updates.length > 500) {
      return NextResponse.json({ error: 'too many updates in one request' }, { status: 400 });
    }
    for (const u of updates) {
      if (!u?.id || !ALLOWED.has(u?.status)) {
        return NextResponse.json(
          { error: `each update needs an id and a status in ${[...ALLOWED].join('/')}` },
          { status: 400 }
        );
      }
    }

    const getOne = db.prepare('SELECT id, status FROM books WHERE id = ?');
    const setOne = db.prepare('UPDATE books SET status = ?, updated_at = ? WHERE id = ?');
    const now = new Date().toISOString();

    const previous: Array<{ id: string; status: string }> = [];
    let changed = 0;

    const run = db.transaction(() => {
      for (const u of updates) {
        const row = getOne.get(u.id) as { id: string; status: string } | undefined;
        if (!row) continue;
        previous.push({ id: row.id, status: row.status });
        if (row.status !== u.status) {
          setOne.run(u.status, now, u.id);
          changed++;
        }
      }
    });
    run();

    return NextResponse.json({ changed, previous });
  } catch (error) {
    console.error('PATCH /api/books/bulk-status error:', error);
    return NextResponse.json({ error: 'Failed to update statuses' }, { status: 500 });
  }
}
