// Turn scraped results into SQL for the production database.
//
// Only two outcomes are allowed through:
//   ok        -> set price, stamp checked_at
//   no_result -> leave price NULL, stamp checked_at   (this is what renders "$-")
// blocked and error write NOTHING. They stay in the queue for a later run,
// because "Amazon showed us a CAPTCHA" must never reach the shelf as "nobody
// has this book".
import fs from 'node:fs';
import path from 'node:path';
import { RESULTS, COL } from './lib.mjs';

const q = s => `'${String(s).replace(/'/g, "''")}'`;
const stores = process.argv.slice(2);
if (!stores.length) { console.error('usage: node apply.mjs <store...>'); process.exit(1); }

const out = ['BEGIN TRANSACTION;'];
const summary = {};

for (const store of stores) {
  const f = path.join(RESULTS, `${store}.jsonl`);
  if (!fs.existsSync(f)) { console.error(`no results for ${store}`); continue; }
  const { price, checked } = COL[store];
  const seen = new Map();          // last write wins if a row was retried
  const tally = { ok: 0, no_result: 0, skipped: 0 };

  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (r.outcome !== 'ok' && r.outcome !== 'no_result') { tally.skipped++; continue; }
    seen.set(r.id, r);
  }

  for (const r of seen.values()) {
    tally[r.outcome]++;
    const p = r.outcome === 'ok' ? Number(r.price) : null;
    if (r.outcome === 'ok' && (!Number.isFinite(p) || p <= 0 || p > 100000)) { tally.skipped++; tally.ok--; continue; }
    out.push(
      `UPDATE recommendations SET ${price} = ${p == null ? 'NULL' : p.toFixed(2)}, ${checked} = ${q(r.ts)} WHERE id = ${q(r.id)};`
    );
  }
  summary[store] = tally;
}

out.push('COMMIT;');
const sqlPath = path.join(RESULTS, 'apply.sql');
fs.writeFileSync(sqlPath, out.join('\n') + '\n');
console.log(JSON.stringify(summary, null, 2));
console.log(`\n${out.length - 2} UPDATE statements -> ${sqlPath}`);
