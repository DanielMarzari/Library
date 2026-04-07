import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { title, author, isbn } = await request.json();

    if (!title && !isbn) {
      return NextResponse.json(
        { error: "Title or ISBN required" },
        { status: 400 }
      );
    }

    // Prefer ISBN search (much more precise), fall back to title+author
    let url: string;
    if (isbn) {
      const cleanIsbn = isbn.replace(/[-\s]/g, "");
      url = `https://www.abebooks.com/servlet/SearchResults?isbn=${encodeURIComponent(cleanIsbn)}&sortby=17`;
    } else {
      // Strip subtitles (after colon) and parenthetical series info for cleaner search
      let shortTitle = title
        .replace(/\s*[:]\s*.*/g, "")       // remove everything after first colon
        .replace(/\s*\(.*?\)\s*/g, "")     // remove parenthetical text
        .trim();
      // If that left us with nothing, use first 5 words of original
      if (!shortTitle || shortTitle.length < 3) {
        shortTitle = title.split(/\s+/).slice(0, 5).join(" ");
      }
      // Also limit to first 6 words max
      shortTitle = shortTitle.split(/\s+/).slice(0, 6).join(" ");
      const query = encodeURIComponent(
        shortTitle + (author ? " " + author : "")
      );
      url = `https://www.abebooks.com/servlet/SearchResults?kn=${query}&sortby=17`;
    }

    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!resp.ok) {
      return NextResponse.json({ price: null, url, error: "Could not fetch price" });
    }

    const html = await resp.text();

    // Parse price from the HTML
    const priceMatch = html.match(/\$[\d,]+(?:\.\d{2})?/);
    const price = priceMatch ? priceMatch[0] : null;

    return NextResponse.json({ price, url });
  } catch (error) {
    console.error("fetch-price error:", error);
    return NextResponse.json({ price: null, error: "Error fetching price" }, { status: 500 });
  }
}
