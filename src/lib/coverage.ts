/**
 * Progress for books read out of order — cookbooks, devotionals, reference.
 *
 * A linear book has a position: page 176 of 240. A devotional doesn't. What it
 * has is a set of pages you've covered, accumulated in whatever order you got
 * to them. So progress here is the UNION of the logged spans, not their sum.
 *
 * That distinction is the whole design. Logging pages 40-52 twice is 13 pages
 * covered, not 26: the denominator is a fixed set of pages, so a running sum
 * measures a different set and the fraction stops being a fraction of anything.
 * A cookbook you consult five times is not read five times over.
 *
 * The sum isn't thrown away — pages_read still records every sitting, and the
 * UI can show "148 logged · 36 revisited" — it just isn't what fills the bar.
 */

export interface Span {
  /** First page of the span, inclusive. */
  start: number;
  /** Last page of the span, inclusive. */
  end: number;
}

export interface Coverage {
  /** Distinct pages covered, after merging overlaps. */
  covered: number;
  /** Total pages logged including repeats — always >= covered. */
  loggedSum: number;
  /** Pages logged more than once. */
  revisited: number;
  /** Merged, sorted spans. */
  islands: Span[];
  /** Size of the book's readable range, or null if it isn't known. */
  denom: number | null;
  /** Percent covered, or null when the range isn't known. */
  percent: number | null;
}

/**
 * The readable page range of a book. Mirrors what the linear progress bar uses,
 * minus intro_pages: you can't type roman-numeral front matter into a page
 * range, so counting it in the denominator would put 100% permanently out of
 * reach.
 */
export function readableRange(book: {
  start_page?: number | null;
  end_page?: number | null;
  reading_pages?: number | null;
  pages?: number | null;
}): { lo: number; hi: number | null } {
  const lo = book.start_page ?? 1;
  if (book.end_page != null) return { lo, hi: book.end_page };
  const total = book.reading_pages ?? book.pages ?? null;
  return { lo, hi: total != null ? lo + total - 1 : null };
}

/**
 * Merge spans and measure coverage. Spans are clamped to the book's readable
 * range first, so a mistyped page past the end can't inflate progress past 100%.
 * Adjacent spans join (40-52 and 53-60 make one island of 40-60).
 */
export function coverageOf(
  spans: Span[],
  range: { lo: number; hi: number | null }
): Coverage {
  const { lo, hi } = range;

  const clamped: Span[] = [];
  let loggedSum = 0;
  for (const s of spans) {
    const start = Math.max(s.start, lo);
    const end = hi != null ? Math.min(s.end, hi) : s.end;
    if (end < start) continue;
    clamped.push({ start, end });
    loggedSum += end - start + 1;
  }

  clamped.sort((a, b) => a.start - b.start || a.end - b.end);

  const islands: Span[] = [];
  for (const s of clamped) {
    const last = islands[islands.length - 1];
    // <= end + 1 so touching spans merge rather than leaving a phantom gap.
    if (last && s.start <= last.end + 1) {
      if (s.end > last.end) last.end = s.end;
    } else {
      islands.push({ ...s });
    }
  }

  const covered = islands.reduce((n, s) => n + (s.end - s.start + 1), 0);
  const denom = hi != null ? hi - lo + 1 : null;

  return {
    covered,
    loggedSum,
    revisited: loggedSum - covered,
    islands,
    denom,
    percent: denom && denom > 0 ? Math.min(100, Math.round((covered / denom) * 100)) : null,
  };
}

/** Compact description of what's been covered, e.g. "1–52, 60–74". */
export function describeIslands(islands: Span[], max = 4): string {
  if (islands.length === 0) return "nothing logged yet";
  const shown = islands.slice(0, max).map(s => (s.start === s.end ? `${s.start}` : `${s.start}–${s.end}`));
  const rest = islands.length - shown.length;
  return shown.join(", ") + (rest > 0 ? ` +${rest} more` : "");
}
