import { NextResponse } from "next/server";

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
    const { title, author, recId } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: "Title required" },
        { status: 400 }
      );
    }

    // Clean title for search: strip subtitles, parentheticals, limit words
    let searchTitle = title
      .replace(/\s*[:]\s*.*/g, "")
      .replace(/\s*\(.*?\)\s*/g, "")
      .trim();
    if (!searchTitle || searchTitle.length < 3) {
      searchTitle = title.split(/\s+/).slice(0, 5).join(" ");
    }
    searchTitle = searchTitle.split(/\s+/).slice(0, 6).join(" ");

    const query = searchTitle + (author ? " " + author : "");
    const url = `https://www.thriftbooks.com/browse/?b.search=${encodeURIComponent(query)}`;

    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!resp.ok) {
      return NextResponse.json(
        { error: `ThriftBooks returned ${resp.status}`, price: null, source: "thriftbooks" },
        { status: 502 }
      );
    }

    const html = await resp.text();

    // Extract prices from search results: SearchResultListItem-dollarAmount">14.29
    const pricePattern = /SearchResultListItem-dollarAmount">([0-9]+\.?[0-9]*)/g;
    const prices: number[] = [];
    let match;
    while ((match = pricePattern.exec(html)) !== null) {
      const price = parseFloat(match[1]);
      if (!isNaN(price) && price > 0) {
        prices.push(price);
      }
    }

    // Fallback: try detail page price format (AllEditionsItem or WorkMeta)
    if (prices.length === 0) {
      const altPattern = /\$([0-9]+\.[0-9]{2})/g;
      let altMatch;
      while ((altMatch = altPattern.exec(html)) !== null) {
        const price = parseFloat(altMatch[1]);
        if (!isNaN(price) && price > 0 && price < 500) {
          prices.push(price);
        }
      }
    }

    if (prices.length === 0) {
      return NextResponse.json({ price: null, source: "thriftbooks", htmlLength: html.length });
    }

    // ThriftBooks prices include free shipping on orders > $15
    // Take the lowest price from results
    const lowestPrice = Math.min(...prices);
    const roundedPrice = Math.round(lowestPrice * 100) / 100;

    // Save to DB
    if (recId) {
      const supabase = getSupabase();
      await supabase
        .from("recommendations")
        .update({ thriftbooks_price: roundedPrice })
        .eq("id", recId);
    }

    return NextResponse.json({
      price: roundedPrice,
      source: "thriftbooks",
      totalResults: prices.length,
    });
  } catch (error) {
    console.error("ThriftBooks price fetch error:", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
