-- Authoritative schema dump of the production database.
--
-- Generated with:  sqlite3 library.db .schema > schema.sql
--
-- This file is a REFERENCE, not the migration path — src/lib/db.ts is what
-- actually creates and migrates tables at runtime (see ensureAllTables and
-- addColumnSafe). Keep this in sync after schema changes so the shape of
-- production is reviewable in git and so the database can be rebuilt from
-- scratch if it is ever lost.
--
-- Column order reflects migration history: columns appended by addColumnSafe
-- land at the end of each table.

CREATE TABLE authors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ethnicity TEXT,
    nationality TEXT,
    created_at TEXT,
    updated_at TEXT,
    image_url TEXT,
    religious_tradition TEXT,
    profile_url TEXT,
    gender TEXT
, country TEXT, birth_year INTEGER, death_year INTEGER, discipline TEXT, era TEXT, denomination TEXT, school TEXT);
CREATE TABLE books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT,
    cover_url TEXT,
    description TEXT,
    status TEXT NOT NULL,
    rating INTEGER,
    created_at TEXT,
    updated_at TEXT,
    pages INTEGER,
    start_date TEXT,
    complete_date TEXT,
    source TEXT,
    lcc TEXT,
    ddc TEXT,
    topics TEXT,
    intro_pages INTEGER,
    start_page INTEGER,
    end_page INTEGER,
    reading_pages INTEGER,
    volume TEXT,
    current_page INTEGER,
    auto_topics TEXT,
    favorite INTEGER DEFAULT 0,
    original_cover_url TEXT
, cover_blob BLOB, cover_content_type TEXT, item_type TEXT NOT NULL DEFAULT 'book', doi TEXT, journal TEXT, publication_year INTEGER, url TEXT, density TEXT);
CREATE TABLE learning_goals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    created_at TEXT
, updated_at TEXT);
CREATE TABLE learning_goal_books (
    id TEXT PRIMARY KEY,
    goal_id TEXT REFERENCES learning_goals(id),
    book_id TEXT REFERENCES books(id),
    priority INTEGER,
    added_at TEXT
, rec_id TEXT);
CREATE TABLE lending (
    id TEXT PRIMARY KEY,
    book_id TEXT REFERENCES books(id),
    borrower_name TEXT NOT NULL,
    lent_date TEXT NOT NULL,
    due_date TEXT,
    returned_date TEXT,
    notes TEXT,
    created_at TEXT
);
CREATE TABLE reading_goals (
    id TEXT PRIMARY KEY,
    year INTEGER NOT NULL,
    target INTEGER NOT NULL,
    created_at TEXT
);
CREATE TABLE reading_list (
    id TEXT PRIMARY KEY,
    book_id TEXT REFERENCES books(id),
    year INTEGER NOT NULL,
    priority INTEGER,
    added_at TEXT
);
CREATE TABLE reading_updates (
    id TEXT PRIMARY KEY,
    book_id TEXT REFERENCES books(id),
    pages_read INTEGER NOT NULL,
    current_page INTEGER NOT NULL,
    notes TEXT,
    created_at TEXT
);
CREATE TABLE recommendations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    isbn TEXT,
    cover_url TEXT,
    recommended_by TEXT,
    notes TEXT,
    created_at TEXT,
    topic TEXT,
    interest TEXT,
    year INTEGER,
    lowest_price REAL
, thriftbooks_price REAL, source_book_id TEXT, item_type TEXT NOT NULL DEFAULT 'book', doi TEXT, journal TEXT, url TEXT, source_book_ids TEXT, amazon_price REAL, starred INTEGER DEFAULT 0);
CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_books_author ON books(author);
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_learning_goal_books_goal ON learning_goal_books(goal_id);
CREATE INDEX idx_learning_goal_books_book ON learning_goal_books(book_id);
CREATE INDEX idx_recommendations_topic ON recommendations(topic);
CREATE INDEX idx_recommendations_author ON recommendations(author);
