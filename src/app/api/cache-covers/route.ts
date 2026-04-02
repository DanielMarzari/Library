import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STORAGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/covers`;

export async function POST() {
  try {
    // Get all books that have a cover_url but haven't been cached yet
    const { data: books, error } = await supabase
      .from("books")
      .select("id, title, cover_url, original_cover_url")
      .not("cover_url", "is", null)
      .is("original_cover_url", null);

    if (error) throw error;
    if (!books || books.length === 0) {
      return NextResponse.json({ message: "No covers to cache", cached: 0 });
    }

    let cached = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const book of books) {
      // Skip if cover_url is already a Supabase storage URL
      if (book.cover_url?.includes("supabase.co/storage")) {
        continue;
      }

      try {
        // Fetch the image
        const response = await fetch(book.cover_url, {
          signal: AbortSignal.timeout(10000),
          headers: { "User-Agent": "LibraryApp/1.0" }
        });

        if (!response.ok) {
          errors.push(`${book.title}: HTTP ${response.status}`);
          failed++;
          continue;
        }

        const contentType = response.headers.get("content-type") || "image/jpeg";
        const blob = await response.arrayBuffer();
        const buffer = new Uint8Array(blob);

        // Determine file extension
        const ext = contentType.includes("png") ? "png" :
                    contentType.includes("webp") ? "webp" : "jpg";

        const fileName = `${book.id}.${ext}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("covers")
          .upload(fileName, buffer, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          errors.push(`${book.title}: ${uploadError.message}`);
          failed++;
          continue;
        }

        // Update book record: save original URL as backup, point cover_url to storage
        const storageUrl = `${STORAGE_URL}/${fileName}`;
        const { error: updateError } = await supabase
          .from("books")
          .update({
            original_cover_url: book.cover_url,
            cover_url: storageUrl,
          })
          .eq("id", book.id);

        if (updateError) {
          errors.push(`${book.title}: DB update failed`);
          failed++;
        } else {
          cached++;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`${book.title}: ${msg}`);
        failed++;
      }
    }

    return NextResponse.json({
      message: `Cached ${cached} covers, ${failed} failed`,
      cached,
      failed,
      total: books.length,
      errors: errors.slice(0, 20),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
