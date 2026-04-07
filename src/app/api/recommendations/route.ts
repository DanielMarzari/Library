import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM recommendations ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/recommendations error:', error);
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { title, description, source } = body;

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO recommendations (id, title, description, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, title, description || null, source || null, now, now);

    return NextResponse.json({
      id,
      title,
      description: description || null,
      source: source || null,
      created_at: now,
      updated_at: now,
    });
  } catch (error) {
    console.error('POST /api/recommendations error:', error);
    return NextResponse.json({ error: 'Failed to create recommendation' }, { status: 500 });
  }
}
