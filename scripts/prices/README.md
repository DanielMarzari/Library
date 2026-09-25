# Refreshing recommendation prices

Looks up the cheapest copy of each recommendation at AbeBooks, ThriftBooks and
Amazon, and writes the result back to the library.

## The rule everything here is built around

A lookup has four outcomes, and only two of them may touch the database:

| outcome | what it means | what is written | shelf shows |
|---|---|---|---|
| `ok` | found a price for the right book | price + `*_checked_at` | `A $12` |
| `no_result` | the store genuinely has no copy | NULL + `*_checked_at` | `$-` |
| `blocked` | bot wall, CAPTCHA, rate limit | **nothing** — stays queued | unchanged |
| `error` | timeout, or the markup changed | **nothing** — stays queued | unchanged |

Collapsing `blocked` into `no_result` is how you end up telling someone a book
is unavailable when the truth is that Amazon showed you a CAPTCHA. `$-` is a
claim about the world, so it has to be earned.

## Running

```bash
export PRICES_DIR=.prices          # working dir: queue, logs, results
export LIBRARY_DB=/path/to/library.db   # a COPY; these scripts only read it

node scripts/prices/run.mjs thrift --delay 1800
node scripts/prices/run.mjs abe    --delay 6000
node scripts/prices/run.mjs amazon --delay 55000 --isbn-only
node scripts/prices/run-amz-search.mjs --delay 30000   # the no-ISBN rows
```

Runs are resumable: every row is appended to `$PRICES_DIR/results/<store>.jsonl`
as it completes, and a re-run skips rows already recorded `ok`/`no_result` while
retrying everything else. Kill a run whenever; start it again later.

Then write the results back:

```bash
node scripts/prices/apply-api.mjs thrift abe amazon --dry   # inspect first
node scripts/prices/apply-api.mjs thrift abe amazon
```

`apply-api.mjs` goes through `PUT /api/recommendations/[id]` — the same route
the Refresh Prices button uses — so the field allowlist applies and no shell
access to the server is needed. `apply.mjs` emits the equivalent SQL instead,
for when you'd rather apply it by hand.

## What each store needs

- **AbeBooks** — plain fetch. ISBN search, falling back to title+author. The
  price is item **plus shipping**: a $2.49 book with $2.49 shipping is a $4.98
  book, and `sortby=17` sorts on the total. Tolerates ~6s pacing.
- **ThriftBooks** — not scraped. The search page is client-rendered, and the
  only dollar amount in its HTML is the subscription promo (which is how 400+
  bogus `$2.99` rows once got in). Instead: read `window.searchStoreV2` from the
  search HTML, then `POST /stateless/editions/workinfo` for the edition's
  cheapest copy. Prefers used, falls back to new — a new-only book is still
  available there.
- **Amazon** — ISBN→ASIN→`/dp/`, plain fetch, ~55s pacing and expect blocks
  anyway. The *search* endpoint sits behind an Akamai interstitial from the
  first request, so rows with no ISBN need real Chrome (`run-amz-search.mjs`,
  puppeteer-core against the installed Chrome).

## Matching, and why it is strict

Without an ISBN pinning identity, a keyword search returns *something* for
almost any query. Every store path therefore verifies the result before
believing it: title-token overlap **and** author surname, with volume/set
qualifiers compared so "(2 Volume set)" doesn't match "Volume 2".

This rejects real books. That is the intent — a wrong price is worse than no
price. Two live examples the guard caught:

- `"Son of Man": Early Jewish Literature` → **"The Son of Man: A Novel"**
- `(Re)reading Ruth` → **"Reading Ruth: Birth, Redemption, and the Way of Israel"**
  (scored 1.00 on title alone; only the author check caught it)
