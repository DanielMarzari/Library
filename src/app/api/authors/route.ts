import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM authors ORDER BY name');
    const rows = stmt.all() as any[];
    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/authors error:', error);
    return NextResponse.json({ error: 'Failed to fetch authors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { name, bio } = body;

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO authors (id, name, bio, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, name, bio || null, now, now);

    return NextResponse.json({
      id,
      name,
      bio: bio || null,
      created_at: now,
      updated_at: now,
    });
  } catch (error) {
    console.error('POST /api/authors error:', error);
    return NextResponse.json({ error: 'Failed to create author' }, { status: 500 });
  }
}
