/**
 * Harvard LibraryCloud — a research-library catalogue, keyless and CORS-open.
 *
 * Added because this library is mostly academic theology, and the sources we
 * had are weakest exactly there. It uniquely supplies ISBN-13 *plus* LC call
 * number, Dewey, and full LCSH subject headings in one call, which is three of
 * the fields the app already stores and previously had to scrape second-hand.
 *
 * It is also honest. Asked for a book it does not hold it returns numFound 0
 * rather than a confident near-miss — the failure that made the old search
 * answer "AI and the Future Church" with Dante's Divina Commedia.
 *
 * What it does NOT have is covers, ever. Those keep coming from Open Library,
 * keyed by the ISBN Harvard hands us.
 */

const BASE = "https://api.lib.harvard.edu/v2/items.json";

export interface HarvardRecord {
  title: string;
  subtitle?: string;
  author: string;
  isbns: string[];
  isbn13?: string;
  pages: number | null;
  year?: number;
  description: string | null;
  lcc?: string;
  ddc?: string;
  subjects: string[];
}

/** MODS fields are `string | object | array` more or less at random. */
const arr = <T,>(v: T | T[] | undefined | null): T[] =>
  Array.isArray(v) ? v : v == null ? [] : [v];

const text = (v: unknown): string => {
  if (typeof v === "string") return v.trim();
  if (v && typeof v === "object" && "#text" in (v as Record<string, unknown>)) {
    return String((v as Record<string, unknown>)["#text"]).trim();
  }
  return "";
};

/** Cataloguers leave trailing ISBD punctuation on almost everything. */
const tidy = (s: string) => s.replace(/\s*[/:;,]\s*$/, "").trim();

const STOP = new Set(["the", "a", "an", "of", "and", "in", "on", "for", "to", "with", "from", "by"]);
const tokens = (s: string) =>
  new Set(
    String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")   // fold diacritics for comparison
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP.has(w))
  );

/**
 * Is this record plausibly the book that was asked for?
 *
 * Harvard is a search engine, not a resolver: a title-only query for "A Grammar
 * of Biblical Hebrew" ranks a *different* Hebrew grammar first. It never
 * invents a record, but it will happily rank a wrong one top, so the top hit
 * has to be checked rather than trusted.
 */
export function plausible(wantTitle: string, wantAuthor: string | undefined, rec: HarvardRecord): boolean {
  const want = tokens(wantTitle);
  if (want.size === 0) return false;
  const got = tokens(`${rec.title} ${rec.subtitle || ""}`);
  let hit = 0;
  for (const t of want) if (got.has(t)) hit++;
  const cover = hit / want.size;

  if (!wantAuthor) return cover >= 0.8;

  const surname = [...tokens(wantAuthor)].pop();
  if (!surname) return cover >= 0.8;

  // When an author is known it must corroborate — a high title score alone is
  // NOT enough, because near-identical titles are the norm in this field.
  // "A Grammar of Biblical Hebrew" scores a perfect 1.0 against "A Biblical
  // Hebrew Reference Grammar", a different book by a different author; letting
  // title similarity short-circuit the author check accepted it outright.
  return tokens(rec.author).has(surname) && cover >= 0.55;
}

function parseRecord(m: Record<string, any>): HarvardRecord {
  const ti = arr(m.titleInfo)[0] || {};
  const names = arr(m.name).filter((n: any) => n?.["@type"] === "personal" || !n?.["@type"]);
  const author = names
    .map((n: any) => tidy(text(arr(n.namePart)[0])))
    // Vendor pseudo-authors (EBSCOhost, ProQuest) sit in the same block.
    .filter((s: string) => s && !/ebscohost|proquest|firm/i.test(s))[0] || "Unknown Author";

  const isbns = arr(m.identifier)
    .filter((i: any) => i?.["@type"] === "isbn")
    .map((i: any) => text(i).replace(/[^0-9Xx]/g, ""))
    .filter(Boolean);

  const extent = text(arr(arr(m.physicalDescription)[0]?.extent)[0]);
  // "xvi, 223 p. ; 24 cm." -> 223. Ebook records read "1 online resource
  // (pages cm.)" with no number at all, which must stay null rather than 0.
  const pm = extent.match(/(\d+)\s*(?:p\.|pages)/);
  const pages = pm ? parseInt(pm[1], 10) : null;

  const dateIssued = arr(m.originInfo).flatMap((o: any) => arr(o?.dateIssued).map(text)).find(Boolean) || "";
  const ym = dateIssued.match(/(\d{4})/);

  const cls = arr(m.classification);
  const lcc = cls.filter((c: any) => c?.["@authority"] === "lcc").map(text)[0];
  const ddc = cls.filter((c: any) => c?.["@authority"] === "ddc").map(text)[0];

  const subjects = arr(m.subject)
    .map((s: any) => {
      if (typeof s === "string") return s;
      // LCSH subdivisions: topic -- geographic -- form
      const parts = ["topic", "geographic", "temporal", "genre", "titleInfo", "name"]
        .flatMap(k => arr(s?.[k]).map((v: any) => (k === "titleInfo" || k === "name" ? text(arr(v?.title ?? v?.namePart)[0]) : text(v))))
        .filter(Boolean);
      return parts.join("--");
    })
    .map(s => tidy(String(s)))
    .filter(s => s && s.length < 80);

  // MODS files the leading article separately in `nonSort` ("The  "), so the
  // title alone reads "lost world of the Torah". Put it back for display.
  const nonSort = text(ti.nonSort).replace(/\s+$/, "");
  return {
    title: tidy([nonSort, text(ti.title)].filter(Boolean).join(" ")),
    subtitle: tidy(text(ti.subTitle)) || undefined,
    author,
    isbns,
    isbn13: isbns.find(i => i.length === 13),
    pages,
    year: ym ? parseInt(ym[1], 10) : undefined,
    description: tidy(text(arr(m.abstract)[0])) || null,
    lcc,
    ddc,
    subjects: [...new Set(subjects)].slice(0, 12),
  };
}

async function query(params: Record<string, string>): Promise<HarvardRecord[]> {
  const qs = new URLSearchParams({ ...params, limit: params.limit || "5" });
  const res = await fetch(`${BASE}?${qs}`);
  if (!res.ok) return [];
  const data = await res.json();
  // numFound lives on `pagination`, NOT on `items` — reading it from the wrong
  // place silently returns "no match" for books Harvard definitely holds.
  const n = data?.pagination?.numFound ?? data?.items?.numFound ?? 0;
  if (!n || !data?.items?.mods) return [];
  // numFound 1 returns an OBJECT here, not a one-element array.
  return arr(data.items.mods).map(parseRecord);
}

/** Exact lookup. The most reliable path we have for anything with an ISBN. */
export async function harvardByIsbn(isbn: string): Promise<HarvardRecord | null> {
  const clean = isbn.replace(/[^0-9Xx]/g, "");
  if (clean.length < 10) return null;
  const [first] = await query({ identifier: clean, limit: "1" });
  return first || null;
}

/**
 * Title + author search, validated before returning.
 *
 * Author queries go out in BOTH unicode normalisations: Harvard stores some
 * headings NFD-decomposed, so "Joüon" composed as U+00FC silently matches
 * nothing while the same name as u + combining-diaeresis matches fine.
 */
export async function harvardSearch(title: string, author?: string): Promise<HarvardRecord[]> {
  // MODS strips leading articles from titles, so sending one costs a match.
  const t = title.replace(/^\s*(the|a|an)\s+/i, "").trim();
  const surname = author ? [...tokens(author)].pop() : undefined;

  const attempts: Record<string, string>[] = [];
  if (surname) {
    const nfc = surname.normalize("NFC");
    const nfd = surname.normalize("NFD");
    attempts.push({ title: t, name: nfc });
    if (nfd !== nfc) attempts.push({ title: t, name: nfd });
  }
  attempts.push({ title: t });

  for (const params of attempts) {
    const recs = await query(params);
    const good = recs.filter(r => plausible(title, author, r));
    if (good.length) return good;
  }
  return [];
}
