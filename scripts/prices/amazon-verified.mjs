/**
 * Amazon cheapest-copy probe — CORRECTED after adversarial verification.
 * Supersedes amazon-probe.mjs. Fixes, each tied to a demonstrated defect:
 *   A) shipping UNSTATED no longer degrades to an item-only "total"
 *   B) a parse break on a healthy page is FAILED (retry), not NO_OFFER ("$-")
 *   C) Akamai bot-manager interstitial is detected as BLOCKED
 *   D) ISBN-10-only rows get an ISBN-13 echo guard instead of title-match-only
 *   E) over-generic "Looking for something?" removed from NOT_FOUND
 *
 * Statuses — never collapse them:
 *   OK                price read, item+shipping both known
 *   SHIPPING_UNSTATED item price read but Amazon did not state shipping -> NOT a total
 *   NO_OFFER          real product page that explicitly says unavailable  -> "$-"
 *   NOT_FOUND         ASIN does not exist                                 -> "$-"
 *   NO_ISBN           no ISBN and no ASIN resolved                        -> "$-"
 *   EDITION_MISMATCH  page is a different book                            -> "$-"
 *   BLOCKED / FAILED  retry later. NEVER write "$-"
 */
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

export function isbn13to10(raw) {
  const s = String(raw || '').replace(/[^0-9Xx]/g, '').toUpperCase();
  if (s.length === 10) return s;
  if (s.length !== 13 || !s.startsWith('978')) return null;
  const core = s.slice(3, 12);
  let sum = 0; for (let i = 0; i < 9; i++) sum += (10 - i) * Number(core[i]);
  const r = (11 - (sum % 11)) % 11;
  return core + (r === 10 ? 'X' : String(r));
}
/** FIX D: ISBN-10 rows can then be echo-guarded like ISBN-13 rows. */
export function isbn10to13(raw) {
  const s = String(raw || '').replace(/[^0-9Xx]/g, '').toUpperCase();
  if (s.length === 13) return s;
  if (s.length !== 10) return null;
  const core = '978' + s.slice(0, 9);
  let sum = 0; for (let i = 0; i < 12; i++) sum += (i % 2 ? 3 : 1) * Number(core[i]);
  return core + String((10 - (sum % 10)) % 10);
}

export function classify(html, status) {
  // --- BLOCKED first, always wins -----------------------------------------
  if (status === 503 || status === 429) return 'BLOCKED';
  if (/Sorry!\s*Something went wrong/i.test(html)) return 'BLOCKED';
  if (/validateCaptcha/i.test(html)) return 'BLOCKED';
  if (/To discuss automated access to Amazon data/i.test(html)) return 'BLOCKED';
  if (/Enter the characters you see below|Type the characters you see in this image/i.test(html)) return 'BLOCKED';
  // FIX C: Akamai Bot Manager interstitial — HTTP 200, ~2.5KB, none of the
  // markers above. Observed live on /s? on the FIRST request. Without this it
  // fell through to FAILED, so amazon-fill never backed off and kept hammering.
  if (/bm-verify|_sec\/verify|triggerInterstitialChallenge|akam-logo/i.test(html)) return 'BLOCKED';

  // --- genuine "this ASIN does not exist" ---------------------------------
  // FIX E: dropped /Looking for something\?/ — far too generic for a 1.9MB page.
  // Apostrophe class covers ' and &#39; and the curly '.
  if (/Dogs of Amazon/i.test(html)) return 'NOT_FOUND';
  if (/we couldn(?:'|&#39;|’)t find that page/i.test(html)) return 'NOT_FOUND';
  if (status === 404) return 'NOT_FOUND';

  if (status !== 200) return 'FAILED';
  if (!/id="productTitle"/.test(html)) return 'FAILED';   // unknown shape -> retry, never "$-"
  return null;
}

/** FIX: also accept whole-dollar amounts ("$60", "$1,234"). */
const toNum = s => {
  const m = /\$\s?([0-9][0-9,]*(?:\.[0-9]{2})?)/.exec(s || '');
  return m ? Number(m[1].replace(/,/g, '')) : null;
};
const strip = s => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;?/gi, ' ')
  .replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();

export function parseIngress(html) {
  const out = [];
  for (const a of html.match(/<a[^>]*id="aod-ingress-link"[\s\S]{0,4000}?<\/a>/gi) || []) {
    const item = toNum((/<span class="a-offscreen">([^<]*)<\/span>/.exec(a) || [])[1]);
    if (item == null) continue;
    const text = strip(a.replace(/<span class="a-price"[\s\S]*?<\/span><\/span>/i, ' | '));
    const cm = /(New\s*&\s*Used|New|Used|Renewed|Collectible)\s*\((\d+)\)\s*from/i.exec(text);
    const tail = cm ? text.slice(cm.index + cm[0].length) : text;
    let shipping = null, shipNote;
    const sm = /\+?\s*\$\s?([0-9][0-9,]*(?:\.[0-9]{2})?)\s*(?:delivery|shipping)/i.exec(tail);
    if (sm) { shipping = Number(sm[1].replace(/,/g, '')); shipNote = '$' + shipping.toFixed(2); }
    else if (/FREE\s*(Shipping|Delivery)/i.test(tail)) { shipping = 0; shipNote = 'free'; }
    else shipNote = 'UNSTATED';
    out.push({ condition: cm ? cm[1].replace(/\s+/g, ' ') : 'Unknown', count: cm ? Number(cm[2]) : null,
               item, shipping, shipNote,
               total: shipping == null ? null : Math.round((item + shipping) * 100) / 100 });
  }
  return out;
}

export function parseBuybox(html) {
  const sec = /id="(usedBuySection|corePrice_feature_div|corePriceDisplay_desktop_feature_div|apex_desktop)"[\s\S]{0,4000}?(?=<div id="|$)/i.exec(html);
  if (!sec) return null;
  const v = toNum((/id="[^"]*pricetopay-accessibility-label"[^>]*>\s*([^<]*)/i.exec(sec[0]) || [])[1])
         ?? toNum((/<span class="a-offscreen">([^<]*)<\/span>/.exec(sec[0]) || [])[1]);
  if (v == null) return null;
  return { condition: /usedBuySection/i.test(sec[1]) ? 'Used (buy box)' : 'Buy box',
           item: v, shipping: null, shipNote: 'UNSTATED', total: null };
}

const STOP = new Set(['the','a','an','of','and','in','to','on','for','with','from','its','at','by','new','edition','revised','second','third','vol','volume','series']);
export const titleTokens = s => new Set(String(s||'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ')
  .split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)));
export function titleMatch(dbTitle, pageTitle) {
  const a = titleTokens(dbTitle), b = titleTokens(pageTitle);
  if (!a.size) return { ok: true, score: 1, reason: 'no db title' };
  let hit = 0; for (const w of a) if (b.has(w)) hit++;
  return { ok: hit / a.size >= 0.5, score: Math.round(hit / a.size * 100) / 100 };
}

export async function fetchDp(asin, timeout = 30000) {
  const url = `https://www.amazon.com/dp/${asin}`;
  const res = await fetch(url, { headers: {
    'User-Agent': UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9', 'Upgrade-Insecure-Requests': '1',
  }, signal: AbortSignal.timeout(timeout) });
  return { url, status: res.status, html: await res.text() };
}

export function evaluate(html, { asin, url, status, isbn, expectTitle }) {
  const bad = classify(html, status);
  if (bad) return { asin, url, status: bad, http: status, bytes: html.length };

  const pageTitle = strip((/<title>([^<]*)<\/title>/.exec(html) || [])[1] || '').replace(/: Amazon\.com.*$/, '');
  const groups = parseIngress(html);
  const all = groups.length ? groups : ([parseBuybox(html)].filter(Boolean));

  // FIX D: guard works for ISBN-10 rows too, by normalising to ISBN-13.
  const i13 = isbn ? isbn10to13(isbn) : null;
  const isbnEcho = i13 ? html.includes(i13) : false;
  if (!isbnEcho && expectTitle) {
    const tm = titleMatch(expectTitle, pageTitle);
    if (!tm.ok) return { asin, url, status: 'EDITION_MISMATCH', pageTitle, expectTitle, score: tm.score };
  }

  if (!all.length) {
    // FIX B: only an explicit unavailability statement means NO_OFFER.
    // Anything else on a healthy page means OUR PARSER missed -> FAILED (retry).
    const unavailable = /Currently unavailable|We don(?:'|&#39;|’)t know when or if this item will be back in stock|Temporarily out of stock/i.test(html);
    return unavailable
      ? { asin, url, status: 'NO_OFFER', pageTitle, isbnEcho, note: 'explicitly unavailable' }
      : { asin, url, status: 'FAILED', pageTitle, isbnEcho, bytes: html.length,
          note: 'healthy page but no offer block parsed - markup may have changed; RETRY, do not record "$-"' };
  }

  const best = all.reduce((a, b) => (b.item < a.item ? b : a));
  // FIX A: an unknown shipping cost means we do NOT have a total. Say so.
  return {
    asin, url, status: best.total == null ? 'SHIPPING_UNSTATED' : 'OK',
    pageTitle, isbnEcho, itemPrice: best.item, shipping: best.shipping,
    shippingNote: best.shipNote, total: best.total,
    condition: best.condition, offerCount: best.count, groups: all,
  };
}

/** The ONLY value that may be written. Never invents a total. */
export function display(r) {
  if (r.status === 'OK') return r.total;
  if (['BLOCKED', 'FAILED'].includes(r.status)) return null;          // retry
  if (r.status === 'SHIPPING_UNSTATED') return null;                  // retry via browser
  return '$-';                                                         // genuinely nothing to buy
}

export async function lookupByIsbn(isbn, expectTitle) {
  const asin = isbn13to10(isbn);
  if (!asin) return { status: 'NO_ISBN', note: '979-prefix ISBN has no ISBN-10/ASIN' };
  const { url, status, html } = await fetchDp(asin);
  return evaluate(html, { asin, url, status, isbn, expectTitle });
}
