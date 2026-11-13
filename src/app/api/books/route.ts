import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { canonicalizeTopics } from '@/lib/topics';
import { readableRange, coverageOf, type Span } from '@/lib/coverage';
import { topicVocabulary } from '@/lib/topicVocabulary';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const favorites = searchParams.get('favorites') === 'true';
    const sort = searchParams.get('sort') || 'created_at DESC';

    // Exclude cover_blob from list queries — it can be huge
    // We include has_cover_blob flag via CASE instead
    //
    // last_read_at is the most recent reading_updates timestamp for the book,
    // which is NOT the same as updated_at (that moves on any edit — a rating, a
    // topic tag). Distinguishing "actively being read" from "marked reading
    // months ago and untouched since" needs the former.
    let query = `SELECT id, title, author, isbn, cover_url, description, status, reading_mode, rating, density,
      volume, pages, intro_pages, start_page, end_page, reading_pages,
      current_page, start_date, complete_date, source, lcc, ddc,
      topics, auto_topics, favorite, created_at, updated_at,
      item_type, doi, journal, publication_year, url,
      CASE WHEN cover_blob IS NOT NULL AND length(cover_blob) > 0 THEN 1 ELSE 0 END as has_cover_blob,
      (SELECT MAX(created_at) FROM reading_updates WHERE reading_updates.book_id = books.id) AS last_read_at
      FROM books WHERE 1=1`;
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
      // topics/auto_topics are JSON text (e.g. ["philosophy","history"]) so a
      // LIKE on the raw JSON is a cheap substring match against tag names.
      query += ' AND (title LIKE ? OR author LIKE ? OR topics LIKE ? OR auto_topics LIKE ?)';
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // `sort` is interpolated, not bound — SQLite can't parameterize ORDER BY.
    // Allowlist it rather than trusting the caller: this is the one place in
    // the route where a query string reaches the SQL text directly.
    const SORTS: Record<string, string> = {
      'created_at DESC': 'created_at DESC',
      'created_at ASC': 'created_at ASC',
      'updated_at DESC': 'updated_at DESC',
      'title ASC': 'title ASC',
      'author ASC': 'author ASC',
      'rating DESC': 'rating DESC',
      'pages ASC': 'pages ASC',
      'pages DESC': 'pages DESC',
      'last_read_at DESC': 'last_read_at DESC',
    };
    query += ` ORDER BY ${SORTS[sort] ?? 'created_at DESC'}`;

    const stmt = db.prepare(query);
    const rows = stmt.all(...params) as any[];

    // Pages still to read, computed here so there is ONE definition of it.
    //
    // It cannot be done in the client from current_page alone, because for a
    // book read out of order current_page holds the last span's high end, not
    // a position: log pages 200-210 of a devotional and current_page says 210
    // while 199 pages remain unread. Those books need the union of their
    // logged spans, which is what coverageOf gives.
    //
    // null means the length isn't known. That stays null rather than
    // becoming a guess -- a book with no page count sorts last, it doesn't
    // get invented a finish line.
    const spansByBook = new Map<string, Span[]>();
    const rangeIds = rows.filter(r => r.reading_mode === 'range').map(r => r.id as string);
    if (rangeIds.length) {
      const placeholders = rangeIds.map(() => '?').join(',');
      const logs = db.prepare(
        `SELECT book_id, range_start, current_page FROM reading_updates
         WHERE range_start IS NOT NULL AND book_id IN (${placeholders})`
      ).all(...rangeIds) as Array<{ book_id: string; range_start: number; current_page: number }>;
      for (const l of logs) {
        if (l.range_start == null || l.current_page == null) continue;
        const arr = spansByBook.get(l.book_id) ?? [];
        arr.push({ start: l.range_start, end: l.current_page });
        spansByBook.set(l.book_id, arr);
      }
    }

    type RemainingRow = {
      id: string; status: string; reading_mode: string | null;
      current_page: number | null; start_page: number | null; end_page: number | null;
      reading_pages: number | null; pages: number | null;
    };
    const remainingFor = (row: RemainingRow): number | null => {
      const range = readableRange(row);
      if (range.hi == null) return null;
      const length = Math.max(0, range.hi - range.lo + 1);
      // A finished book has nothing left, whatever its last logged page says.
      if (row.status === 'read') return 0;
      if (row.reading_mode === 'range') {
        const { covered } = coverageOf(spansByBook.get(row.id) ?? [], range);
        return Math.max(0, length - covered);
      }
      const cur = row.current_page;
      if (cur == null || cur < range.lo) return length;
      return Math.max(0, range.hi - cur);
    };

    // Parse JSON fields
    const books = rows.map(row => ({
      ...row,
      has_cover_blob: Boolean(row.has_cover_blob),
      topics: row.topics ? JSON.parse(row.topics) : [],
      auto_topics: row.auto_topics ? JSON.parse(row.auto_topics) : [],
      favorite: Boolean(row.favorite),
      pages_remaining: remainingFor(row),
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
      density,
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
      item_type,
      doi,
      journal,
      publication_year,
      url,
    } = body;

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const now = new Date().toISOString();
    const resolvedItemType = item_type === 'article' ? 'article' : 'book';

    // Snap incoming tags onto the spellings the library already uses, so a
    // book saved with "early church" joins "Early Church" rather than forking
    // the subject. Done here, not in the browser, so it holds for every
    // caller -- the add sheet, the detail pane and the import scripts alike.
    const vocab = topicVocabulary();
    const canonTopics = canonicalizeTopics(Array.isArray(topics) ? topics : [], vocab);
    const canonAuto = canonicalizeTopics(Array.isArray(auto_topics) ? auto_topics : [], vocab);

    const stmt = db.prepare(`
      INSERT INTO books (
        id, title, author, isbn, cover_url, description, status, rating, density,
        volume, pages, intro_pages, start_page, end_page, reading_pages,
        current_page, start_date, complete_date, source, lcc, ddc,
        topics, auto_topics, favorite,
        item_type, doi, journal, publication_year, url,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      density || null,
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
      JSON.stringify(canonTopics),
      JSON.stringify(canonAuto),
      favorite ? 1 : 0,
      resolvedItemType,
      doi || null,
      journal || null,
      publication_year || null,
      url || null,
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
      density: density || null,
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
      // What was stored, not what was sent -- otherwise the caller holds the
      // pre-canonical spellings until the next reload.
      topics: canonTopics,
      auto_topics: canonAuto,
      favorite: Boolean(favorite),
      item_type: resolvedItemType,
      doi: doi || null,
      journal: journal || null,
      publication_year: publication_year || null,
      url: url || null,
      created_at: now,
      updated_at: now,
    });
  } catch (error) {
    console.error('POST /api/books error:', error);
    return NextResponse.json({ error: 'Failed to create book' }, { status: 500 });
  }
}
