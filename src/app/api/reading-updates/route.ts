import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const bookId = request.nextUrl.searchParams.get('book_id');

    let query = 'SELECT * FROM reading_updates';
    let stmt;

    if (bookId) {
      query += ' WHERE book_id = ? ORDER BY created_at DESC';
      stmt = db.prepare(query);
      const rows = stmt.all(bookId) as any[];
      return NextResponse.json(rows);
    }

    stmt = db.prepare(query + ' ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/reading-updates error:', error);
    return NextResponse.json({ error: 'Failed to fetch reading updates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { book_id, pages_read, current_page, notes } = body;

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO reading_updates (id, book_id, pages_read, current_page, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, book_id, pages_read, current_page, notes || null, now);

    return NextResponse.json({
      id,
      book_id,
      pages_read,
      current_page,
      notes: notes || null,
      created_at: now,
    });
  } catch (error) {
    console.error('POST /api/reading-updates error:', error);
    return NextResponse.json({ error: 'Failed to create reading update' }, { status: 500 });
  }
}
