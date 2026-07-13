// Merge multiple spellings of the same real author into one canonical name.
// Add pairs here as they show up. Keys are normalized (lowercase, punctuation
// stripped, spaces collapsed) so "N.T. Wright", "N. T. Wright", "NT Wright"
// and "n t wright" all collapse to the same key.

const CANONICAL_BY_KEY: Record<string, string> = {
  "nt wright": "N.T. Wright",
  "tom wright": "N.T. Wright",
};

function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function canonicalAuthor(name: string): string {
  const key = normalizeKey(name);
  if (CANONICAL_BY_KEY[key]) return CANONICAL_BY_KEY[key];
  return name.trim();
}

// Returns true if two names refer to the same real author under our alias map.
export function sameAuthor(a: string, b: string): boolean {
  return canonicalAuthor(a).toLowerCase() === canonicalAuthor(b).toLowerCase();
}
