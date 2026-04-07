import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM recommendations WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error('GET /api/recommendations/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch recommendation' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = await request.json();
    const { title, description, source } = body;

    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (source !== undefined) {
      updates.push('source = ?');
      values.push(source);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const query = `UPDATE recommendations SET ${updates.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(query);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
    }

    const getStmt = db.prepare('SELECT * FROM recommendations WHERE id = ?');
    const row = getStmt.get(id) as any;
    return NextResponse.json(row);
  } catch (error) {
    console.error('PUT /api/recommendations/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update recommendation' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const stmt = db.prepare('DELETE FROM recommendations WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/recommendations/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete recommendation' }, { status: 500 });
  }
}
