// One runner, three stores. Each store's lookup() comes from the hardened
// script its investigation produced; this file owns only the queue, the resume
// log, the pacing and — most importantly — the mapping from a store's status
// into the four outcomes the database is allowed to see.
//
//   ok        -> price + checked_at
//   no_result -> NULL  + checked_at   ("$-")
//   blocked   -> nothing written, stays queued
//   error     -> nothing written, stays queued
//
// usage: node run.mjs <abe|thrift|amazon> [--limit N] [--delay MS] [--isbn-only]
import { queue, done, record, pause, progress } from './lib.mjs';

const store = process.argv[2];
const arg = (k, d) => { const i = process.argv.indexOf(k); return i === -1 ? d : process.argv[i + 1]; };
const LIMIT = Number(arg('--limit', 0));
const DELAY = Number(arg('--delay', 0));
const ISBN_ONLY = process.argv.includes('--isbn-only');

const ADAPTERS = {
  abe: {
    defaultDelay: 6000,
    load: () => import('./abebooks-price-hardened.mjs'),
    run: async (m, r) => {
      const o = await m.lookup({ isbn: r.isbn, title: r.title, author: r.author });
      const outcome =
        o.status === 'OK'        ? 'ok' :
        o.status === 'NO_RESULT' ? 'no_result' :
        o.status === 'BLOCKED'   ? 'blocked' : 'error';
      return { outcome, price: o.total ?? null, via: o.via, matched: o.matchedTitle ?? null, why: o.reason ?? null, url: o.url ?? null };
    },
  },
  thrift: {
    defaultDelay: 1800,
    load: () => import('./thriftbooks-price-v2.mjs'),
    run: async (m, r) => {
      const o = await m.lookup({ isbn: r.isbn, title: r.title, author: r.author });
      const outcome =
        o.outcome === 'ok'        ? 'ok' :
        o.outcome === 'not_found' ? 'no_result' : 'error';
      return { outcome, price: o.total ?? null, via: o.via ?? null, matched: o.matchedTitle ?? o.storeTitle ?? null, why: o.reason ?? null, url: o.url ?? null };
    },
  },
  amazon: {
    defaultDelay: 27000,
    load: () => import('./amazon-verified.mjs'),
    run: async (m, r) => {
      // Only the ISBN path is cheap. Amazon's search endpoint sits behind an
      // Akamai interstitial on the very first plain request, so a no-ISBN row
      // needs a real browser and is left for a separate, slower pass.
      if (!r.isbn) return { outcome: 'error', why: 'no isbn — needs the browser search path' };
      const o = await m.lookupByIsbn(r.isbn, r.title);
      const outcome =
        o.status === 'OK'                                 ? 'ok' :
        o.status === 'BLOCKED'                            ? 'blocked' :
        ['FAILED', 'SHIPPING_UNSTATED', 'NO_ISBN'].includes(o.status) ? 'error' : 'no_result';
      return { outcome, price: o.total ?? null, via: 'isbn', matched: o.pageTitle ?? null, why: o.reason ?? o.note ?? o.status, url: o.url ?? null };
    },
  },
};

const A = ADAPTERS[store];
if (!A) { console.error(`unknown store: ${store}`); process.exit(1); }
const delay = DELAY || A.defaultDelay;
const mod = await A.load();

const all = queue(store);
const already = done(store);
let todo = all.filter(r => !already.has(r.id));
if (ISBN_ONLY) todo = todo.filter(r => r.isbn && r.isbn.replace(/\D/g, '').length >= 10);
const work = LIMIT ? todo.slice(0, LIMIT) : todo;

console.log(`[${store}] ${all.length} owing · ${already.size} already recorded · ${work.length} this pass · ${delay}ms pacing`);

const tally = { ok: 0, no_result: 0, blocked: 0, error: 0 };
let blocks = 0;

for (let i = 0; i < work.length; i++) {
  const r = work[i];
  let res;
  try {
    res = await A.run(mod, r);
  } catch (e) {
    res = { outcome: 'error', why: String(e && e.message || e).slice(0, 160) };
  }
  tally[res.outcome]++;
  record(store, { id: r.id, title: r.title, isbn: r.isbn || null, ts: new Date().toISOString(), ...res });

  if (res.outcome === 'blocked') {
    blocks++;
    if (blocks >= 3) { console.log(`\n[${store}] three blocks in a row — stopping rather than burning the IP`); break; }
    await pause(delay * 12 * blocks, 0.2);
  } else {
    blocks = 0;
    await pause(delay);
  }
  progress(store, i + 1, work.length, tally);
}
console.log(`\n[${store}] ${JSON.stringify(tally)}`);
