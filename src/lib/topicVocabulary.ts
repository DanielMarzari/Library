import { getDb } from '@/lib/db';
import { topicKey, preferredSpelling } from '@/lib/topics';

/**
 * The spellings the library already uses, keyed by folded topic.
 *
 * Built from the shelf itself rather than a fixed list, so the vocabulary is
 * whatever has actually been tagged. Saving a book tagged "early church" then
 * joins the existing "Early Church" instead of forking the subject in two.
 *
 * Read fresh on each write. Writes are occasional and the whole table is about
 * a thousand rows, so there is nothing to gain by caching it — and a cache
 * here would go stale the moment a new subject was coined, which is exactly
 * when being right matters.
 */
export function topicVocabulary(): Map<string, string> {
  const uses = new Map<string, number>();
  const byKey = new Map<string, Set<string>>();

  const rows = getDb().prepare(
    `SELECT topics, auto_topics FROM books
     WHERE (topics IS NOT NULL AND topics NOT IN ('', '[]'))
        OR (auto_topics IS NOT NULL AND auto_topics NOT IN ('', '[]'))`
  ).all() as Array<{ topics: string | null; auto_topics: string | null }>;

  for (const row of rows) {
    for (const col of [row.topics, row.auto_topics]) {
      if (!col) continue;
      let parsed: unknown;
      try { parsed = JSON.parse(col); } catch { continue; }
      if (!Array.isArray(parsed)) continue;
      for (const v of parsed) {
        if (typeof v !== 'string' || !v.trim()) continue;
        const k = topicKey(v);
        if (!k) continue;
        uses.set(v, (uses.get(v) ?? 0) + 1);
        (byKey.get(k) ?? byKey.set(k, new Set()).get(k)!).add(v);
      }
    }
  }

  const vocab = new Map<string, string>();
  for (const [k, variants] of byKey) vocab.set(k, preferredSpelling(variants, uses));
  return vocab;
}
