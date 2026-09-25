// Write results through the app's own PUT /api/recommendations/[id] rather than
// a shell into the production database. Same route the "Refresh Prices" button
// uses, so the field allowlist and validation apply, and no remote shell write
// is involved.
//
// Still only two outcomes are written: 'ok' (price + stamp) and 'no_result'
// (NULL price + stamp, which is what renders "$-"). Blocked and error rows are
// left untouched so a later pass can retry them.
import fs from 'node:fs';
import path from 'node:path';
import { RESULTS, COL } from './lib.mjs';

const BASE = process.env.BASE || 'https://library.danmarzari.com';
const COOKIE = `session_token=${process.env.TOKEN || 'x'}`;
const DRY = process.argv.includes('--dry');
const stores = process.argv.slice(2).filter(a => !a.startsWith('--'));

for (const store of stores) {
  const f = path.join(RESULTS, `${store}.jsonl`);
  if (!fs.existsSync(f)) { console.error(`no results for ${store}`); continue; }
  const { price, checked } = COL[store];

  const seen = new Map();              // last write wins across retry passes
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (r.outcome !== 'ok' && r.outcome !== 'no_result') continue;
    seen.set(r.id, r);
  }

  const rows = [...seen.values()].filter(r => {
    if (r.outcome !== 'ok') return true;
    const p = Number(r.price);
    return Number.isFinite(p) && p > 0 && p < 100000;   // refuse nonsense
  });

  console.log(`[${store}] ${rows.length} rows to write${DRY ? ' (dry run)' : ''}`);
  if (DRY) { console.log(JSON.stringify(rows.slice(0, 3), null, 1)); continue; }

  let ok = 0, failed = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const body = { [price]: r.outcome === 'ok' ? Number(r.price) : null, [checked]: r.ts };
    try {
      const resp = await fetch(`${BASE}/api/recommendations/${r.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: COOKIE },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });
      if (resp.ok) ok++; else { failed++; if (failed < 4) console.log(`  ${resp.status} on ${r.id} ${r.title?.slice(0,40)}`); }
    } catch (e) { failed++; if (failed < 4) console.log(`  threw on ${r.id}: ${String(e.message).slice(0,70)}`); }
    if (i % 25 === 24) process.stdout.write(`\r  ${i + 1}/${rows.length} ok:${ok} failed:${failed}   `);
    await new Promise(x => setTimeout(x, 60));   // gentle on a small instance
  }
  console.log(`\n[${store}] written ok:${ok} failed:${failed}`);
}
