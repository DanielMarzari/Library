import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST() {
  try {
    const db = getDb();

    // Check and create missing tables/columns for SQLite
    const checks = [
      {
        table: "authors",
        columns: ["religious_tradition", "profile_url"],
        sql: `
          ALTER TABLE authors ADD COLUMN IF NOT EXISTS religious_tradition text;
          ALTER TABLE authors ADD COLUMN IF NOT EXISTS profile_url text;
        `,
      },
      {
        table: "recommendations",
        columns: ["thriftbooks_price"],
        sql: "ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS thriftbooks_price real;",
      },
      {
        table: "lending",
        columns: ["id"],
        sql: `
          CREATE TABLE IF NOT EXISTS lending (
            id TEXT PRIMARY KEY,
            book_id TEXT NOT NULL,
            lent_to TEXT NOT NULL,
            lent_date TEXT NOT NULL,
            return_date TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
          );
        `,
      },
      {
        table: "books",
        columns: ["cover_blob", "cover_content_type"],
        sql: `
          ALTER TABLE books ADD COLUMN cover_blob BLOB;
          ALTER TABLE books ADD COLUMN cover_content_type TEXT;
        `,
      },
    ];

    const missing: string[] = [];

    for (const check of checks) {
      try {
        // Try to query the table to see if columns exist
        const result = db
          .prepare(`PRAGMA table_info(${check.table})`)
          .all() as Array<{ name: string }>;
        const existingColumns = new Set(result.map((r) => r.name));
        const hasAllColumns = check.columns.every((col) => existingColumns.has(col));

        if (!hasAllColumns) {
          // Execute the migration SQL — each statement individually to handle partial migrations
          const statements = check.sql.split(";").filter((s) => s.trim());
          for (const stmt of statements) {
            if (stmt.trim()) {
              try {
                db.exec(stmt);
              } catch (stmtErr) {
                // Column might already exist from partial migration — continue
                console.warn(`Migration statement skipped: ${stmt}`, stmtErr);
              }
            }
          }
        }
      } catch (e) {
        // Table might not exist, try to create it
        const statements = check.sql.split(";").filter((s) => s.trim());
        for (const stmt of statements) {
          if (stmt.trim()) {
            try {
              db.exec(stmt);
            } catch (innerError) {
              console.error(`Failed to execute: ${stmt}`, innerError);
              missing.push(check.sql);
            }
          }
        }
      }
    }

    if (missing.length > 0) {
      return NextResponse.json({
        success: false,
        message: "Some migrations failed. Check logs for details.",
        failed: missing,
      });
    }

    return NextResponse.json({
      success: true,
      message: "All migrations completed successfully",
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { success: false, error: "Migration failed", details: String(error) },
      { status: 500 }
    );
  }
}
