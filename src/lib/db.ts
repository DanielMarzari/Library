import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'library.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    ensureAllTables(db);
  }
  return db;
}

function ensureAllTables(db: Database.Database) {
  // Get existing tables
  const existing = new Set(
    (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>)
      .map(r => r.name)
  );

  // Books table should already exist from initial migration — skip if present
  // But ensure all other tables exist

  if (!existing.has('authors')) {
    db.exec(`
      CREATE TABLE authors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        bio TEXT,
        gender TEXT,
        ethnicity TEXT,
        religious_tradition TEXT,
        profile_url TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  if (!existing.has('recommendations')) {
    db.exec(`
      CREATE TABLE recommendations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT,
        isbn TEXT,
        cover_url TEXT,
        description TEXT,
        source TEXT,
        recommended_by TEXT,
        topic TEXT,
        notes TEXT,
        lowest_price REAL,
        thriftbooks_price REAL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  if (!existing.has('reading_list')) {
    db.exec(`
      CREATE TABLE reading_list (
        id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL,
        year INTEGER NOT NULL DEFAULT 2026,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      )
    `);
  }

  if (!existing.has('reading_goals')) {
    db.exec(`
      CREATE TABLE reading_goals (
        id TEXT PRIMARY KEY,
        year INTEGER NOT NULL,
        target_books INTEGER NOT NULL DEFAULT 12,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  if (!existing.has('reading_updates')) {
    db.exec(`
      CREATE TABLE reading_updates (
        id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL,
        pages_read INTEGER,
        current_page INTEGER,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      )
    `);
  }

  if (!existing.has('learning_goals')) {
    db.exec(`
      CREATE TABLE learning_goals (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  if (!existing.has('learning_goal_books')) {
    db.exec(`
      CREATE TABLE learning_goal_books (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL,
        book_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goal_id) REFERENCES learning_goals(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      )
    `);
  }

  if (!existing.has('lending')) {
    db.exec(`
      CREATE TABLE lending (
        id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL,
        lent_to TEXT NOT NULL,
        lent_date TEXT NOT NULL,
        return_date TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      )
    `);
  }

  // Ensure extra columns exist on tables that may have been created before these were added
  const addColumnSafe = (table: string, column: string, type: string) => {
    try {
      const cols = new Set(
        (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map(c => c.name)
      );
      if (!cols.has(column)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      }
    } catch { /* table might not exist yet, that's fine */ }
  };

  addColumnSafe('books', 'cover_blob', 'BLOB');
  addColumnSafe('books', 'cover_content_type', 'TEXT');
  addColumnSafe('recommendations', 'thriftbooks_price', 'REAL');
  addColumnSafe('authors', 'religious_tradition', 'TEXT');
  addColumnSafe('authors', 'profile_url', 'TEXT');
  addColumnSafe('authors', 'gender', 'TEXT');
  addColumnSafe('authors', 'ethnicity', 'TEXT');
}
