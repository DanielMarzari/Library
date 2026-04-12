import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

function ensureTable() {
  const db = getDb();
  try {
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='learning_goal_books'").get();
    if (!tableCheck) {
      db.exec(`
        CREATE TABLE learning_goal_books (
          id TEXT PRIMARY KEY,
          goal_id TEXT NOT NULL,
          book_id TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (goal_id) REFERENCES learning_goals(id) ON DELETE CASCADE,
          FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
        )
      `);
      console.log('Created learning_goal_books table');
    }
  } catch (e) {
    console.error('ensureTable learning_goal_books error:', e);
  }
  return db;
}

export async function GET(request: NextRequest) {
  try {
    const db = ensureTable();
    const goalId = request.nextUrl.searchParams.get('goal_id');

    let query = 'SELECT * FROM learning_goal_books';
    let stmt;

    if (goalId) {
      query += ' WHERE goal_id = ? ORDER BY created_at DESC';
      stmt = db.prepare(query);
      const rows = stmt.all(goalId) as any[];
      return NextResponse.json(rows);
    }

    stmt = db.prepare(query + ' ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/learning-goal-books error:', error);
    return NextResponse.json({ error: 'Failed to fetch learning goal books' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = ensureTable();
    const body = await request.json();
    const { goal_id, book_id } = body;

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO learning_goal_books (id, goal_id, book_id, created_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, goal_id, book_id, now);

    return NextResponse.json({
      id,
      goal_id,
      book_id,
      created_at: now,
    });
  } catch (error) {
    console.error('POST /api/learning-goal-books error:', error);
    return NextResponse.json({ error: 'Failed to create learning goal book' }, { status: 500 });
  }
}
