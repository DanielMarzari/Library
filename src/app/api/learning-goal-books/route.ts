import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const goalId = request.nextUrl.searchParams.get('goal_id');

    let query = 'SELECT * FROM learning_goal_books';
    let stmt;

    if (goalId) {
      query += ' WHERE goal_id = ? ORDER BY added_at DESC';
      stmt = db.prepare(query);
      const rows = stmt.all(goalId) as any[];
      return NextResponse.json(rows);
    }

    stmt = db.prepare(query + ' ORDER BY added_at DESC');
    const rows = stmt.all() as any[];
    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/learning-goal-books error:', error);
    return NextResponse.json({ error: 'Failed to fetch learning goal books', details: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { goal_id, book_id, rec_id } = body;

    if (!goal_id) {
      return NextResponse.json({ error: 'goal_id is required' }, { status: 400 });
    }
    if (!book_id && !rec_id) {
      return NextResponse.json({ error: 'either book_id or rec_id is required' }, { status: 400 });
    }
    if (book_id && rec_id) {
      return NextResponse.json({ error: 'only one of book_id or rec_id may be set' }, { status: 400 });
    }

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO learning_goal_books (id, goal_id, book_id, rec_id, added_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, goal_id, book_id || null, rec_id || null, now);

    return NextResponse.json({
      id,
      goal_id,
      book_id: book_id || null,
      rec_id: rec_id || null,
      added_at: now,
    });
  } catch (error) {
    console.error('POST /api/learning-goal-books error:', error);
    return NextResponse.json({ error: 'Failed to create learning goal book', details: String(error) }, { status: 500 });
  }
}
