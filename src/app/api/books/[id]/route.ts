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
      reading_mode,
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

    // Reject a current_page past the end of the book. Three rows in the
    // library already carry one (The Problem of Pain at page 560 of 98), which
    // breaks every pages-left calculation and had to be special-cased in
    // /api/next. Validating on write is what stops the fourth.
    if (current_page !== undefined && current_page !== null) {
      const existing = db.prepare(
        'SELECT COALESCE(reading_pages, pages) AS total FROM books WHERE id = ?'
      ).get(id) as { total: number | null } | undefined;
      // A pages value in this same request wins — the caller may be correcting
      // both at once.
      const total = (reading_pages ?? pages ?? existing?.total) || null;
      if (typeof current_page !== 'number' || current_page < 0) {
        return NextResponse.json({ error: 'current_page must be a non-negative number' }, { status: 400 });
      }
      if (total && current_page > total) {
        return NextResponse.json(
          { error: `current_page ${current_page} is past the end of this book (${total} pages)` },
          { status: 400 }
        );
      }
    }

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
      // If the user is changing the cover URL, invalidate the cached blob so
      // the next /api/covers/[id] read lazy-fetches the new image. We do this
      // only on an actual change so unrelated autosaves don't blow away the cache.
      const existing = db
        .prepare('SELECT cover_url FROM books WHERE id = ?')
        .get(id) as { cover_url: string | null } | undefined;
      const normalize = (v: string | null | undefined) => (v ?? '').trim();
      if (existing && normalize(existing.cover_url) !== normalize(cover_url)) {
        updates.push('cover_blob = ?');
        values.push(null);
        updates.push('cover_content_type = ?');
        values.push(null);
      }
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
    // Without this branch the reading-mode toggle would 200 and change nothing.
    if (reading_mode !== undefined) {
      if (reading_mode !== 'linear' && reading_mode !== 'range') {
        return NextResponse.json({ error: "reading_mode must be 'linear' or 'range'" }, { status: 400 });
      }
      updates.push('reading_mode = ?');
      values.push(reading_mode);
    }
    if (rating !== undefined) {
      updates.push('rating = ?');
      values.push(rating);
    }
    if (density !== undefined) {
      updates.push('density = ?');
      values.push(density);
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
    if (item_type !== undefined) {
      updates.push('item_type = ?');
      values.push(item_type === 'article' ? 'article' : 'book');
    }
    if (doi !== undefined) {
      updates.push('doi = ?');
      values.push(doi);
    }
    if (journal !== undefined) {
      updates.push('journal = ?');
      values.push(journal);
    }
    if (publication_year !== undefined) {
      updates.push('publication_year = ?');
      values.push(publication_year);
    }
    if (url !== undefined) {
      updates.push('url = ?');
      values.push(url);
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

// Child tables that reference books(id). None of them declare ON DELETE CASCADE,
// so any row here blocks the delete at the SQLite level — which previously
// surfaced as an opaque 500. 263 of 968 books have at least one, so this was
// reachable in ordinary use.
const BOOK_CHILD_TABLES = [
  { table: 'reading_updates', label: 'reading log entries' },
  { table: 'learning_goal_books', label: 'learning goal memberships' },
  { table: 'reading_list', label: 'reading list entries' },
  { table: 'lending', label: 'lending records' },
] as const;

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const cascade = new URL(request.url).searchParams.get('cascade') === 'true';

    const book = db.prepare('SELECT id, title FROM books WHERE id = ?').get(id) as
      | { id: string; title: string }
      | undefined;
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Count what would be destroyed before destroying it.
    const related: Record<string, number> = {};
    let relatedTotal = 0;
    for (const { table } of BOOK_CHILD_TABLES) {
      const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE book_id = ?`).get(id) as { n: number };
      if (row.n > 0) {
        related[table] = row.n;
        relatedTotal += row.n;
      }
    }

    // Refuse by default and say exactly what is attached, so the caller can ask
    // the user rather than either failing opaquely or silently shredding data
    // they spent real effort curating.
    if (relatedTotal > 0 && !cascade) {
      const parts = BOOK_CHILD_TABLES.filter(({ table }) => related[table]).map(
        ({ table, label }) => `${related[table]} ${label}`
      );
      return NextResponse.json(
        {
          error: 'has_related_records',
          message: `"${book.title}" has ${parts.join(', ')}. Deleting it removes those too.`,
          related,
        },
        { status: 409 }
      );
    }

    const runDelete = db.transaction(() => {
      if (cascade) {
        for (const { table } of BOOK_CHILD_TABLES) {
          db.prepare(`DELETE FROM ${table} WHERE book_id = ?`).run(id);
        }
      }
      db.prepare('DELETE FROM books WHERE id = ?').run(id);
    });
    runDelete();

    return NextResponse.json({ success: true, deletedRelated: related });
  } catch (error) {
    console.error(`DELETE /api/books/[id] error:`, error);
    return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
  }
}
