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

    // Parse the first listing's TOTAL price (book + shipping). AbeBooks marks
    // these with data-test-id anchors on the listing card. Grabbing the first
    // "$X.XX" on the page picks up random header text — don't do that.
    const bookAnchor = html.indexOf('data-test-id="item-price-0"');
    let price: string | null = null;
    if (bookAnchor >= 0) {
      const bookM = html.slice(bookAnchor, bookAnchor + 400).match(/US\$\s?([0-9,]+\.[0-9]{2})/);
      if (bookM) {
        const book = parseFloat(bookM[1].replace(/,/g, ""));
        let ship = 0;
        const shipAnchor = html.indexOf('data-test-id="item-shipping-price-0"');
        if (shipAnchor > 0) {
          const shipSlice = html.slice(shipAnchor, shipAnchor + 400);
          const shipM = shipSlice.match(/US\$\s?([0-9,]+\.[0-9]{2})/);
          if (shipM) ship = parseFloat(shipM[1].replace(/,/g, ""));
          else if (/free/i.test(shipSlice)) ship = 0;
        }
        price = `$${(Math.round((book + ship) * 100) / 100).toFixed(2)}`;
      }
    }

    return NextResponse.json({ price, url });
  } catch (error) {
    console.error("fetch-price error:", error);
    return NextResponse.json({ price: null, error: "Error fetching price" }, { status: 500 });
  }
}
