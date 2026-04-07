import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM reading_goals ORDER BY year DESC');
    const rows = stmt.all() as any[];
    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/reading-goals error:', error);
    return NextResponse.json({ error: 'Failed to fetch reading goals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { year, target_books } = body;

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO reading_goals (id, year, target_books, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, year, target_books, now, now);

    return NextResponse.json({
      id,
      year,
      target_books,
      created_at: now,
      updated_at: now,
    });
  } catch (error) {
    console.error('POST /api/reading-goals error:', error);
    return NextResponse.json({ error: 'Failed to create reading goal' }, { status: 500 });
  }
}
