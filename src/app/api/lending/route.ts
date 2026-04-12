import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM lending ORDER BY lent_date DESC');
    const rows = stmt.all() as any[];
    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/lending error:', error);
    return NextResponse.json({ error: 'Failed to fetch lending records' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { book_id, lent_to, lent_date, return_date } = body;

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO lending (id, book_id, lent_to, lent_date, return_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, book_id, lent_to, lent_date, return_date || null, now, now);

    return NextResponse.json({
      id,
      book_id,
      lent_to,
      lent_date,
      return_date: return_date || null,
      created_at: now,
      updated_at: now,
    });
  } catch (error) {
    console.error('POST /api/lending error:', error);
    return NextResponse.json({ error: 'Failed to create lending record' }, { status: 500 });
  }
}
