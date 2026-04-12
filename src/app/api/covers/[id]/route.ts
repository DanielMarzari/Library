import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Serve a cached cover image from the DB blob
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const row = db
      .prepare("SELECT cover_blob, cover_content_type FROM books WHERE id = ?")
      .get(id) as { cover_blob: Buffer | null; cover_content_type: string | null } | undefined;

    if (!row?.cover_blob) {
      return NextResponse.json({ error: "No cached cover" }, { status: 404 });
    }

    return new NextResponse(row.cover_blob, {
      headers: {
        "Content-Type": row.cover_content_type || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("GET /api/covers/[id] error:", error);
    return NextResponse.json({ error: "Failed to serve cover" }, { status: 500 });
  }
}
