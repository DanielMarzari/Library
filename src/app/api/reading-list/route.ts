import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const year = request.nextUrl.searchParams.get('year');

    let query = 'SELECT * FROM reading_list';
    let stmt;

    if (year) {
      query += ' WHERE year = ? ORDER BY created_at DESC';
      stmt = db.prepare(query);
      const rows = stmt.all(parseInt(year)) as any[];
      return NextResponse.json(rows);
    }

    stmt = db.prepare(query + ' ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/reading-list error:', error);
    return NextResponse.json({ error: 'Failed to fetch reading list' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { book_id, year } = body;

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO reading_list (id, book_id, year, created_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, book_id, year, now);

    return NextResponse.json({
      id,
      book_id,
      year,
      created_at: now,
    });
  } catch (error) {
    console.error('POST /api/reading-list error:', error);
    return NextResponse.json({ error: 'Failed to create reading list item' }, { status: 500 });
  }
}
