/**
 * AbeBooks cheapest-TOTAL price probe.
 *
 * Outcomes are STRICTLY three-way:
 *   { status: 'OK',        total, item, shipping, ... }   -> write the number
 *   { status: 'NO_RESULT', reason }                        -> write "$-"  (no copy for sale)
 *   { status: 'FAILED',    reason }                        -> write NOTHING, retry later
 *
 * Usage:
 *   node abebooks-price.mjs --isbn 9781632960764
 *   node abebooks-price.mjs --title "..." --author "..."
 *   node abebooks-price.mjs --db /path/prod.db --limit 5 --delay 4000
 *   node abebooks-price.mjs --file html/foo.html --expect-isbn 9781632960764
 */

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const BASE = 'https://www.abebooks.com/servlet/SearchResults';
const SEP = String.fromCharCode(31); // unit separator, for sqlite output splitting

export function isbnUrl(isbn) {
  return BASE + '?isbn=' + encodeURIComponent(isbn) + '&sortby=17';
}
export function keywordUrl(title, author) {
  return BASE + '?kn=' + encodeURIComponent(cleanQuery(title, author)) + '&sortby=17';
}

/** Strip junk that breaks AbeBooks' AND-matching on kn=. */
export function cleanQuery(title, author) {
  const t = String(title || '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\((?:19|20)\d\d\)/g, ' ')
    .replace(/[‘’“”]/g, ' ')
    .replace(/[(),:;.\-–—/&]/g, ' ')
    .replace(/\b(paperback|hardcover|hardback|softcover|volume|vol|edition|ed|series|set|by)\b/gi, ' ')
    .replace(/\s+/g, ' ').trim();
  const tTok = t.split(' ').filter(w => w.length > 1).slice(0, 10);
  const a = String(author || '')
    .replace(/\b(editor|editors|eds?|translator|trans|general|gen)\b\.?/gi, ' ')
    .replace(/[(),.;]/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const aTok = a.split(' ').filter(w => w.length > 1).slice(0, 3);
  return tTok.concat(aTok).join(' ');
}

// ---------------------------------------------------------------- page shape

const RE_SRP_LIST   = /data-test-id="srp-search-results-list"/;
const RE_ITEM_PRICE = /data-test-id="item-price-0"/;
const RE_CLOSEST    = /data-test-id="closest-match-item"/;
const RE_UNABLE     = /We were unable to find exact matches/i;
const RE_RESULTCNT  = /data-test-id="result-count"[^>]*>\s*\(([\d,]+) results?\)/;

/** Blocked / throttled / bot-walled. Checked BEFORE no-result, so a block is never a "$-". */
const stripScripts = h => h.replace(/<script[\s\S]*?<\/script>/g, ' ');

export function blockSignal(status, html) {
  if (status === 0) return 'no_response';
  if (status === 429 || status === 503) return 'http_' + status;
  if (status >= 500) return 'http_' + status;
  if (status === 403) return 'http_403';
  if (!html || html.length < 20000) return 'body_too_small';
  // Every AbeBooks page ships an i18n dictionary inside <script> that literally contains
  // "Sorry... Something went wrong", "No results", "Enter the characters you see below".
  // Testing those against raw HTML flags EVERY page as blocked. Test the body only.
  const body = stripScripts(html);
  if (/Sorry\.{0,3}\s*Something went wrong/i.test(body)) return 'abe_error_page';
  if (/Enter the characters you see below|Type the characters you see in this image/i.test(body)) return 'captcha';
  if (/To discuss automated access to Amazon data|Robot Check/i.test(body)) return 'bot_wall';
  return null;
}

// ---------------------------------------------------------------- parse

const stripTags = s => s.replace(/<[^>]+>/g, ' ').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const money = s => { const m = /US\$\s*([\d,]+(?:\.\d{1,2})?)/.exec(s); return m ? parseFloat(m[1].replace(/,/g, '')) : null; };

function jsonLdItems(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    let d; try { d = JSON.parse(m[1]); } catch { continue; }
    if (d && d['@type'] === 'ItemList' && Array.isArray(d.itemListElement)) {
      for (const e of d.itemListElement) {
        const it = e.item || {};
        const off = it.offers || {};
        out[(e.position | 0) - 1] = {
          name: it.name || '',
          author: (it.author && it.author.name) || '',
          isbn: String(it.isbn || off.gtin13 || ''),
          ldPrice: off.price != null ? Number(off.price) : null,
          condition: /New/i.test(off.itemCondition || '') ? 'New' : 'Used',
          url: off.url || null,
          seller: (off.seller && off.seller.name) || null,
        };
      }
    }
  }
  return out;
}

/** Every listing on the SRP with item price, shipping, and total. */
export function parseListings(html) {
  const ld = jsonLdItems(html);
  const rows = [];
  for (let n = 0; ; n++) {
    const pm = new RegExp('data-test-id="item-price-' + n + '"[^>]*>([\\s\\S]{0,400}?)</p>').exec(html);
    if (!pm) break;
    const item = money(stripTags(pm[1]));

    // Shipping: take a generous window, strip tags, THEN read - the free-shipping
    // icon is an inline <svg> that eats small windows.
    let shipping = null, shipText = '';
    const si = html.indexOf('data-test-id="item-shipping-price-' + n + '"');
    if (si !== -1) {
      shipText = stripTags(html.slice(si, si + 2500)).slice(0, 200);
      if (/free shipping/i.test(shipText)) shipping = 0;
      else {
        const sm = /US\$\s*([\d,]+(?:\.\d{1,2})?)\s*shipping/i.exec(shipText);
        if (sm) shipping = parseFloat(sm[1].replace(/,/g, ''));
      }
    }
    const meta = ld[n] || {};
    rows.push(Object.assign({
      idx: n, item, shipping, shipText,
      total: (item != null && shipping != null) ? Math.round((item + shipping) * 100) / 100 : null,
    }, meta));
  }
  return rows;
}

// ---------------------------------------------------------------- guard

const STOP = new Set(['the','a','an','of','and','or','in','on','to','for','with','its','is','how','from','by','at','as']);
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const toks = s => norm(s).split(' ').filter(w => w && !STOP.has(w));

/**
 * The library's titles carry series/edition tails that AbeBooks drops, e.g.
 *   DB:  "The Epistle to the Hebrews (The New International Commentary on the New Testament)"
 *   Abe: "The Epistle to the Hebrews"
 * Scoring the FULL string gives overlap 0.33 and falsely rejects a correct match.
 * So score the core title (before the first "(" / "[" / ":") as well, and take the best.
 */
export function coreTitle(title) {
  const s = String(title || '');
  const cut = s.split(/[(\[]/)[0].trim();
  return cut.length >= 8 ? cut : s;
}

/** Does this listing plausibly BE the book we asked for? */
export function matchScore(row, title, author) {
  const got = new Set(toks(row.name).concat(toks(row.author)));
  const score = t => {
    const want = toks(t);
    return want.length ? want.filter(w => got.has(w)).length / want.length : 0;
  };
  const full = score(title);
  const core = score(coreTitle(title));
  const head = score(coreTitle(title).split(':')[0]);
  const overlap = Math.max(full, core, head);

  const aTok = toks(author).filter(w => w.length > 2);
  const surname = aTok.length ? aTok[aTok.length - 1] : null;
  const gotAuthor = new Set(toks(row.author));
  const authorOk = surname ? gotAuthor.has(surname) : false;

  return {
    overlap: Math.round(overlap * 100) / 100,
    full: Math.round(full * 100) / 100,
    authorOk,
    ok: (overlap >= 0.6 && authorOk) || overlap >= 0.85,
  };
}

/** Best-matching listing among the first `n`, so a stray row 0 doesn't sink a good page. */
export function bestMatch(rows, title, author, n) {
  let best = null;
  for (const r of rows.slice(0, n || 5)) {
    const s = matchScore(r, title, author);
    if (!best || s.overlap > best.s.overlap || (s.overlap === best.s.overlap && s.authorOk && !best.s.authorOk)) {
      best = { row: r, s };
    }
  }
  return best;
}

// ---------------------------------------------------------------- classify

export function classify(html, httpStatus, opts) {
  opts = opts || {};
  const blocked = blockSignal(httpStatus, html);
  if (blocked) return { status: 'FAILED', reason: 'blocked:' + blocked };

  // invalid-ISBN bounce: /servlet/SearchEntry?errorcode=10
  if (opts.finalUrl && /\/servlet\/SearchEntry\?errorcode=/.test(opts.finalUrl)) {
    return { status: 'NO_RESULT', reason: 'invalid_isbn_rejected' };
  }
  // NOTE: the literal string "We were unable to find exact matches" is present in the
  // i18n dictionary inside <script> on EVERY page, including successful ones. Only test
  // it against script-stripped markup; the real discriminator is closest-match-item.
  if (RE_CLOSEST.test(html) || RE_UNABLE.test(html.replace(/<script[\s\S]*?<\/script>/g, ''))) {
    return { status: 'NO_RESULT', reason: 'closest_match_page' };
  }
  if (!RE_SRP_LIST.test(html) || !RE_ITEM_PRICE.test(html)) {
    return { status: 'FAILED', reason: 'unrecognised_page_shape' };
  }

  let rows = parseListings(html);
  if (!rows.length) return { status: 'FAILED', reason: 'no_listings_parsed' };

  const rc = RE_RESULTCNT.exec(html);
  const resultCount = rc ? rc[1] : null;

  // Wrong-book guards.
  let sanity = null;
  if (opts.expectIsbn) {
    const want = String(opts.expectIsbn).replace(/[^0-9Xx]/g, '');
    const withIsbn = rows.filter(r => r.isbn);
    if (withIsbn.length && !withIsbn.some(r => r.isbn === want)) {
      return { status: 'NO_RESULT', reason: 'isbn_mismatch', got: withIsbn[0].isbn };
    }
    // The ISBN matched, but the DB's ISBN may itself be wrong for this title
    // (seen in prod: "Leviticus (Tyndale OTC)" carries an ISBN that resolves to
    // an unrelated "Leviticus Bible Study"). Flag it; reject only when nothing lines up.
    if (opts.title) {
      const s = matchScore(rows[0], opts.title, opts.author);
      sanity = { titleOverlap: s.overlap, authorOk: s.authorOk };
      if (s.overlap < 0.34 && !s.authorOk) {
        return { status: 'NO_RESULT', reason: 'isbn_resolves_to_other_book',
                 overlap: s.overlap, got: rows[0].name, gotAuthor: rows[0].author };
      }
    }
  }
  if (opts.guard && opts.title) {
    const b = bestMatch(rows, opts.title, opts.author, 8);
    if (!b || !b.s.ok) {
      return { status: 'NO_RESULT', reason: 'title_author_mismatch',
               overlap: b ? b.s.overlap : 0, authorOk: b ? b.s.authorOk : false,
               got: b ? b.row.name : null, gotAuthor: b ? b.row.author : null };
    }
    sanity = { titleOverlap: b.s.overlap, authorOk: b.s.authorOk, matchedIdx: b.row.idx };
    // A kn= page can mix several works. Only price listings of the work we matched,
    // so we never hand back a cheap unrelated book off the same results page.
    const anchor = b.row.isbn;
    const same = rows.filter(r => (anchor && r.isbn === anchor) || matchScore(r, opts.title, opts.author).ok);
    if (same.length) rows = same;
  }

  if (opts.usedOnly) {
    const used = rows.filter(r => r.condition === 'Used');
    if (!used.length) return { status: 'NO_RESULT', reason: 'no_used_copies' };
    rows = used;
  }

  const priced = rows.filter(r => r.total != null);
  if (!priced.length) {
    // prices present but every shipping cell unreadable -> parser broke, NOT "unavailable"
    return { status: 'FAILED', reason: 'shipping_unparsed', sample: rows[0].shipText };
  }
  // Do not trust the sort blindly - take the real min.
  const best = priced.reduce((a, b) => (b.total < a.total ? b : a));
  const idx0 = priced[0];

  return {
    status: 'OK',
    total: best.total, item: best.item, shipping: best.shipping,
    condition: best.condition, seller: best.seller, isbn: best.isbn,
    matchedTitle: best.name, matchedAuthor: best.author, url: best.url,
    chosenIdx: best.idx, idx0Total: idx0.total, sortWasCorrect: best.idx === idx0.idx,
    resultCount: resultCount, listingsParsed: rows.length, sanity: sanity,
  };
}

// ---------------------------------------------------------------- fetch

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function fetchPage(url, o) {
  o = o || {};
  const timeoutMs = o.timeoutMs || 25000;
  const retries = o.retries == null ? 2 : o.retries;
  let last;
  for (let a = 0; a <= retries; a++) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ac.signal, redirect: 'follow',
        headers: {
          'User-Agent': UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document', 'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none', 'Sec-Fetch-User': '?1',
        },
      });
      const html = await res.text();
      const b = blockSignal(res.status, html);
      if (b && a < retries) { last = b; await sleep(60000 * (a + 1)); continue; } // 60s, 120s
      return { html: html, status: res.status, finalUrl: res.url };
    } catch (e) {
      last = e.name === 'AbortError' ? 'timeout' : e.message;
      if (a < retries) await sleep(5000 * (a + 1));
    } finally { clearTimeout(t); }
  }
  return { html: '', status: 0, finalUrl: url, netError: last };
}

/** One book -> one outcome. */
export async function lookup(book) {
  const usedOnly = !!book.usedOnly;
  const rawIsbn = String(book.isbn || '').replace(/[^0-9Xx]/g, '');
  if (rawIsbn && /^(\d{9}[\dXx]|\d{13})$/.test(rawIsbn)) {
    const url = isbnUrl(rawIsbn);
    const r = await fetchPage(url);
    if (r.netError) return { status: 'FAILED', reason: 'net:' + r.netError, url: url, via: 'isbn' };
    const out = classify(r.html, r.status, { expectIsbn: rawIsbn, usedOnly: usedOnly, finalUrl: r.finalUrl });
    out.url = url; out.via = 'isbn';
    if (out.status !== 'NO_RESULT' || !book.title) return out;
    // valid-looking ISBN with no copies -> try the keyword path before giving up
  }
  if (!book.title) return { status: 'NO_RESULT', reason: 'no_isbn_no_title' };
  const url = keywordUrl(book.title, book.author);
  const r = await fetchPage(url);
  if (r.netError) return { status: 'FAILED', reason: 'net:' + r.netError, url: url, via: 'keyword' };
  const out = classify(r.html, r.status, {
    title: book.title, author: book.author, guard: true, usedOnly: usedOnly, finalUrl: r.finalUrl,
  });
  out.url = url; out.via = 'keyword'; out.query = cleanQuery(book.title, book.author);
  return out;
}

/** What goes in the UI cell. */
export function cellFor(out) {
  if (out.status === 'OK') return '$' + out.total.toFixed(2);
  if (out.status === 'NO_RESULT') return '$-';
  return null; // FAILED -> leave the previous value alone, retry later
}

// ---------------------------------------------------------------- cli

if (import.meta.url === 'file://' + process.argv[1]) {
  const a = process.argv.slice(2);
  const arg = k => { const i = a.indexOf(k); return i === -1 ? null : a[i + 1]; };
  const fs = await import('node:fs');

  if (arg('--file')) {
    const html = fs.readFileSync(arg('--file'), 'utf8');
    console.log(JSON.stringify(classify(html, 200, {
      expectIsbn: arg('--expect-isbn'), title: arg('--title'), author: arg('--author'),
      guard: a.indexOf('--guard') !== -1, usedOnly: a.indexOf('--used-only') !== -1,
      finalUrl: arg('--final-url'),
    }), null, 2));
  } else if (arg('--db')) {
    const cp = await import('node:child_process');
    const lim = arg('--limit') || 5;
    const where = arg('--where') || '1=1';
    const sql = 'SELECT title||char(31)||COALESCE(author,\'\')||char(31)||COALESCE(isbn,\'\')||char(31)||COALESCE(lowest_price,\'\') ' +
                'FROM recommendations WHERE ' + where + ' LIMIT ' + lim + ';';
    const raw = cp.execSync('sqlite3 ' + JSON.stringify(arg('--db')) + ' ' + JSON.stringify(sql), { encoding: 'utf8' });
    const rows = raw.trim().split('\n').filter(Boolean).map(l => {
      const p = l.split(SEP);
      return { title: p[0], author: p[1], isbn: p[2], was: p[3] };
    });
    for (const row of rows) {
      const out = await lookup({ title: row.title, author: row.author, isbn: row.isbn,
                                 usedOnly: a.indexOf('--used-only') !== -1 });
      console.log(JSON.stringify({
        title: row.title.slice(0, 50), isbn: row.isbn, dbWas: row.was,
        status: out.status, cell: cellFor(out), total: out.total == null ? null : out.total,
        item: out.item, ship: out.shipping, cond: out.condition, via: out.via, reason: out.reason,
        chosenIdx: out.chosenIdx, idx0Total: out.idx0Total, sortOk: out.sortWasCorrect,
        n: out.resultCount, matched: (out.matchedTitle || '').slice(0, 45), q: out.query,
      }));
      await sleep(Number(arg('--delay') || 4000));
    }
  } else {
    const out = await lookup({ isbn: arg('--isbn'), title: arg('--title'), author: arg('--author'),
                               usedOnly: a.indexOf('--used-only') !== -1 });
    out.cell = cellFor(out);
    console.log(JSON.stringify(out, null, 2));
  }
}
