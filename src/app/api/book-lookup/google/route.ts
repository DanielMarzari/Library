import { NextRequest, NextResponse } from 'next/server';

/**
 * Google Books, proxied so the API key stays on the server.
 *
 * Keyless access to this API is not rate-limited, it is OFF: the 429 it returns
 * carries `quota_limit_value: "0"` against Google's shared anonymous project
 * (`projects/624717413613`), scoped `1/d/{project}`. No amount of backoff
 * recovers that — a key is the only way in, and it moves the request onto your
 * own project's allowance.
 *
 * Set GOOGLE_BOOKS_API_KEY to enable. Without it this route says so plainly
 * rather than looking like a book nobody has heard of.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  const limit = request.nextUrl.searchParams.get('limit') || '5';
  if (!q) return NextResponse.json({ error: 'q is required' }, { status: 400 });

  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (!key) {
    // 501, not 200-with-nothing: "not configured" and "not found" are different
    // answers and the caller has to be able to tell them apart.
    return NextResponse.json(
      { error: 'not_configured', message: 'GOOGLE_BOOKS_API_KEY is not set; keyless Google Books is permanently disabled.' },
      { status: 501 }
    );
  }

  const url =
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}` +
    `&maxResults=${encodeURIComponent(limit)}&key=${encodeURIComponent(key)}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      // Surface it. The previous code read `.items` off whatever came back, so
      // a quota failure parsed cleanly, had no items, and was indistinguishable
      // from a genuine miss — which is how this leg stayed dead unnoticed.
      const message = body?.error?.message || `Google Books returned ${res.status}`;
      console.error('Google Books lookup failed:', res.status, message);
      return NextResponse.json({ error: 'upstream', status: res.status, message }, { status: 502 });
    }

    return NextResponse.json({ items: body?.items ?? [] });
  } catch (error) {
    console.error('Google Books lookup error:', error);
    return NextResponse.json({ error: 'fetch_failed', message: String(error) }, { status: 502 });
  }
}
