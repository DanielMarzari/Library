import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const UPDATABLE_FIELDS = [
  'name',
  'ethnicity',
  'nationality',
  'religious_tradition',
  'gender',
  'image_url',
  'profile_url',
] as const;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const row = db.prepare('SELECT * FROM authors WHERE id = ?').get(id);

    if (!row) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 });
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error('GET /api/authors/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch author' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = (await request.json()) as Record<string, string | null | undefined>;

    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: Array<string | null> = [];

    for (const field of UPDATABLE_FIELDS) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field] ?? null);
      }
    }

    if (updates.length === 0) {
      const row = db.prepare('SELECT * FROM authors WHERE id = ?').get(id);
      if (!row) return NextResponse.json({ error: 'Author not found' }, { status: 404 });
      return NextResponse.json(row);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`UPDATE authors SET ${updates.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 });
    }

    const row = db.prepare('SELECT * FROM authors WHERE id = ?').get(id);
    return NextResponse.json(row);
  } catch (error) {
    console.error('PUT /api/authors/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update author' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const result = db.prepare('DELETE FROM authors WHERE id = ?').run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/authors/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete author' }, { status: 500 });
  }
}
