import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM lending WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return NextResponse.json({ error: 'Lending record not found' }, { status: 404 });
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error('GET /api/lending/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch lending record' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = await request.json();
    const { book_id, lent_to, lent_date, return_date } = body;

    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];

    if (book_id !== undefined) {
      updates.push('book_id = ?');
      values.push(book_id);
    }
    if (lent_to !== undefined) {
      updates.push('lent_to = ?');
      values.push(lent_to);
    }
    if (lent_date !== undefined) {
      updates.push('lent_date = ?');
      values.push(lent_date);
    }
    if (return_date !== undefined) {
      updates.push('return_date = ?');
      values.push(return_date);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const query = `UPDATE lending SET ${updates.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(query);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Lending record not found' }, { status: 404 });
    }

    const getStmt = db.prepare('SELECT * FROM lending WHERE id = ?');
    const row = getStmt.get(id) as any;
    return NextResponse.json(row);
  } catch (error) {
    console.error('PUT /api/lending/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update lending record' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const stmt = db.prepare('DELETE FROM lending WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Lending record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/lending/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete lending record' }, { status: 500 });
  }
}
