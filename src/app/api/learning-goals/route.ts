import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

function ensureTable() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  return db;
}

export async function GET() {
  try {
    const db = ensureTable();
    const stmt = db.prepare('SELECT * FROM learning_goals ORDER BY name');
    const rows = stmt.all() as any[];
    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/learning-goals error:', error);
    return NextResponse.json({ error: 'Failed to fetch learning goals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = ensureTable();
    const body = await request.json();
    const { name, description } = body;

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO learning_goals (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, name, description || null, now, now);

    return NextResponse.json({
      id,
      name,
      description: description || null,
      created_at: now,
      updated_at: now,
    });
  } catch (error) {
    console.error('POST /api/learning-goals error:', error);
    return NextResponse.json({ error: 'Failed to create learning goal' }, { status: 500 });
  }
}
