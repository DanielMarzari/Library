import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

function ensureCoverColumns() {
  const db = getDb();
  const cols = db.prepare("PRAGMA table_info(books)").all() as Array<{ name: string }>;
  const colNames = new Set(cols.map((c) => c.name));
  if (!colNames.has("cover_blob")) {
    db.exec("ALTER TABLE books ADD COLUMN cover_blob BLOB");
  }
  if (!colNames.has("cover_content_type")) {
    db.exec("ALTER TABLE books ADD COLUMN cover_content_type TEXT");
  }
  return db;
}

// POST: Fetch and store cover images for all books that have a cover_url but no cover_blob
export async function POST() {
  try {
    const db = ensureCoverColumns();

    const books = db
      .prepare(
        "SELECT id, cover_url FROM books WHERE cover_url IS NOT NULL AND cover_url != '' AND cover_blob IS NULL"
      )
      .all() as Array<{ id: string; cover_url: string }>;

    let cached = 0;
    let failed = 0;
    const errors: string[] = [];

    const updateStmt = db.prepare(
      "UPDATE books SET cover_blob = ?, cover_content_type = ? WHERE id = ?"
    );

    for (const book of books) {
      try {
        let url = book.cover_url.trim();
        // Upgrade http to https
        if (url.startsWith("http://")) {
          url = url.replace("http://", "https://");
        }

        const resp = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          },
          signal: AbortSignal.timeout(10000),
        });

        if (!resp.ok) {
          failed++;
          errors.push(`${book.id}: HTTP ${resp.status}`);
          continue;
        }

        const contentType =
          resp.headers.get("content-type") || "image/jpeg";
        const buffer = Buffer.from(await resp.arrayBuffer());

        // Only store if we got actual image data (> 1KB to skip error pages)
        if (buffer.length > 1024) {
          updateStmt.run(buffer, contentType, book.id);
          cached++;
        } else {
          failed++;
          errors.push(`${book.id}: too small (${buffer.length}b)`);
        }
      } catch (e: any) {
        failed++;
        errors.push(`${book.id}: ${e.message || "unknown error"}`);
      }

      // Small delay to be polite to image servers
      await new Promise((r) => setTimeout(r, 200));
    }

    return NextResponse.json({
      success: true,
      total: books.length,
      cached,
      failed,
      errors: errors.slice(0, 20), // Only return first 20 errors
    });
  } catch (error) {
    console.error("Cache covers error:", error);
    return NextResponse.json(
      { error: "Failed to cache covers", details: String(error) },
      { status: 500 }
    );
  }
}
