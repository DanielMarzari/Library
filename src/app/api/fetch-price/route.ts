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
    const { title, author, recId } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }

    // Search AbeBooks for the lowest price
    const query = encodeURIComponent(
      title + (author ? " " + author : "")
    );
    const url = `https://www.abebooks.com/servlet/SearchResults?kn=${query}&sortby=17`;

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

    const html = await resp.text();

    // Extract prices from AbeBooks HTML
    // Prices appear as "US$ XX.XX" or "US$ XX"
    const priceMatches = html.match(/US\$\s*([0-9]+\.?[0-9]*)/g);

    if (!priceMatches || priceMatches.length === 0) {
      return NextResponse.json({ price: null, source: "abebooks" });
    }

    // Parse all prices and find the lowest
    const prices = priceMatches
      .map((p: string) => parseFloat(p.replace("US$ ", "").replace("US$", "")))
      .filter((p: number) => !isNaN(p) && p > 0);

    if (prices.length === 0) {
      return NextResponse.json({ price: null, source: "abebooks" });
    }

    const lowestPrice = Math.min(...prices);

    // Save price to DB if recId provided
    if (recId) {
      const supabase = getSupabase();
      await supabase
        .from("recommendations")
        .update({ lowest_price: lowestPrice })
        .eq("id", recId);
    }

    return NextResponse.json({
      price: lowestPrice,
      source: "abebooks",
      totalResults: prices.length,
    });
  } catch (error) {
    console.error("Price fetch error:", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
