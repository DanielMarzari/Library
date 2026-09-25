// Amazon for the rows with no ISBN. Separate runner because it needs a live
// Chrome for the search leg and runs an order of magnitude slower than /dp/.
// Writes into the SAME results/amazon.jsonl, so both paths resume together and
// apply together.
import { queue, done, record, pause, progress } from './lib.mjs';
import { open, close, lookupByTitle } from './amazon-search.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i === -1 ? d : process.argv[i + 1]; };
const LIMIT = Number(arg('--limit', 0));
const DELAY = Number(arg('--delay', 20000));

const all = queue('amazon');
const already = done('amazon');
let todo = all.filter(r => !already.has(r.id) && !(r.isbn && r.isbn.replace(/\D/g, '').length >= 10));
const work = LIMIT ? todo.slice(0, LIMIT) : todo;
console.log(`[amazon-search] ${todo.length} no-ISBN rows owing · ${work.length} this pass · ${DELAY}ms pacing`);

await open();
const tally = { ok: 0, no_result: 0, blocked: 0, error: 0 };
let blocks = 0;

try {
  for (let i = 0; i < work.length; i++) {
    const r = work[i];
    let res;
    try {
      const o = await lookupByTitle(r.title, r.author);
      const outcome =
        o.status === 'OK'      ? 'ok' :
        o.status === 'BLOCKED' ? 'blocked' :
        ['FAILED', 'SHIPPING_UNSTATED'].includes(o.status) ? 'error' : 'no_result';
      res = { outcome, price: o.total ?? null, via: 'search', matched: o.searchTitle ?? o.pageTitle ?? null,
              why: o.reason ?? o.status, url: o.url ?? null, asin: o.asin ?? null, score: o.score ?? null };
    } catch (e) {
      res = { outcome: 'error', why: String(e && e.message || e).slice(0, 160) };
    }
    tally[res.outcome]++;
    record('amazon', { id: r.id, title: r.title, isbn: null, ts: new Date().toISOString(), ...res });

    if (res.outcome === 'blocked') {
      blocks++;
      if (blocks >= 3) { console.log('\n[amazon-search] three blocks in a row — stopping'); break; }
      await pause(DELAY * 15 * blocks, 0.2);
    } else { blocks = 0; await pause(DELAY); }
    progress('amazon-search', i + 1, work.length, tally);
  }
} finally { await close(); }
console.log(`\n[amazon-search] ${JSON.stringify(tally)}`);
