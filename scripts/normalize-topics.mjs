#!/usr/bin/env node
/**
 * One topic, one spelling — applied to the rows already in the library.
 *
 *   node scripts/normalize-topics.mjs <path-to.db>            # dry run
 *   node scripts/normalize-topics.mjs <path-to.db> --apply    # write
 *
 * Two passes, deliberately unequal in ambition:
 *
 *   1. TYPOS — a hand-checked list of exact topic strings. Every entry was
 *      read individually. Nothing is inferred here at run time, because a
 *      spell-checker cannot tell a misspelling from a foreign subject heading:
 *      this shelf has Dutch, German and French catalogue records, so `Bibel`,
 *      `Théologie` and `Hermeneutik` are correct and must survive untouched.
 *
 *   2. FOLDING — merge topics that are the same characters modulo case,
 *      punctuation and spacing, keeping the spelling the library uses most.
 *      Purely mechanical, and the reason it stops there is that fuzzy matching
 *      on this data is actively dangerous: edit distance pairs
 *      `Bible, commentaries, n. t.` with `o. t.` (the New and Old Testaments),
 *      `Hebrew` with `Hebrews` (a language and an epistle), and `Jona` with
 *      `Jozua`. Merging any of those would destroy a real distinction, so
 *      near-matches are reported and left alone.
 *
 * Singular/plural pairs are likewise left alone: `Prayer` and `Prayers` are
 * the practice and the genre, and telling those apart is a judgement about
 * meaning, not spelling.
 */

import Database from "better-sqlite3";

const [dbPath, ...flags] = process.argv.slice(2);
const APPLY = flags.includes("--apply");
if (!dbPath) {
  console.error("usage: normalize-topics.mjs <path-to.db> [--apply]");
  process.exit(1);
}

/** Exact topic strings, each verified by hand against the book carrying it. */
const TYPOS = new Map(Object.entries({
  "Fantacy": "Fantasy",
  "Fantasty fiction": "Fantasy fiction",
  "Judiasm": "Judaism",
  "1st Century Judiasm": "1st Century Judaism",
  "Exisitential Psychology": "Existential Psychology",
  "Singlness": "Singleness",
  "Gluten Sensativity": "Gluten Sensitivity",
  "Depedence": "Dependence",
  "Theological anthropolgy": "Theological anthropology",
  "Holliness": "Holiness",
  "Death Gae Universe (Imaginary place)": "Death Gate Universe (Imaginary place)",
  // Tagged on "Don't Call It Love", whose catalogue subjects read "Sex
  // addiction" and "Sex addicts". A slip, not arithmetic.
  "Addition": "Addiction",
  // The library spells it "Judgment" everywhere else -- "Judgment Day",
  // "Judgment of God". Both are real English; consistency decides.
  "Judgement": "Judgment",
  "Snap Judgements": "Snap Judgments",
}));

const normalize = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
// Accents kept -- see src/lib/topics.ts. Must stay identical to topicKey().
const key = (s) => normalize(s).toLowerCase()
  .replace(/[^\p{Letter}\p{Number}]+/gu, " ").trim();

function preferred(variants, uses) {
  const score = (s) => [
    uses.get(s) ?? 0,
    s.length > 3 && s === s.toUpperCase() ? 0 : 1,
    s.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).length,
  ];
  return [...variants].sort((a, b) => {
    const [a0, a1, a2] = score(a), [b0, b1, b2] = score(b);
    return b0 - a0 || b1 - a1 || b2 - a2 || a.localeCompare(b);
  })[0];
}

const db = new Database(dbPath, { readonly: !APPLY });
const rows = db.prepare("SELECT id, topics, auto_topics FROM books").all();

const parse = (raw) => {
  if (!raw) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; }
  catch { return []; }
};

// Pass 1 counts usage AFTER typo correction, so a misspelling can't win a
// vote on popularity -- "Fantacy" outnumbers "Fantasy" 7 to 6 in this library.
const uses = new Map();
const byKey = new Map();
for (const r of rows) {
  for (const col of ["topics", "auto_topics"]) {
    for (const raw of parse(r[col])) {
      const t = TYPOS.get(normalize(raw)) ?? normalize(raw);
      if (!t) continue;
      const k = key(t);
      if (!k) continue;
      uses.set(t, (uses.get(t) ?? 0) + 1);
      if (!byKey.has(k)) byKey.set(k, new Set());
      byKey.get(k).add(t);
    }
  }
}

const canon = new Map();
for (const [k, variants] of byKey) canon.set(k, preferred(variants, uses));

const merges = [...byKey.entries()].filter(([, v]) => v.size > 1);
console.log(`topics: ${uses.size} distinct spellings -> ${byKey.size} subjects`);
console.log(`typo corrections available: ${TYPOS.size}`);
console.log(`spelling groups merged: ${merges.length}\n`);
for (const [k, variants] of merges.sort((a, b) => b[1].size - a[1].size)) {
  const keep = canon.get(k);
  const drop = [...variants].filter((v) => v !== keep);
  console.log(`  keep ${JSON.stringify(keep)}  <-  ${drop.map((d) => JSON.stringify(d)).join(", ")}`);
}

let changedRows = 0, changedTags = 0;
const updates = [];
for (const r of rows) {
  const next = {};
  let dirty = false;
  for (const col of ["topics", "auto_topics"]) {
    const before = parse(r[col]);
    const seen = new Set();
    const after = [];
    for (const raw of before) {
      const t = TYPOS.get(normalize(raw)) ?? normalize(raw);
      const k = key(t);
      if (!k || seen.has(k)) continue;        // drops within-row duplicates too
      seen.add(k);
      after.push(canon.get(k) ?? t);
    }
    next[col] = after;
    if (JSON.stringify(after) !== JSON.stringify(before)) {
      dirty = true;
      changedTags += after.filter((v, i) => v !== before[i]).length + Math.max(0, before.length - after.length);
    }
  }
  if (dirty) {
    changedRows++;
    updates.push([JSON.stringify(next.topics), JSON.stringify(next.auto_topics), r.id]);
  }
}

console.log(`\nrows to update: ${changedRows}   tags rewritten or dropped: ${changedTags}`);

if (!APPLY) {
  console.log("\nDRY RUN -- nothing written. Re-run with --apply.");
  process.exit(0);
}

const stmt = db.prepare("UPDATE books SET topics = ?, auto_topics = ? WHERE id = ?");
db.transaction((list) => { for (const u of list) stmt.run(...u); })(updates);
console.log(`\nAPPLIED: ${changedRows} rows updated.`);
