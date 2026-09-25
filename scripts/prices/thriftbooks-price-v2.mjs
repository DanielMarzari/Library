/**
 * ThriftBooks cheapest-USED price — CORRECTED after adversarial verification.
 *
 * Fixes over thriftbooks-price.mjs (both were demonstrated live, see notes):
 *  FIX 1  ISBN path now TITLE-VERIFIES. The old ISBN guard only checked that the
 *         edition it priced carried the ISBN we asked for. That is vacuous: the
 *         redirect is BUILT from the ISBN, so it always passes. When the DB's ISBN
 *         is wrong for the DB's title, the old recipe returned a confident price
 *         for a different book.
 *         Live proof: row "Atonement and the Logic of Resurrection in the Epistle
 *         to the Hebrews" (Moffitt) carries ISBN 9781540966230, which is actually
 *         "Rethinking the Atonement". Old recipe -> $27.49 (wrong book).
 *         Truth for the real book: no used copies at all -> "$-".
 *  FIX 2  Cheapest USED is now taken ACROSS EDITIONS of the work, not just the one
 *         edition the search/redirect happened to land on.
 *         Live proof: /w/witnessing-without-fear_bill-bright/312071/ serves two
 *         editions; active had CheapestUsedPrice 7.99, the other 7.09.
 *         Old recipe -> $10.38. True cheapest -> $9.48.
 *
 * Outcome is ALWAYS one of 'ok' | 'not_found' | 'failed'. Never conflate them.
 * No generic /\$\d+\.\d\d/ regex anywhere — every number comes from a named field.
 */

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const BASE = 'https://www.thriftbooks.com';
// Verified verbatim on the work page itself: "Free Shipping on all orders over $20."
const FREE_SHIP_THRESHOLD = 20.00;
const FLAT_SHIPPING = 2.39;   // /shipping-costs/: "Orders Under $20: $2.39 per item" (non-member, US)

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function headers(referer) {
  const h = { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9',
              'Accept': 'application/json, text/javascript, */*; q=0.01' };
  if (referer) h['Referer'] = referer;
  return h;
}

export function parseSearchStore(html) {
  const i = html.indexOf('window.searchStoreV2');
  if (i < 0) return null;
  const j = html.indexOf('{', i);
  if (j < 0) return null;
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let k = j; k < html.length; k++) {
    const ch = html[k];
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { end = k; break; } }
  }
  if (end < 0) return null;
  try { return JSON.parse(html.slice(j, end + 1)); } catch { return null; }
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const ROLE_WORDS = new Set(['editor','editors','ed','eds','trans','translator','translators','author','authors','compiler','general','contributor','et','al','jr','sr','phd','dr']);
const authorTokens = (a) => norm(a).split(' ').filter(w => w.length >= 4 && !ROLE_WORDS.has(w));

// Stopwords MUST be removed before measuring title overlap. Without this,
// "and"/"the"/"new" alone carried the wrong Moffitt book to 0.57 coverage --
// enough to clear a 0.55 bar and be accepted as the right book.
const STOP = new Set(['the','and','for','with','from','that','this','its','was','are','our','all','how','new','who','but','not','out','has','had','his','her','their','than','into','upon','under','over','more','some','one','two','vol','volume','edition','revised','expanded','updated','second','third','first']);

/** Strip series/edition parentheticals the store never repeats, then take the pre-subtitle core. */
const coreTokens = (t) => {
  const stripped = String(t || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s*\[[^\]]*\]\s*/g, ' ');
  const core = norm(stripped.split(/\s*[:;]\s*/)[0]);
  return new Set(core.split(' ').filter(w => w.length > 2 && !STOP.has(w)));
};
const allTokens = (t) => new Set(norm(String(t || '').replace(/\s*\([^)]*\)\s*/g, ' ')).split(' ').filter(w => w.length > 2 && !STOP.has(w)));

const overlap = (want, got) => { if (!want.size) return 0; let h = 0; for (const t of want) if (got.has(t)) h++; return h / want.size; };

export function titleCoverage(ours, theirs) { return overlap(coreTokens(ours), allTokens(theirs)); }

/**
 * FIX 1. Does the book the store gave us plausibly match the row we asked about?
 * Two-way overlap: `cover` = our core title tokens found in theirs (catches "they
 * gave us a different book"), `reverse` = their core tokens found in ours (catches
 * "our short title is a substring of a longer unrelated title").
 * An author agreement can rescue a partly-truncated title, but never a title that
 * shares almost nothing -- the Moffitt case shares the author and is still wrong.
 */
export function verifyIdentity({ title, author }, storeTitle, storeAuthors) {
  const cover   = overlap(coreTokens(title), allTokens(storeTitle));
  const reverse = overlap(coreTokens(storeTitle), allTokens(title));
  const wantA = authorTokens(author);
  const names = (storeAuthors || []).map(a => norm(typeof a === 'string' ? a : a.authorName || a.Name || '')).join(' | ');
  const authorOk = wantA.length > 0 && !!names && wantA.some(t => names.includes(t));
  const titleOk = cover >= 0.85 || (cover >= 0.55 && authorOk);
  const ok = titleOk && reverse >= 0.5;
  return { ok, cover: +cover.toFixed(2), reverse: +reverse.toFixed(2), authorOk, storeTitle };
}

export function pickWork(store, { title, author }) {
  let best = null;
  for (const w of store.works) {
    if (!(w.availableCopies > 0)) continue;
    const v = verifyIdentity({ title, author }, w.title, w.authors);
    if (!v.ok) continue;
    const score = v.cover + (v.authorOk ? 0.5 : 0);
    if (!best || score > best.score) best = { score, cover: v.cover, reverse: v.reverse, authorOk: v.authorOk, w };
  }
  return best;
}

export async function resolveWork(query, { timeout = 20000 } = {}) {
  const url = `${BASE}/browse/?b.search=${encodeURIComponent(query)}`;
  let res;
  try {
    res = await fetch(url, { redirect: 'manual', headers: { ...headers(), Accept: 'text/html' }, signal: AbortSignal.timeout(timeout) });
  } catch (e) { return { status: 'failed', reason: `browse fetch error: ${e.message}`, url }; }

  if ([403, 429, 503].includes(res.status)) return { status: 'failed', reason: `blocked http ${res.status}`, url };
  if (res.status >= 500) return { status: 'failed', reason: `server http ${res.status}`, url };

  if (res.status === 301 || res.status === 302) {
    const loc = res.headers.get('location') || '';
    const m = loc.match(/\/w\/[^/]+\/(\d+)\/item\/?(?:#edition=(\d+))?/);
    if (!m) {
      if (/\/browse|\/search/.test(loc)) return { status: 'not_found', reason: `redirected back to browse: ${loc}`, url };
      return { status: 'failed', reason: `unparseable redirect: ${loc}`, url };
    }
    return { status: 'ok', workId: m[1], idAmazon: m[2] || null, workUrl: BASE + loc.split('#')[0], url };
  }

  if (res.status === 200) {
    const html = await res.text();
    // Genuine zero-result pages are still ~450KB (verified on the Weinfeld query),
    // so a small body really is an interstitial, not an empty result.
    if (html.length < 20000) return { status: 'failed', reason: `tiny 200 body (${html.length}B) - likely challenge/interstitial`, url };
    if (/captcha|are you a robot|access denied|unusual traffic|request blocked/i.test(html.slice(0, 30000)))
      return { status: 'failed', reason: 'challenge/captcha page', url };
    const store = parseSearchStore(html);
    if (!store) return { status: 'failed', reason: `200 page but window.searchStoreV2 missing/unparseable (${html.length}B)`, url };
    if (store.isZeroResultSearch === true || store.totalResults === 0 || !Array.isArray(store.works) || store.works.length === 0)
      return { status: 'not_found', reason: `zero results (totalResults=${store.totalResults}, isZeroResultSearch=${store.isZeroResultSearch})`, url, store };
    return { status: 'search_results', url, store };
  }
  return { status: 'failed', reason: `unexpected http ${res.status}`, url };
}

export async function fetchWorkInfo(workId, idAmazon, workUrl, { timeout = 20000 } = {}) {
  const body = new URLSearchParams({ workId: String(workId), IdAmazon: String(idAmazon ?? 0), cartId: '0' });
  let res, json;
  try {
    res = await fetch(`${BASE}/stateless/editions/workinfo`, {
      method: 'POST',
      headers: { ...headers(workUrl), 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
      body, signal: AbortSignal.timeout(timeout),
    });
  } catch (e) { return { status: 'failed', reason: `workinfo fetch error: ${e.message}` }; }
  if ([403, 429, 503].includes(res.status)) return { status: 'failed', reason: `blocked http ${res.status}` };
  if (!res.ok) return { status: 'failed', reason: `workinfo http ${res.status}` };
  const text = await res.text();
  try { json = JSON.parse(text); }
  catch { return { status: 'failed', reason: `workinfo non-JSON (${text.length}B, starts "${text.slice(0, 60)}")` }; }
  if (json.Error) return { status: 'failed', reason: `workinfo Error: ${json.Message}` };
  const AE = json?.Work?.ActiveEdition;
  if (!AE) return { status: 'failed', reason: 'workinfo missing Work.ActiveEdition (schema changed)' };
  return { status: 'ok', work: json.Work, edition: AE };
}

/**
 * Cheapest genuinely-buyable USED copy on ONE edition.
 * 0 in these fields means "none exists", NOT "free" — never write it as a price.
 */
export function cheapestUsed(edition) {
  let price = (typeof edition.CheapestUsedPrice === 'number' && edition.CheapestUsedPrice > 0) ? edition.CheapestUsedPrice : null;
  const used = (edition.Copies || []).filter(c =>
    c.Quality !== 'New' && c.AvailableQuantity > 0 && !c.IsBackorder && typeof c.Price === 'number' && c.Price > 0);
  const fromCopies = used.length ? Math.min(...used.map(c => c.Price)) : null;
  // Trust the cheaper of the two rather than the field alone: a stale
  // CheapestUsedPrice above a real Copies[] row would otherwise overcharge.
  if (price == null) price = fromCopies;
  else if (fromCopies != null && fromCopies < price) price = fromCopies;
  const copy = used.find(c => c.Price === price) || null;
  return { price, fromCopies, field: edition.CheapestUsedPrice, copy, usedCount: used.length, hasUsed: !!edition.HasUsedCopies };
}

export function displayPrice(r) {
  if (r.outcome === 'ok') return `$${r.total.toFixed(2)}`;
  if (r.outcome === 'not_found') return '$-';
  return null;   // 'failed' -> leave the cell alone, requeue
}

export async function lookup(book, { maxEditionProbes = 2, onRequest } = {}) {
  const { title, author } = book;
  const rawIsbn = String(book.isbn || '').replace(/[- ]/g, '');
  const hasIsbn = /^\d{9,12}[\dXx]$/.test(rawIsbn);
  let workId, idAmazon, workUrl, via, identity = null, isbnRejected = null;

  async function fromSearch() {
    // Strip series/edition parentheticals before searching. Live proof: searching
    // "Atonement and the Logic of Resurrection in the Epistle to the Hebrews
    //  (Supplements to Novum Testamentum, 141) David M. Moffitt" returns
    // totalResults 0; the same query without the parenthetical returns exactly 1
    // perfect match. The original recipe searched the raw title and would emit a
    // false "$-" for every row carrying a series suffix.
    const cleanTitle = String(title || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s*\[[^\]]*\]\s*/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanAuthor = String(author || '').replace(/\b(editor|editors|eds?|trans|translator|translators|general editor|compiler)\b\.?/gi, ' ').replace(/\s+/g, ' ').trim();
    const q = [cleanTitle, cleanAuthor].filter(Boolean).join(' ');
    if (!q.trim()) return { status: 'failed', reason: 'no title to search' };
    if (onRequest) onRequest(q);
    const r = await resolveWork(q);
    if (r.status === 'failed' || r.status === 'not_found') return r;
    const picked = pickWork(r.store, { title, author });
    if (!picked) return { status: 'not_found',
      reason: `search returned ${r.store.totalResults} result(s), none matched (top: ${JSON.stringify(r.store.works.slice(0,3).map(w=>w.title))})` };
    return { status: 'ok', workId: picked.w.idWork, idAmazon: picked.w.idAmazon,
             workUrl: `${BASE}/w/${picked.w.workUrl}/${picked.w.idWork}/item/`,
             identity: { cover: picked.cover, reverse: picked.reverse, authorOk: picked.authorOk, storeTitle: picked.w.title }, via: 'search' };
  }

  if (hasIsbn) {
    const r = await resolveWork(rawIsbn);
    if (r.status === 'failed') return { outcome: 'failed', reason: r.reason, query: rawIsbn };
    if (r.status === 'ok') { ({ workId, idAmazon, workUrl } = r); via = 'isbn-redirect'; }
    // An unknown ISBN does not 404 — it lands on the 200 grid or a zero-result page.
    else { const s = await fromSearch();
           if (s.status !== 'ok') return { outcome: s.status === 'failed' ? 'failed' : 'not_found', reason: `isbn did not resolve; ${s.reason}`, query: rawIsbn };
           ({ workId, idAmazon, workUrl, identity, via } = s); }
  } else {
    const s = await fromSearch();
    if (s.status !== 'ok') return { outcome: s.status === 'failed' ? 'failed' : 'not_found', reason: s.reason, query: [title, author].join(' ') };  // eslint-disable-line
    ({ workId, idAmazon, workUrl, identity, via } = s);
  }

  await sleep(400 + Math.random() * 400);
  let w = await fetchWorkInfo(workId, idAmazon, workUrl);
  if (w.status === 'failed') return { outcome: 'failed', reason: w.reason, workUrl };

  // ---- FIX 1: the ISBN gave us A book; prove it is OUR book. ----
  if (via === 'isbn-redirect') {
    const v = verifyIdentity({ title, author }, w.work.Title, w.work.Authors || []);
    if (!v.ok) {
      isbnRejected = { storedIsbn: rawIsbn, resolvedTo: w.work.Title, cover: v.cover };
      const s = await fromSearch();            // the ISBN is bad data — try the title instead
      if (s.status !== 'ok') return {
        outcome: s.status === 'failed' ? 'failed' : 'not_found',
        reason: `stored ISBN ${rawIsbn} resolves to a different book ("${w.work.Title}"); title fallback: ${s.reason}`,
        isbnRejected, workUrl };
      ({ workId, idAmazon, workUrl, identity, via } = s); via = 'search-after-isbn-mismatch';
      await sleep(400 + Math.random() * 400);
      w = await fetchWorkInfo(workId, idAmazon, workUrl);
      if (w.status === 'failed') return { outcome: 'failed', reason: w.reason, isbnRejected, workUrl };
    } else identity = v;
  }

  // ---- FIX 2: cheapest USED across the work's editions, not just the active one. ----
  const AE = w.edition;
  let best = cheapestUsed(AE);
  let bestEdition = { idAmazon: AE.IdAmazon, isbn13: AE.ISBN13, media: AE.Media, active: true };
  const editionsProbed = [];

  // PopularEditions carries HasUsedCopies / AvailableCopies / LowestPrice per edition
  // for free. LowestPrice is the min across ALL conditions, so it is only a lower
  // bound on the used price — use it to RANK candidates, never as the answer.
  const candidates = (w.work.PopularEditions || [])
    .filter(e => e.IdAmazon !== AE.IdAmazon && e.HasUsedCopies === true && e.AvailableCopies > 0)
    .filter(e => best.price == null || !(e.LowestPrice > 0) || e.LowestPrice < best.price)
    .sort((a, b) => (a.LowestPrice || 1e9) - (b.LowestPrice || 1e9))
    .slice(0, maxEditionProbes);

  for (const e of candidates) {
    await sleep(400 + Math.random() * 400);
    const w2 = await fetchWorkInfo(workId, e.IdAmazon, workUrl);
    if (w2.status !== 'ok') { editionsProbed.push({ idAmazon: e.IdAmazon, error: w2.reason }); continue; }
    const c = cheapestUsed(w2.edition);
    editionsProbed.push({ idAmazon: e.IdAmazon, isbn13: w2.edition.ISBN13, price: c.price, quality: c.copy?.Quality ?? null });
    if (c.price != null && (best.price == null || c.price < best.price)) {
      best = c;
      bestEdition = { idAmazon: w2.edition.IdAmazon, isbn13: w2.edition.ISBN13, media: w2.edition.Media, active: false };
    }
  }

  const base = { via, identity, isbnRejected, workUrl, workId,
                 matchedTitle: w.work.Title, edition: bestEdition, editionsProbed,
                 listPrice: AE.ListPrice || null, cheapestNew: AE.CheapestNewPrice || null,
                 availableCopies: AE.AvailableCopies, usedCopyCount: best.usedCount };

  if (best.price == null) {
    // ThriftBooks sells new copies as well as used. A book with no second-hand
    // copy but a new one in stock IS available there, and calling that "$-"
    // answers the wrong question: the shelf asks what the book costs at this
    // store, not what a used one costs. Fall back to the new price and say so.
    const nw = (AE.HasNewCopies && typeof AE.CheapestNewPrice === 'number' && AE.CheapestNewPrice > 0)
      ? AE.CheapestNewPrice : null;
    if (nw != null) {
      const ship = nw >= FREE_SHIP_THRESHOLD ? 0 : FLAT_SHIPPING;
      return { outcome: 'ok', itemPrice: nw, condition: 'New', shipping: ship,
               total: +(nw + ship).toFixed(2), freeShipping: nw >= FREE_SHIP_THRESHOLD, ...base };
    }
    return { outcome: 'not_found',
      reason: `no copy in stock, new or used (HasUsedCopies=${best.hasUsed}, HasNewCopies=${AE.HasNewCopies}, AvailableCopies=${AE.AvailableCopies}, editionsProbed=${editionsProbed.length})`, ...base };
  }

  const item = best.price;
  const shipping = item >= FREE_SHIP_THRESHOLD ? 0 : FLAT_SHIPPING;
  return { outcome: 'ok', itemPrice: item, condition: best.copy?.Quality ?? null,
           shipping, total: +(item + shipping).toFixed(2), freeShipping: item >= FREE_SHIP_THRESHOLD, ...base };
}

export async function runBatch(books, { concurrency = 2, gapMs = 1200, onResult } = {}) {
  const out = []; let i = 0, consecutiveFailed = 0;
  const worker = async () => {
    while (i < books.length) {
      const b = books[i++];
      let r;
      try { r = await lookup(b); } catch (e) { r = { outcome: 'failed', reason: `uncaught: ${e.message}` }; }
      r.book = b; out.push(r); onResult?.(r);
      if (r.outcome === 'failed') { if (++consecutiveFailed >= 5) throw new Error('5 consecutive failures — recipe broke, aborting batch'); }
      else consecutiveFailed = 0;
      await sleep(gapMs + Math.random() * gapMs);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return out;
}
