import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const favorites = searchParams.get('favorites') === 'true';
    const sort = searchParams.get('sort') || 'created_at DESC';

    let query = 'SELECT * FROM books WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (favorites) {
      query += ' AND favorite = 1';
    }

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query += ' AND (title LIKE ? OR author LIKE ?)';
      params.push(searchTerm, searchTerm);
    }

    query += ` ORDER BY ${sort}`;

    const stmt = db.prepare(query);
    const rows = stmt.all(...params) as any[];

    // Parse JSON fields
    const books = rows.map(row => ({
      ...row,
      topics: row.topics ? JSON.parse(row.topics) : [],
      auto_topics: row.auto_topics ? JSON.parse(row.auto_topics) : [],
      favorite: Boolean(row.favorite),
    }));

    return NextResponse.json(books);
  } catch (error) {
    console.error('GET /api/books error:', error);
    return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();

    const {
      title,
      author,
      isbn,
      cover_url,
      description,
      status,
      rating,
      volume,
      pages,
      intro_pages,
      start_page,
      end_page,
      reading_pages,
      current_page,
      start_date,
      complete_date,
      source,
      lcc,
      ddc,
      topics,
      auto_topics,
      favorite,
    } = body;

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO books (
        id, title, author, isbn, cover_url, description, status, rating,
        volume, pages, intro_pages, start_page, end_page, reading_pages,
        current_page, start_date, complete_date, source, lcc, ddc,
        topics, auto_topics, favorite, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      title,
      author,
      isbn || null,
      cover_url || null,
      description || null,
      status || 'not_read',
      rating || null,
      volume || null,
      pages || null,
      intro_pages || null,
      start_page || null,
      end_page || null,
      reading_pages || null,
      current_page || null,
      start_date || null,
      complete_date || null,
      source || null,
      lcc || null,
      ddc || null,
      topics ? JSON.stringify(topics) : JSON.stringify([]),
      auto_topics ? JSON.stringify(auto_topics) : JSON.stringify([]),
      favorite ? 1 : 0,
      now,
      now
    );

    return NextResponse.json({
      id,
      title,
      author,
      isbn,
      cover_url,
      description,
      status: status || 'not_read',
      rating,
      volume,
      pages,
      intro_pages,
      start_page,
      end_page,
      reading_pages,
      current_page,
      start_date,
      complete_date,
      source,
      lcc,
      ddc,
      topics: topics || [],
      auto_topics: auto_topics || [],
      favorite: Boolean(favorite),
      created_at: now,
      updated_at: now,
    });
  } catch (error) {
    console.error('POST /api/books error:', error);
    return NextResponse.json({ error: 'Failed to create book' }, { status: 500 });
  }
}
