import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = await request.json();
    // Accept both target and target_books
    const { year, target, target_books } = body;

    const updates: string[] = [];
    const values: any[] = [];

    if (year !== undefined) {
      updates.push('year = ?');
      values.push(year);
    }
    const actualTarget = target ?? target_books;
    if (actualTarget !== undefined) {
      updates.push('target = ?');
      values.push(actualTarget);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);

    const query = `UPDATE reading_goals SET ${updates.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(query);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Reading goal not found' }, { status: 404 });
    }

    const getStmt = db.prepare('SELECT * FROM reading_goals WHERE id = ?');
    const row = getStmt.get(id) as any;
    return NextResponse.json(row);
  } catch (error) {
    console.error('PUT /api/reading-goals/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update reading goal' }, { status: 500 });
  }
}
