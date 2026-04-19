import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM recommendations ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/recommendations error:', error);
    return NextResponse.json({ error: 'Failed to fetch recommendations', details: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const {
      title, author, isbn, cover_url,
      recommended_by, notes, topic, interest, year,
      source_book_id,
      // Accept old field names for backward compat
      description, source,
    } = body;

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // Map old field names: description was used for author, source for recommended_by
    const actualAuthor = author || description || null;
    const actualRecommendedBy = recommended_by || source || null;

    const stmt = db.prepare(`
      INSERT INTO recommendations (id, title, author, isbn, cover_url, recommended_by, notes, topic, interest, year, source_book_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, title, actualAuthor, isbn || null, cover_url || null,
      actualRecommendedBy, notes || null, topic || null, interest || null, year || null,
      source_book_id || null, now
    );

    return NextResponse.json({
      id, title, author: actualAuthor, isbn: isbn || null, cover_url: cover_url || null,
      recommended_by: actualRecommendedBy, notes: notes || null, topic: topic || null,
      interest: interest || null, year: year || null, source_book_id: source_book_id || null,
      created_at: now,
    });
  } catch (error) {
    console.error('POST /api/recommendations error:', error);
    return NextResponse.json({ error: 'Failed to create recommendation', details: String(error) }, { status: 500 });
  }
}
