import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM reading_list WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return NextResponse.json({ error: 'Reading list item not found' }, { status: 404 });
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error('GET /api/reading-list/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch reading list item' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = await request.json();
    const { book_id, year } = body;

    const updates: string[] = [];
    const values: any[] = [];

    if (book_id !== undefined) {
      updates.push('book_id = ?');
      values.push(book_id);
    }
    if (year !== undefined) {
      updates.push('year = ?');
      values.push(year);
    }

    values.push(id);

    const query = `UPDATE reading_list SET ${updates.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(query);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Reading list item not found' }, { status: 404 });
    }

    const getStmt = db.prepare('SELECT * FROM reading_list WHERE id = ?');
    const row = getStmt.get(id) as any;
    return NextResponse.json(row);
  } catch (error) {
    console.error('PUT /api/reading-list/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update reading list item' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const stmt = db.prepare('DELETE FROM reading_list WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Reading list item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/reading-list/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete reading list item' }, { status: 500 });
  }
}
