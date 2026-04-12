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
    const { book_id, borrower_name, lent_to, lent_date, due_date, return_date, returned_date, notes } = body;

    const updates: string[] = [];
    const values: any[] = [];

    if (book_id !== undefined) {
      updates.push('book_id = ?');
      values.push(book_id);
    }
    // Accept both old and new field names
    const actualBorrower = borrower_name ?? lent_to;
    if (actualBorrower !== undefined) {
      updates.push('borrower_name = ?');
      values.push(actualBorrower);
    }
    if (lent_date !== undefined) {
      updates.push('lent_date = ?');
      values.push(lent_date);
    }
    const actualDueDate = due_date ?? return_date;
    if (actualDueDate !== undefined) {
      updates.push('due_date = ?');
      values.push(actualDueDate);
    }
    if (returned_date !== undefined) {
      updates.push('returned_date = ?');
      values.push(returned_date);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

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
