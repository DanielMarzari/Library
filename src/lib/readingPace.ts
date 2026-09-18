import { Density, ReadingUpdate } from "@/types/book";

/**
 * Reading pace, derived from the gaps between consecutive log entries.
 *
 * The insight this rests on: logging a page turn stamps a timestamp, so two
 * consecutive entries on the same book give both pages covered AND the minutes
 * they took. No separate stopwatch is needed — the duration was always in the
 * log, it just looked like noise. Earlier attempts merged rapid entries
 * together to form "sessions" and threw that signal away, which is why pace
 * appeared unpredictable.
 *
 * A pair is usable when the two entries are 1-90 minutes apart:
 *   < 1 min   — back-filling several entries at once, not reading time
 *   > 90 min  — put the book down and came back; the gap is not reading time
 */

export const MIN_PAIR_MINUTES = 1;
export const MAX_PAIR_MINUTES = 90;
/** Below this, a single unusual stretch would dominate the number. */
export const MIN_PAIRS_FOR_RATE = 3;
/** A tier with fewer measured books than this cannot honestly predict. */
export const MIN_BOOKS_FOR_TIER = 3;

export interface PaceReading {
  pagesPerHour: number;
  pairs: number;
  /** Minutes of observed reading the rate is built from. */
  observedMinutes: number;
}

interface PaceInput {
  pages_read?: number | null;
  created_at: string;
}

/**
 * Observed pages-per-hour for one book, or null when there isn't enough
 * timed reading to say. Input may be in any order.
 */
export function observedPace(updates: PaceInput[]): PaceReading | null {
  const sorted = [...updates].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let pages = 0;
  let minutes = 0;
  let pairs = 0;

  for (let i = 1; i < sorted.length; i++) {
    const gapMin =
      (new Date(sorted[i].created_at).getTime() -
        new Date(sorted[i - 1].created_at).getTime()) / 60000;
    const pagesRead = sorted[i].pages_read ?? 0;
    if (gapMin < MIN_PAIR_MINUTES || gapMin > MAX_PAIR_MINUTES) continue;
    if (pagesRead <= 0) continue;
    pages += pagesRead;
    minutes += gapMin;
    pairs++;
  }

  if (pairs < MIN_PAIRS_FOR_RATE || minutes <= 0) return null;
  return {
    pagesPerHour: Math.round((pages / minutes) * 60),
    pairs,
    observedMinutes: Math.round(minutes),
  };
}

export interface TierStat {
  density: Density;
  books: number;
  /** Rates are reported as a range, never a mean: with a handful of books per
   *  tier a single average reads as more precise than the data supports. */
  minPagesPerHour: number;
  maxPagesPerHour: number;
  medianPagesPerHour: number;
}

export function tierStats(
  measured: Array<{ density?: Density | null; pagesPerHour: number }>
): Record<string, TierStat> {
  const byTier: Record<string, number[]> = {};
  for (const m of measured) {
    if (!m.density) continue;
    (byTier[m.density] ||= []).push(m.pagesPerHour);
  }
  const out: Record<string, TierStat> = {};
  for (const [density, rates] of Object.entries(byTier)) {
    if (rates.length < MIN_BOOKS_FOR_TIER) continue;
    const sorted = [...rates].sort((a, b) => a - b);
    out[density] = {
      density: density as Density,
      books: sorted.length,
      minPagesPerHour: sorted[0],
      maxPagesPerHour: sorted[sorted.length - 1],
      medianPagesPerHour: sorted[Math.floor(sorted.length / 2)],
    };
  }
  return out;
}

/** Hours to finish `pagesLeft` at a given rate, rounded to something sayable. */
export function hoursLeft(pagesLeft: number, pagesPerHour: number): number | null {
  if (pagesLeft <= 0 || pagesPerHour <= 0) return null;
  const h = pagesLeft / pagesPerHour;
  return h < 10 ? Math.round(h * 2) / 2 : Math.round(h);
}

export function formatHours(h: number): string {
  if (h < 1) return "under an hour";
  if (h === 1) return "about an hour";
  return `~${h} hours`;
}
