// Shared harness for the three price scrapers.
//
// The one rule that governs everything here: a lookup has FOUR outcomes, and
// only two of them are allowed to touch the database.
//
//   ok        — found a price for the right book        -> write price + checked_at
//   no_result — the store genuinely has no copy         -> write NULL  + checked_at  ("$-")
//   blocked   — bot wall / rate limit                   -> write NOTHING, retry later
//   error     — timeout, parse broke, bad HTML          -> write NOTHING, retry later
//
// Collapsing `blocked` into `no_result` is how you end up telling someone a book
// is unavailable when the truth is that Amazon showed us a CAPTCHA. The whole
// point of the "$-" display is that it means something, so it has to be earned.

import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

// Where the working files live. Override with PRICES_DIR when running
// somewhere other than the repo.
export const SP = process.env.PRICES_DIR || path.join(process.cwd(), '.prices');
export const RESULTS = path.join(SP, 'results');

export const COL = {
  abe:    { price: 'lowest_price',      checked: 'abe_checked_at' },
  thrift: { price: 'thriftbooks_price', checked: 'thrift_checked_at' },
  amazon: { price: 'amazon_price',      checked: 'amazon_checked_at' },
};

/** Rows still owing a price for `store`, cheapest-to-verify first (ISBN rows lead). */
export function queue(store, dbPath = process.env.LIBRARY_DB || path.join(SP, 'library.db')) {
  const db = new Database(dbPath, { readonly: true });
  const { price, checked } = COL[store];
  const rows = db.prepare(`
    SELECT id, title, author, isbn
    FROM recommendations
    WHERE ${price} IS NULL AND ${checked} IS NULL
      AND COALESCE(item_type,'book') = 'book'
    ORDER BY (isbn IS NULL OR trim(isbn)=''), title
  `).all();
  db.close();
  return rows;
}

/** Outcomes already recorded, so a re-run resumes instead of restarting. */
export function done(store) {
  const f = path.join(RESULTS, `${store}.jsonl`);
  const map = new Map();
  if (!fs.existsSync(f)) return map;
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      // Only terminal outcomes count as done; blocked/error stay in the queue.
      if (r.outcome === 'ok' || r.outcome === 'no_result') map.set(r.id, r);
    } catch { /* a torn last line from a kill — ignore it */ }
  }
  return map;
}

export function record(store, row) {
  fs.appendFileSync(path.join(RESULTS, `${store}.jsonl`), JSON.stringify(row) + '\n');
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));
/** Jitter so a fixed cadence doesn't look like a fixed cadence. */
export const pause = (base, spread = 0.4) =>
  sleep(Math.round(base * (1 - spread + Math.random() * spread * 2)));

const STOP = new Set(['the','a','an','of','and','in','on','for','to','with','from','by','its','his','her','their']);
const words = s => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));

/**
 * Does the listing we found actually correspond to the book we asked for?
 *
 * Only consulted on the title+author search path — 1,240 of these rows have no
 * ISBN, and a keyword search that misses will cheerfully return SOME book. A
 * wrong price is worse than no price, so an unconvincing match is reported as
 * no_result rather than written down.
 */
export function titleMatches(wanted, found, threshold = 0.5) {
  if (!found) return false;
  const w = words(wanted), f = new Set(words(found));
  if (w.length === 0) return false;
  const hits = w.filter(x => f.has(x)).length;
  return hits / w.length >= threshold;
}

/** ISBN-13 (978-prefixed) -> ISBN-10, which is the ASIN for most books. */
export function isbn13to10(isbn13) {
  const d = (isbn13 || '').replace(/\D/g, '');
  if (d.length !== 13 || !d.startsWith('978')) return null;
  const core = d.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * Number(core[i]);
  const check = (11 - (sum % 11)) % 11;
  return core + (check === 10 ? 'X' : String(check));
}

export function cleanTitle(title) {
  let t = (title || '')
    .replace(/\s*[:]\s*.*/g, '')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .trim();
  if (t.length < 3) t = (title || '').split(/\s+/).slice(0, 5).join(' ');
  return t.split(/\s+/).slice(0, 6).join(' ');
}

/** Progress line that says what's actually happening, not just a count. */
export function progress(store, i, total, tally) {
  const pct = ((i / total) * 100).toFixed(1);
  process.stdout.write(
    `\r[${store}] ${i}/${total} (${pct}%)  ok:${tally.ok} na:${tally.no_result} blocked:${tally.blocked} err:${tally.error}   `
  );
}
