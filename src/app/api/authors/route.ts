import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const AUTHOR_FIELDS = [
  'name',
  'ethnicity',
  'nationality',
  'religious_tradition',
  'gender',
  'image_url',
  'profile_url',
] as const;

type AuthorBody = Partial<Record<(typeof AUTHOR_FIELDS)[number], string | null>>;

export async function GET() {
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM authors ORDER BY name');
    const rows = stmt.all();
    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/authors error:', error);
    return NextResponse.json({ error: 'Failed to fetch authors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = (await request.json()) as AuthorBody;
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO authors (id, name, ethnicity, nationality, religious_tradition, gender, image_url, profile_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      name.trim(),
      body.ethnicity ?? null,
      body.nationality ?? null,
      body.religious_tradition ?? null,
      body.gender ?? null,
      body.image_url ?? null,
      body.profile_url ?? null,
      now,
      now,
    );

    const row = db.prepare('SELECT * FROM authors WHERE id = ?').get(id);
    return NextResponse.json(row);
  } catch (error) {
    console.error('POST /api/authors error:', error);
    return NextResponse.json({ error: 'Failed to create author' }, { status: 500 });
  }
}
