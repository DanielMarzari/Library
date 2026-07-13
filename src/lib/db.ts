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

  if (!existing.has('authors')) {
    db.exec(`
      CREATE TABLE authors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        ethnicity TEXT,
        nationality TEXT,
        image_url TEXT,
        religious_tradition TEXT,
        profile_url TEXT,
        gender TEXT,
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
        recommended_by TEXT,
        notes TEXT,
        topic TEXT,
        interest TEXT,
        year INTEGER,
        lowest_price REAL,
        thriftbooks_price REAL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  if (!existing.has('reading_list')) {
    db.exec(`
      CREATE TABLE reading_list (
        id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL,
        year INTEGER NOT NULL DEFAULT 2026,
        priority INTEGER DEFAULT 0,
        added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      )
    `);
  }

  if (!existing.has('reading_goals')) {
    db.exec(`
      CREATE TABLE reading_goals (
        id TEXT PRIMARY KEY,
        year INTEGER NOT NULL,
        target INTEGER NOT NULL DEFAULT 12,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
        color TEXT,
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
        priority INTEGER DEFAULT 0,
        added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
        borrower_name TEXT NOT NULL,
        lent_date TEXT NOT NULL,
        due_date TEXT,
        returned_date TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

  addColumnSafe('recommendations', 'source_book_id', 'TEXT');
  addColumnSafe('books', 'cover_blob', 'BLOB');
  addColumnSafe('books', 'cover_content_type', 'TEXT');
  addColumnSafe('recommendations', 'thriftbooks_price', 'REAL');
  addColumnSafe('authors', 'religious_tradition', 'TEXT');
  addColumnSafe('authors', 'profile_url', 'TEXT');
  addColumnSafe('authors', 'gender', 'TEXT');
  addColumnSafe('authors', 'ethnicity', 'TEXT');

  // Article support — items in `books` can be either a book or an article.
  addColumnSafe('books', 'item_type', "TEXT NOT NULL DEFAULT 'book'");
  addColumnSafe('books', 'doi', 'TEXT');
  addColumnSafe('books', 'journal', 'TEXT');
  addColumnSafe('books', 'publication_year', 'INTEGER');
  addColumnSafe('books', 'url', 'TEXT');

  // Article support on recommendations — same shape as books so they map 1:1
  // when promoting a rec → library.
  addColumnSafe('recommendations', 'item_type', "TEXT NOT NULL DEFAULT 'book'");
  addColumnSafe('recommendations', 'doi', 'TEXT');
  addColumnSafe('recommendations', 'journal', 'TEXT');
  addColumnSafe('recommendations', 'url', 'TEXT');

  // SQLite forbids NOT NULL + non-constant DEFAULT on ADD COLUMN, so keep this
  // nullable on the migration. App code always supplies a value on insert.
  addColumnSafe('learning_goals', 'updated_at', "TEXT");

  // Density / technicality tier — nullable. Values: easy | moderate | hard | technical | dense
  addColumnSafe('books', 'density', 'TEXT');

  // Multiple source books per recommendation — JSON-encoded array of book IDs.
  // Legacy `source_book_id` (single) is preserved for backward compat and
  // treated as `[source_book_id]` at read time.
  addColumnSafe('recommendations', 'source_book_ids', 'TEXT');

  // Backfill: books marked read but missing complete_date get one derived from
  // updated_at (the most recent write to the row). This is only a proxy for the
  // real "marked read" moment — the DB doesn't log status transitions — but it
  // is the least-wrong choice available. Idempotent: once every read row has a
  // date, this UPDATE hits nothing on subsequent boots.
  try {
    db.exec(`
      UPDATE books
      SET complete_date = substr(updated_at, 1, 10)
      WHERE status = 'read'
        AND (complete_date IS NULL OR complete_date = '')
        AND updated_at IS NOT NULL
    `);
  } catch (e) {
    console.error('complete_date backfill skipped:', e);
  }
}
