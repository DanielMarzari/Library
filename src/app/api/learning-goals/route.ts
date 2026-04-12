import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

function ensureTable() {
  const db = getDb();
  try {
    // Check if table exists first
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='learning_goals'").get();
    if (!tableCheck) {
      db.exec(`
        CREATE TABLE learning_goals (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Created learning_goals table');
    }
  } catch (e) {
    console.error('ensureTable learning_goals error:', e);
  }
  return db;
}

export async function GET() {
  try {
    const db = ensureTable();
    const stmt = db.prepare('SELECT * FROM learning_goals ORDER BY name');
    const rows = stmt.all() as any[];
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('GET /api/learning-goals error:', error);
    return NextResponse.json({ error: 'Failed to fetch learning goals', details: error?.message || String(error) }, { status: 500 });
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
  } catch (error: any) {
    console.error('POST /api/learning-goals error:', error);
    return NextResponse.json({ error: 'Failed to create learning goal', details: error?.message || String(error) }, { status: 500 });
  }
}
