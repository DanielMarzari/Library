import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();

    const stmt = db.prepare('SELECT * FROM books WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const book = {
      ...row,
      topics: row.topics ? JSON.parse(row.topics) : [],
      auto_topics: row.auto_topics ? JSON.parse(row.auto_topics) : [],
      favorite: Boolean(row.favorite),
    };

    return NextResponse.json(book);
  } catch (error) {
    console.error(`GET /api/books/[id] error:`, error);
    return NextResponse.json({ error: 'Failed to fetch book' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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

    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (author !== undefined) {
      updates.push('author = ?');
      values.push(author);
    }
    if (isbn !== undefined) {
      updates.push('isbn = ?');
      values.push(isbn);
    }
    if (cover_url !== undefined) {
      updates.push('cover_url = ?');
      values.push(cover_url);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    if (rating !== undefined) {
      updates.push('rating = ?');
      values.push(rating);
    }
    if (volume !== undefined) {
      updates.push('volume = ?');
      values.push(volume);
    }
    if (pages !== undefined) {
      updates.push('pages = ?');
      values.push(pages);
    }
    if (intro_pages !== undefined) {
      updates.push('intro_pages = ?');
      values.push(intro_pages);
    }
    if (start_page !== undefined) {
      updates.push('start_page = ?');
      values.push(start_page);
    }
    if (end_page !== undefined) {
      updates.push('end_page = ?');
      values.push(end_page);
    }
    if (reading_pages !== undefined) {
      updates.push('reading_pages = ?');
      values.push(reading_pages);
    }
    if (current_page !== undefined) {
      updates.push('current_page = ?');
      values.push(current_page);
    }
    if (start_date !== undefined) {
      updates.push('start_date = ?');
      values.push(start_date);
    }
    if (complete_date !== undefined) {
      updates.push('complete_date = ?');
      values.push(complete_date);
    }
    if (source !== undefined) {
      updates.push('source = ?');
      values.push(source);
    }
    if (lcc !== undefined) {
      updates.push('lcc = ?');
      values.push(lcc);
    }
    if (ddc !== undefined) {
      updates.push('ddc = ?');
      values.push(ddc);
    }
    if (topics !== undefined) {
      updates.push('topics = ?');
      values.push(JSON.stringify(topics));
    }
    if (auto_topics !== undefined) {
      updates.push('auto_topics = ?');
      values.push(JSON.stringify(auto_topics));
    }
    if (favorite !== undefined) {
      updates.push('favorite = ?');
      values.push(favorite ? 1 : 0);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const query = `UPDATE books SET ${updates.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(query);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const getStmt = db.prepare('SELECT * FROM books WHERE id = ?');
    const row = getStmt.get(id) as any;

    const book = {
      ...row,
      topics: row.topics ? JSON.parse(row.topics) : [],
      auto_topics: row.auto_topics ? JSON.parse(row.auto_topics) : [],
      favorite: Boolean(row.favorite),
    };

    return NextResponse.json(book);
  } catch (error) {
    console.error(`PUT /api/books/[id] error:`, error);
    return NextResponse.json({ error: 'Failed to update book' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();

    const stmt = db.prepare('DELETE FROM books WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/books/[id] error:`, error);
    return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
  }
}
