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
      source_book_id, source_book_ids,
      // Article fields (item_type === 'article' uses these)
      item_type, doi, journal, url,
      // Accept old field names for backward compat
      description, source,
    } = body;

    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const now = new Date().toISOString();

    const actualAuthor = author || description || null;
    const actualRecommendedBy = recommended_by || source || null;
    const resolvedItemType = item_type === 'article' ? 'article' : 'book';

    // Accept an array from callers, but persist as JSON. Fall back to wrapping
    // the legacy single `source_book_id` if the array wasn't sent.
    const idsArray: string[] = Array.isArray(source_book_ids)
      ? source_book_ids.filter(Boolean)
      : source_book_id
      ? [source_book_id]
      : [];
    const idsJson = idsArray.length > 0 ? JSON.stringify(idsArray) : null;

    const stmt = db.prepare(`
      INSERT INTO recommendations (
        id, title, author, isbn, cover_url, recommended_by, notes, topic,
        interest, year, source_book_id, source_book_ids,
        item_type, doi, journal, url,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, title.trim(), actualAuthor, isbn || null, cover_url || null,
      actualRecommendedBy, notes || null, topic || null, interest || null, year || null,
      idsArray[0] || null, idsJson,
      resolvedItemType, doi || null, journal || null, url || null,
      now
    );

    const row = db.prepare('SELECT * FROM recommendations WHERE id = ?').get(id);
    return NextResponse.json(row);
  } catch (error) {
    console.error('POST /api/recommendations error:', error);
    return NextResponse.json({ error: 'Failed to create recommendation', details: String(error) }, { status: 500 });
  }
}
