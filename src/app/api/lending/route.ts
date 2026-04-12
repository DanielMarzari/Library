import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM lending ORDER BY lent_date DESC');
    const rows = stmt.all() as any[];
    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/lending error:', error);
    return NextResponse.json({ error: 'Failed to fetch lending records', details: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { book_id, borrower_name, lent_to, lent_date, due_date, return_date, returned_date, notes } = body;

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // Accept both old field names (lent_to, return_date) and new ones (borrower_name, due_date)
    const actualBorrower = borrower_name || lent_to;
    const actualDueDate = due_date || return_date || null;
    const actualReturnedDate = returned_date || null;

    const stmt = db.prepare(`
      INSERT INTO lending (id, book_id, borrower_name, lent_date, due_date, returned_date, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, book_id, actualBorrower, lent_date, actualDueDate, actualReturnedDate, notes || null, now);

    return NextResponse.json({
      id,
      book_id,
      borrower_name: actualBorrower,
      lent_date,
      due_date: actualDueDate,
      returned_date: actualReturnedDate,
      notes: notes || null,
      created_at: now,
    });
  } catch (error) {
    console.error('POST /api/lending error:', error);
    return NextResponse.json({ error: 'Failed to create lending record', details: String(error) }, { status: 500 });
  }
}
