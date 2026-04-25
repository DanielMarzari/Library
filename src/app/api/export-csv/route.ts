import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();

    // Get all books (excluding cover_blob which is binary)
    const books = db.prepare(`
      SELECT id, title, author, isbn, cover_url, description, status, rating,
        volume, pages, intro_pages, start_page, end_page, reading_pages,
        current_page, start_date, complete_date, source, lcc, ddc,
        topics, auto_topics, favorite, created_at, updated_at
      FROM books
      ORDER BY title
    `).all() as any[];

    if (books.length === 0) {
      return new NextResponse('No books found', { status: 404 });
    }

    // CSV columns
    const columns = [
      'id', 'title', 'author', 'isbn', 'status', 'rating',
      'volume', 'pages', 'intro_pages', 'start_page', 'end_page', 'reading_pages',
      'current_page', 'start_date', 'complete_date', 'source', 'lcc', 'ddc',
      'topics', 'auto_topics', 'favorite', 'cover_url', 'description',
      'created_at', 'updated_at',
    ];

    // Escape CSV value
    const esc = (val: any): string => {
      if (val === null || val === undefined) return '';
      const s = String(val);
      // If contains comma, quote, newline, or leading/trailing space, wrap in quotes
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r') || s !== s.trim()) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    // Build CSV
    const header = columns.join(',');
    const rows = books.map(book =>
      columns.map(col => esc(book[col])).join(',')
    );

    const csv = [header, ...rows].join('\n');

    const today = new Date().toISOString().split('T')[0];

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="library-books-${today}.csv"`,
      },
    });
  } catch (error) {
    console.error('GET /api/export-csv error:', error);
    return NextResponse.json({ error: 'Failed to export CSV', details: String(error) }, { status: 500 });
  }
}
