import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM reading_goals ORDER BY year DESC');
    const rows = stmt.all() as any[];
    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/reading-goals error:', error);
    return NextResponse.json({ error: 'Failed to fetch reading goals', details: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    // Accept both target and target_books
    const { year, target, target_books } = body;
    const actualTarget = target ?? target_books ?? 12;

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO reading_goals (id, year, target, created_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, year, actualTarget, now);

    return NextResponse.json({
      id,
      year,
      target: actualTarget,
      created_at: now,
    });
  } catch (error) {
    console.error('POST /api/reading-goals error:', error);
    return NextResponse.json({ error: 'Failed to create reading goal', details: String(error) }, { status: 500 });
  }
}
