import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM learning_goal_books WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return NextResponse.json({ error: 'Learning goal book not found' }, { status: 404 });
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error('GET /api/learning-goal-books/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch learning goal book' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = await request.json();
    const { goal_id, book_id } = body;

    const updates: string[] = [];
    const values: any[] = [];

    if (goal_id !== undefined) {
      updates.push('goal_id = ?');
      values.push(goal_id);
    }
    if (book_id !== undefined) {
      updates.push('book_id = ?');
      values.push(book_id);
    }

    values.push(id);

    const query = `UPDATE learning_goal_books SET ${updates.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(query);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Learning goal book not found' }, { status: 404 });
    }

    const getStmt = db.prepare('SELECT * FROM learning_goal_books WHERE id = ?');
    const row = getStmt.get(id) as any;
    return NextResponse.json(row);
  } catch (error) {
    console.error('PUT /api/learning-goal-books/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update learning goal book' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const stmt = db.prepare('DELETE FROM learning_goal_books WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Learning goal book not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/learning-goal-books/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete learning goal book' }, { status: 500 });
  }
}
