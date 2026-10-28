/**
 * One topic, one spelling.
 *
 * Topics are free text typed into a box, and the box used to compare them with
 * `includes()` — exact, case-sensitive. So "Bible" and "BIble" were two
 * subjects, "Early Church" and "Early church" were two subjects, and the
 * expertise tiers on /skills split their credit between them. 80 subjects in
 * the library had arrived at two or three spellings this way.
 *
 * The fix is to compare on a folded key while storing the spelling the library
 * already uses. Nothing here guesses at meaning: two topics merge only when
 * they are the same characters modulo case, punctuation and spacing. Real
 * distinctions survive, which matters more than it sounds — "Bible,
 * commentaries, n. t." and "...o. t." differ by one letter and are the New and
 * Old Testaments, and "Hebrew" and "Hebrews" are a language and an epistle.
 */

/** Trim and collapse runs of whitespace. The only edit made to a topic. */
export function normalizeTopic(raw: string): string {
  return String(raw ?? "").replace(/\s+/g, " ").trim();
}

/**
 * The comparison key. Case, punctuation and spacing are folded, so
 * `Spiritual life, christianity` and `Spiritual life -- Christianity` — the
 * same heading from two catalogues — land on the same key.
 */
export function topicKey(raw: string): string {
  // Accents are NOT folded. This shelf carries Dutch, German and French
  // catalogue records, and stripping them merged "Création" into "Creation"
  // and "Théologie" into "Theologie" -- translating two subjects into one
  // rather than reconciling two spellings of the same one.
  return normalizeTopic(raw)
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

/**
 * Which spelling of a subject to keep.
 *
 * Whatever the library already says most often, because that is the user's own
 * usage rather than a style imposed on it. Ties go to the better-capitalised
 * form: `Early Church` over `Early church`, and `Science` over `SCIENCE`,
 * since a shouted heading is an import artefact, not a preference.
 */
export function preferredSpelling(variants: Iterable<string>, uses: Map<string, number> = new Map()): string {
  const score = (s: string): [number, number, number, string] => [
    uses.get(s) ?? 0,
    // An all-caps heading loses to any mixed-case one of equal frequency.
    s.length > 3 && s === s.toUpperCase() ? 0 : 1,
    s.split(/\s+/).filter(w => /^[A-Z]/.test(w)).length,
    s,
  ];
  let best: string | null = null;
  let bestScore: [number, number, number, string] | null = null;
  for (const v of variants) {
    const sc = score(v);
    if (
      !bestScore ||
      sc[0] > bestScore[0] ||
      (sc[0] === bestScore[0] && sc[1] > bestScore[1]) ||
      (sc[0] === bestScore[0] && sc[1] === bestScore[1] && sc[2] > bestScore[2]) ||
      (sc[0] === bestScore[0] && sc[1] === bestScore[1] && sc[2] === bestScore[2] && sc[3] < bestScore[3])
    ) {
      best = v;
      bestScore = sc;
    }
  }
  return best ?? "";
}

/**
 * Drop repeats that differ only in case or punctuation, keeping the first
 * spelling seen. Order is preserved: tags read in the order they were added.
 */
export function dedupeTopics(list: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const t = normalizeTopic(raw);
    if (!t) continue;
    const k = topicKey(t);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/**
 * Add a topic to a list, matching case-insensitively.
 *
 * Returns the list unchanged when the subject is already there under any
 * spelling, so typing "bible" onto a book already tagged "Bible" is a no-op
 * rather than a second tag.
 */
export function addTopic(list: readonly string[], raw: string): string[] {
  const t = normalizeTopic(raw);
  if (!t) return [...list];
  const k = topicKey(t);
  if (list.some(x => topicKey(x) === k)) return [...list];
  return [...list, t];
}

/**
 * Snap topics onto the spellings the library already uses.
 *
 * `vocabulary` maps a folded key to the established spelling. A tag that
 * matches one is rewritten to it, so a book saved with "early church" joins
 * the existing "Early Church" instead of forking it. A genuinely new subject
 * passes through as typed — this standardises, it does not restrict.
 */
export function canonicalizeTopics(list: readonly string[], vocabulary: Map<string, string>): string[] {
  return dedupeTopics(list.map(t => vocabulary.get(topicKey(t)) ?? normalizeTopic(t)));
}
