import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { readableRange } from '@/lib/coverage';

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
    const { book_id, pages_read, current_page, notes, range_start } = body;

    // A range log must match the book's mode, in both directions: a span on a
    // linear book would corrupt its position, and a bare page on a range book
    // would silently record a zero-length span.
    const book = db.prepare(
      `SELECT COALESCE(reading_mode,'linear') AS mode,
              start_page, end_page, reading_pages, pages
       FROM books WHERE id = ?`
    ).get(book_id) as
      | { mode: string; start_page: number | null; end_page: number | null; reading_pages: number | null; pages: number | null }
      | undefined;

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const isRange = book.mode === 'range';
    if (isRange && (range_start == null)) {
      return NextResponse.json(
        { error: 'This book is logged by page range — range_start is required' },
        { status: 400 }
      );
    }
    if (!isRange && range_start != null) {
      return NextResponse.json(
        { error: 'This book is read in order — log a current page, not a range' },
        { status: 400 }
      );
    }
    if (isRange) {
      if (typeof range_start !== 'number' || range_start < 1) {
        return NextResponse.json({ error: 'range_start must be a page number' }, { status: 400 });
      }
      if (typeof current_page !== 'number' || current_page < range_start) {
        return NextResponse.json(
          { error: 'The end of the range must not come before its start' },
          { status: 400 }
        );
      }
      // Same definition the coverage bar uses, so a page the API accepts is
      // always a page the bar can draw.
      const lastPage = readableRange(book).hi;
      if (lastPage != null && current_page > lastPage) {
        return NextResponse.json(
          { error: `Page ${current_page} is past the end of this book (${lastPage})` },
          { status: 400 }
        );
      }
    }

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO reading_updates (id, book_id, pages_read, current_page, range_start, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, book_id, pages_read, current_page, isRange ? range_start : null, notes || null, now);

    return NextResponse.json({
      id,
      book_id,
      pages_read,
      current_page,
      range_start: isRange ? range_start : null,
      notes: notes || null,
      created_at: now,
    });
  } catch (error) {
    console.error('POST /api/reading-updates error:', error);
    return NextResponse.json({ error: 'Failed to create reading update' }, { status: 500 });
  }
}
