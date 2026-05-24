import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type CoverRow = {
  cover_blob: Buffer | null;
  cover_content_type: string | null;
  cover_url: string | null;
};

// Serve a cached cover image. If no blob exists yet but the book has a cover_url,
// fetch the image from the remote URL on the first request, persist it as a blob,
// and then serve it. Subsequent reads bypass the network entirely.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const row = db
      .prepare("SELECT cover_blob, cover_content_type, cover_url FROM books WHERE id = ?")
      .get(id) as CoverRow | undefined;

    if (!row) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    if (row.cover_blob && row.cover_blob.length > 0) {
      return new NextResponse(new Uint8Array(row.cover_blob), {
        headers: {
          "Content-Type": row.cover_content_type || "image/jpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // No blob — try a lazy fetch from cover_url.
    if (row.cover_url && row.cover_url.trim()) {
      let url = row.cover_url.trim();
      if (url.startsWith("http://")) url = url.replace("http://", "https://");

      try {
        const resp = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          },
          signal: AbortSignal.timeout(10000),
        });

        if (resp.ok) {
          const contentType = resp.headers.get("content-type") || "image/jpeg";
          const buffer = Buffer.from(await resp.arrayBuffer());

          if (buffer.length > 1024 && contentType.startsWith("image/")) {
            db.prepare(
              "UPDATE books SET cover_blob = ?, cover_content_type = ? WHERE id = ?"
            ).run(buffer, contentType, id);

            return new NextResponse(new Uint8Array(buffer), {
              headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
              },
            });
          }
        }
      } catch (err) {
        console.error(`Lazy cover fetch failed for ${id}:`, err);
      }
    }

    return NextResponse.json({ error: "No cover available" }, { status: 404 });
  } catch (error) {
    console.error("GET /api/covers/[id] error:", error);
    return NextResponse.json({ error: "Failed to serve cover" }, { status: 500 });
  }
}
