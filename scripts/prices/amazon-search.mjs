// Amazon lookup for the 867 recommendations that have no ISBN.
//
// The cheap /dp/<ASIN> path needs an ASIN, and without an ISBN the only way to
// get one is Amazon's search — which sits behind an Akamai interstitial for
// plain fetch, on the very first request. So the search leg goes through real
// Chrome; once we have an ASIN, the price still comes from the verified
// /dp/ evaluator, which already knows how to tell a bot wall from an
// out-of-print book.
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { evaluate, fetchDp, titleMatch, classify } from './amazon-verified.mjs';
import { cleanTitle } from './lib.mjs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// A dedicated profile dir per run. Sharing one with an already-running Chrome
// (or a stale lock from an earlier process) makes page.goto resolve to null,
// which surfaced as a mystifying "search http 0" on every single row.
const PROFILE = path.join(process.env.PRICES_DIR || path.join(process.cwd(), '.prices'), 'chrome-profile');

let browser = null, page = null;

const EDITORIAL = /\b(editor|editors|eds?|translator|trans|compiler|foreword|introduction|general|ed)\b/gi;
/**
 * The search path has no ISBN to pin identity, so the author has to carry its
 * share. Absent a usable surname we do NOT wave the row through — we say so and
 * let the caller treat it as unmatched.
 */
function authorAgrees(dbAuthor, byline) {
  const cleaned = String(dbAuthor || '').replace(EDITORIAL, ' ').replace(/[^A-Za-z\s]/g, ' ').trim();
  const parts = cleaned.split(/\s+/).filter(w => w.length > 2);
  if (!parts.length) return false;
  const surname = parts[parts.length - 1].toLowerCase();
  return String(byline || '').toLowerCase().includes(surname);
}

export async function open() {
  if (browser) return;
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    userDataDir: PROFILE,
    args: ['--window-size=1440,900', '--disable-blink-features=AutomationControlled', '--no-first-run', '--no-default-browser-check'],
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
  await page.setRequestInterception(true);
  // Images/fonts/media only. Blocking stylesheets too was enough to make the
  // search page fail to resolve.
  page.on('request', r => (['image', 'font', 'media'].includes(r.resourceType()) ? r.abort() : r.continue()));
}

export async function close() { if (browser) { await browser.close(); browser = null; page = null; } }

/**
 * Search leg. Returns {asin, foundTitle} for the first result that plausibly
 * matches, or a status. A search that returns results none of which match is
 * NOT_FOUND — Amazon happily returns something for almost any query, so an
 * unverified first hit is exactly how you get the wrong book's price.
 */
export async function findAsin(title, author) {
  const q = `${cleanTitle(title)} ${author || ''}`.trim();
  const url = `https://www.amazon.com/s?k=${encodeURIComponent(q)}&i=stripbooks`;
  // page.goto returns null for navigations Chrome treats as same-document, which
  // happens from the second search onward here. The response object is therefore
  // not a reliable signal — judge the page by what actually rendered instead,
  // and only trust a status code when we genuinely got one.
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const status = resp ? resp.status() : null;
  await page.waitForSelector('div[data-component-type="s-search-result"], .s-no-outline, [data-cy="no-results"]', { timeout: 15000 }).catch(() => {});
  const html = await page.content();

  const blocked = classify(html, status ?? 200);
  if (blocked === 'BLOCKED') return { status: 'BLOCKED' };
  if (status != null && status !== 200) return { status: 'FAILED', reason: `search http ${status}` };
  if (html.length < 20000) return { status: 'FAILED', reason: `search page only ${html.length} bytes` };

  const hits = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('div[data-asin][data-component-type="s-search-result"]')) {
      const asin = el.getAttribute('data-asin');
      if (!asin) continue;
      const h = el.querySelector('h2 span, h2 a span, [data-cy="title-recipe"] span');
      const by = el.querySelector('[data-cy="title-recipe"] + div, .a-row .a-size-base+.a-size-base, .s-title-instructions-style + div');
      out.push({ asin, title: h ? h.textContent.trim() : '', byline: by ? by.textContent.trim() : '' });
      if (out.length >= 5) break;
    }
    return out;
  });

  if (hits.length === 0) {
    // No result cards at all. Amazon says so in words; anything else is a shape
    // we don't recognise, and an unrecognised shape must never become "$-".
    if (/no results for|did not match any products/i.test(html)) return { status: 'NOT_FOUND' };
    return { status: 'FAILED', reason: 'no result cards and no empty-search marker' };
  }

  // titleMatch returns {ok, score} — an object, and therefore ALWAYS truthy.
  // Using it directly as a predicate accepted the first search result every
  // time: it matched '"Son of Man": Early Jewish Literature' to "The Son of
  // Man: A Novel". Read .ok, and demand more than the /dp/ path does — there
  // an ISBN already pinned the identity, here nothing does.
  const scored = hits.map(h => ({ ...h, m: titleMatch(title, h.title) }));
  const match = scored.find(h => h.m.ok && h.m.score >= 0.75 && authorAgrees(author, h.byline));
  if (!match) {
    const top = scored[0];
    return { status: 'NOT_FOUND', reason: `${hits.length} results, none matched (top: ${JSON.stringify(top.title.slice(0, 70))} score ${top.m.score})` };
  }
  return { status: 'OK', asin: match.asin, foundTitle: match.title, score: match.m.score };
}

/** Full no-ISBN lookup: search for the ASIN, then price it through /dp/. */
export async function lookupByTitle(title, author) {
  const s = await findAsin(title, author);
  if (s.status !== 'OK') return s;
  const { url, status, html } = await fetchDp(s.asin);
  const r = evaluate(html, { asin: s.asin, url, status, isbn: null, expectTitle: title });
  return { ...r, asin: s.asin, searchTitle: s.foundTitle };
}
