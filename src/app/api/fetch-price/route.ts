import { NextResponse } from "next/server";

// Lazy-init supabase to avoid build-time env var errors
function getSupabase() {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const { title, author, isbn, recId } = await request.json();

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

    // If we got results with an ISBN, try to save it back to the recommendation
    let foundIsbn: string | null = null;

    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!resp.ok) {
      return NextResponse.json(
        { error: "Failed to fetch from AbeBooks" },
        { status: 502 }
      );
    }

    const rawHtml = await resp.text();
    // Collapse whitespace so multi-line attributes match in one regex
    const html = rawHtml.replace(/\s+/g, " ");

    // Strategy 1: Use data attributes from add-to-basket links (most reliable)
    // These have data-csa-c-cost="18.88" and data-csa-c-shipping-cost="6.88"
    const basketLinkPattern =
      /data-csa-c-cost="([0-9]+\.?[0-9]*)"[^>]*?data-csa-c-shipping-cost="([0-9]+\.?[0-9]*)"/g;
    const totalPrices: number[] = [];
    let match;

    while ((match = basketLinkPattern.exec(html)) !== null) {
      const bookPrice = parseFloat(match[1]);
      const shippingPrice = parseFloat(match[2]);
      if (!isNaN(bookPrice) && !isNaN(shippingPrice)) {
        totalPrices.push(bookPrice + shippingPrice);
      }
    }

    // Strategy 3: Last resort - parse item-price elements and shipping text
    if (totalPrices.length === 0) {
      const itemPriceMatches = html.match(
        /class="item-price"[^>]*>(?:US\$|£|€|C\$|A\$)?\s*([0-9]+[,.]?[0-9]*)/g
      );
      if (itemPriceMatches && itemPriceMatches.length > 0) {
        for (const pm of itemPriceMatches) {
          const numMatch = pm.match(/([0-9]+[,.]?[0-9]*)\s*$/);
          if (numMatch) {
            const price = parseFloat(numMatch[1].replace(",", ""));
            if (!isNaN(price) && price > 0) {
              totalPrices.push(price);
            }
          }
        }
      }
    }

    if (totalPrices.length === 0) {
      return NextResponse.json({ price: null, source: "abebooks" });
    }

    // Get the lowest total price (book + shipping)
    const lowestPrice = Math.min(...totalPrices);
    // Round to 2 decimal places to avoid floating point artifacts
    const roundedPrice = Math.round(lowestPrice * 100) / 100;

    // Try to extract ISBN from search results for backfill
    const isbnMatch = html.match(/itemprop="isbn"\s*content="(\d{10,13})"/);
    if (isbnMatch) {
      foundIsbn = isbnMatch[1];
    }

    // Save price (and ISBN if found) to DB if recId provided
    if (recId) {
      const supabase = getSupabase();
      const updateData: Record<string, unknown> = { lowest_price: roundedPrice };
      // Backfill ISBN if we found one and the rec doesn't have one
      if (foundIsbn && !isbn) {
        updateData.isbn = foundIsbn;
      }
      await supabase
        .from("recommendations")
        .update(updateData)
        .eq("id", recId);
    }

    return NextResponse.json({
      price: roundedPrice,
      source: "abebooks",
      totalResults: totalPrices.length,
    });
  } catch (error) {
    console.error("Price fetch error:", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
