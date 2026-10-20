import { harvardByIsbn, harvardSearch, type HarvardRecord } from "./harvard";

export interface BookSearchResult {
  title: string;
  subtitle?: string;
  author: string;
  isbn: string;
  cover_url: string | null;
  description: string | null;
  pages: number | null;
  publish_year?: number;
  lcc?: string;
  ddc?: string;
  topics?: string[];
}

export interface ArticleSearchResult {
  title: string;
  author: string;
  doi: string;
  journal: string | null;
  publication_year: number | null;
  url: string | null;
  description: string | null;
  pages: number | null;
}

// Strip a leading "https://doi.org/" or "doi:" prefix from a DOI string.
export function normalizeDoi(input: string): string {
  const trimmed = input.trim();
  const m = trimmed.match(/(10\.\d{4,9}\/[^\s]+)/);
  return m ? m[1] : trimmed;
}

export function looksLikeDoi(input: string): boolean {
  return /(10\.\d{4,9}\/[^\s]+)/.test(input.trim());
}

// Fetch article metadata from Crossref by DOI.
// Crossref REST API: https://api.crossref.org/works/{doi}
export async function lookupDoi(rawDoi: string): Promise<ArticleSearchResult | null> {
  const doi = normalizeDoi(rawDoi);
  if (!doi) return null;

  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const work = data.message;
    if (!work) return null;

    const title = Array.isArray(work.title) ? work.title[0] : work.title;
    const authors: string[] = Array.isArray(work.author)
      ? work.author
          .map((a: { given?: string; family?: string; name?: string }) =>
            a.name || [a.given, a.family].filter(Boolean).join(" ")
          )
          .filter(Boolean)
      : [];
    const journal = Array.isArray(work["container-title"])
      ? work["container-title"][0]
      : work["container-title"];
    const yearParts =
      work.issued?.["date-parts"]?.[0] ||
      work["published-print"]?.["date-parts"]?.[0] ||
      work["published-online"]?.["date-parts"]?.[0];
    const publication_year = Array.isArray(yearParts) ? yearParts[0] : null;
    const pageRange: string | undefined = work.page;
    let pages: number | null = null;
    if (pageRange) {
      const m = pageRange.match(/(\d+)\s*[-–]\s*(\d+)/);
      if (m) pages = parseInt(m[2], 10) - parseInt(m[1], 10) + 1;
    }

    return {
      title: title || "Untitled article",
      author: authors.join(", ") || "Unknown Author",
      doi,
      journal: journal || null,
      publication_year: publication_year || null,
      url: work.URL || `https://doi.org/${doi}`,
      description: work.abstract
        ? work.abstract.replace(/<[^>]+>/g, "").slice(0, 500)
        : null,
      pages,
    };
  } catch {
    return null;
  }
}

// Strip edition/anniversary junk from titles
function cleanTitle(raw: string): { title: string; subtitle?: string } {
  let text = raw;

  // Remove edition markers
  text = text.replace(
    /\s*\(?\b(\d+\w*\s+)?(anniversary|edition|revised|updated|reprint|deluxe|collector'?s?|special|international|mass\s+market)\b[^)]*\)?/gi,
    ""
  );

  // Split title and subtitle on first colon or dash
  const separators = [": ", " - ", " — ", " – "];
  for (const sep of separators) {
    const idx = text.indexOf(sep);
    if (idx > 0) {
      return {
        title: text.substring(0, idx).trim(),
        subtitle: text.substring(idx + sep.length).trim() || undefined,
      };
    }
  }

  return { title: text.trim() };
}

// Fetch classification data and subjects from Open Library edition/works APIs
const GENERIC_SUBJECTS = new Set([
  "fiction", "nonfiction", "large type books", "exhibitions", "specimens",
  "accessible book", "protected daisy", "in library", "lending library",
]);

const usefulSubjects = (subjects: unknown): string[] =>
  Array.isArray(subjects)
    ? subjects
        .filter((s): s is string => typeof s === "string")
        .filter(s => !GENERIC_SUBJECTS.has(s.toLowerCase()) && !s.includes("--") && !s.includes("fiction,") && s.length < 60)
        .slice(0, 10)
    : [];

/**
 * Classification and subject headings, which Google Books does not carry at all.
 *
 * The EDITION record (/isbn/) is the one worth asking: it holds
 * lc_classifications, subjects and a real number_of_pages. The work record is
 * thinner than you'd expect — no description, no LCC, no DDC — so it's only a
 * backstop for subjects.
 */
async function fetchClassifications(
  isbn: string,
  workKey?: string
): Promise<{ lcc?: string; ddc?: string; topics?: string[]; pages?: number }> {
  const result: { lcc?: string; ddc?: string; topics?: string[]; pages?: number } = {};

  try {
    // Edition API for LCC/DDC
    if (isbn) {
      const edRes = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
      if (edRes.ok) {
        const ed = await edRes.json();
        if (ed.lc_classifications?.length) {
          result.lcc = ed.lc_classifications[0];
        }
        if (ed.dewey_decimal_class?.length) {
          result.ddc = ed.dewey_decimal_class[0];
        }
        // This edition's actual page count, rather than the median across every
        // edition the search endpoint knows about — that median reported 352
        // for Joüon's grammar, which is really a ~750pp two-volume set.
        if (typeof ed.number_of_pages === "number" && ed.number_of_pages > 0) {
          result.pages = ed.number_of_pages;
        }
        // Subjects live on the edition too, and more reliably than on the work.
        const edSubjects = usefulSubjects(ed.subjects);
        if (edSubjects.length) result.topics = edSubjects;
        // If we don't have a work key yet, grab it from edition
        if (!workKey && ed.works?.length) {
          workKey = ed.works[0].key;
        }
      }
    }

    // Works API, only if the edition had no subjects of its own.
    if (workKey && !result.topics?.length) {
      const wRes = await fetch(`https://openlibrary.org${workKey}.json`);
      if (wRes.ok) {
        const work = await wRes.json();
        const workSubjects = usefulSubjects(work.subjects);
        if (workSubjects.length) result.topics = workSubjects;
      }
    }
  } catch {
    // Classifications are nice-to-have, don't fail the lookup
  }

  return result;
}

const OL_FIELDS =
  "key,title,subtitle,author_name,cover_i,number_of_pages_median,first_publish_year,isbn,edition_count";

/**
 * Open Library's `q=` runs through a dismax-style scorer that ORs loose tokens
 * and fuzzy-matches them. Searching "AI and the Future Church" returned Dante's
 * Divina Commedia (1472), because "Future"~"Fire" and "Church"~"Commedia".
 *
 * That isn't just noise — it broke the fallback. Google Books was only
 * consulted when Open Library returned ZERO results, and a fuzzy OR over a
 * multi-word title almost never returns zero. The fallback was structurally
 * unreachable, so a book Open Library simply doesn't have came back as three
 * confident wrong answers instead of an honest miss.
 *
 * Binding the title to a quoted phrase in its own field fixes it: the same
 * search now returns 0 and falls through.
 */
function olQuery(title: string, author?: string): string {
  // A stray quote would unbalance the phrase and make Solr throw; a Lucene
  // operator in the author group would be parsed as syntax.
  const t = title.replace(/["\\]/g, " ").trim();
  // Author is a LENIENT group, not a phrase. Open Library catalogues from MARC,
  // where middle initials are pervasive — it holds "Joshua A. Berman", so
  // author:"Joshua Berman" matches nothing. Parentheses match the tokens
  // without demanding adjacency, which matters across a whole theology shelf.
  const a = (author || "").replace(/["\\+\-&|!(){}\[\]^~*?:]/g, " ").trim();
  return a ? `title:"${t}" AND author:(${a})` : `title:"${t}"`;
}

const olUrl = (q: string, limit: number) =>
  `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=${limit}&fields=${OL_FIELDS}`;

function docToResult(doc: any, isbnOverride?: string): BookSearchResult {
  const { title, subtitle } = cleanTitle(doc.title || "Unknown");
  return {
    title,
    subtitle: subtitle || (doc.subtitle ? cleanTitle(doc.subtitle).title : undefined),
    author: doc.author_name?.[0] || "Unknown Author",
    isbn: isbnOverride || doc.isbn?.[0] || "",
    cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
    description: null,
    // Per-edition and not always the edition you hold — Joüon's grammar reports
    // 352 here against a ~750pp two-volume reality. Offered as a starting point,
    // never as a page count to rely on.
    pages: doc.number_of_pages_median || null,
    publish_year: doc.first_publish_year || undefined,
  };
}

/**
 * K10plus — the German/Austrian union catalogue (GBV + SWB), free and keyless.
 *
 * Here because it is measurably stronger than Open Library on continental
 * academic imprints (Mohr Siebeck, Brill, De Gruyter, Vandenhoeck & Ruprecht),
 * which is a meaningful slice of a biblical-studies shelf, and because it
 * returns something for recent academic ISBNs that Open Library has not
 * ingested yet. SRU returns XML, so this reads the handful of Dublin Core
 * elements it needs rather than taking on an XML parser.
 */
async function k10plusByIsbn(isbn: string): Promise<BookSearchResult | null> {
  try {
    const url =
      `https://sru.k10plus.de/gvk?version=1.1&operation=searchRetrieve` +
      `&query=pica.isb%3D${encodeURIComponent(isbn)}&maximumRecords=1&recordSchema=dc`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const xml = await res.text();
    if (/<zs:numberOfRecords>0</.test(xml)) return null;

    const pick = (tag: string) => {
      const m = xml.match(new RegExp(`<dc:${tag}[^>]*>([\\s\\S]*?)</dc:${tag}>`));
      return m ? m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() : "";
    };
    const all = (tag: string) =>
      [...xml.matchAll(new RegExp(`<dc:${tag}[^>]*>([\\s\\S]*?)</dc:${tag}>`, "g"))]
        .map(m => m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
        .filter(Boolean);

    const rawTitle = pick("title");
    if (!rawTitle) return null;
    const { title, subtitle } = cleanTitle(rawTitle.replace(/\s*\/\s*$/, ""));
    const dateStr = pick("date");
    const ym = dateStr.match(/(\d{4})/);
    const extent = all("format").join(" ");
    const pm = extent.match(/(\d+)\s*(?:S\.|p\.|pages|Seiten)/i);

    return {
      title,
      subtitle,
      author: all("creator")[0] || all("contributor")[0] || "Unknown Author",
      isbn,
      cover_url: coverByIsbn(isbn),
      description: null,
      pages: pm ? parseInt(pm[1], 10) : null,
      publish_year: ym ? parseInt(ym[1], 10) : undefined,
      topics: all("subject").slice(0, 10),
    };
  } catch {
    return null;
  }
}

/** Open Library serves covers by raw ISBN, no search needed — and it is the
 *  only one of these sources that has cover art at all. */
const coverByIsbn = (isbn?: string) =>
  isbn && isbn.length >= 10
    ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`
    : null;

function fromHarvard(r: HarvardRecord): BookSearchResult {
  return {
    title: r.title,
    subtitle: r.subtitle,
    author: r.author,
    isbn: r.isbn13 || r.isbns[0] || "",
    cover_url: coverByIsbn(r.isbn13 || r.isbns[0]),
    description: r.description,
    pages: r.pages,
    publish_year: r.year,
    lcc: r.lcc,
    ddc: r.ddc,
    topics: r.subjects.length ? r.subjects : undefined,
  };
}

/**
 * Look a book up across three catalogues, falling through only on a genuine
 * miss:
 *
 *   1. Harvard LibraryCloud — a research-library catalogue, and the only one
 *      carrying ISBN-13 with LC call number, Dewey and LCSH subjects together
 *   2. Open Library — established backlist, and the source of cover art
 *   3. K10plus — the German/Austrian union catalogue, stronger on continental
 *      academic imprints and on recent academic ISBNs
 *
 * Within Open Library it tries ISBN, then title+author, then title alone —
 * the last catching pseudonyms, transliterations (Joüon/Jouon) and corporate
 * authors.
 *
 * There is deliberately no Google Books leg. All three of these are library
 * catalogues, which means they are excellent on academic and backlist titles
 * and will simply not have this year's popular trade releases. When every leg
 * misses, that is a real answer — enter the book by hand.
 *
 * `author` is optional: when the caller only has a search box, pass the whole
 * string as `query` and it's used as the title.
 */
export async function searchBooks(
  query: string,
  limit = 5,
  author?: string
): Promise<BookSearchResult[]> {
  const results: BookSearchResult[] = [];
  const digits = query.replace(/[^0-9X]/gi, "");
  const isIsbn = /^[0-9X-]{10,17}$/i.test(query.replace(/[^0-9X-]/gi, "")) && digits.length >= 10;

  try {
    // 1. Harvard LibraryCloud first. It is a research-library catalogue, which
    //    is the right shape for a collection that is mostly academic theology,
    //    and it is the only free source carrying ISBN-13 *with* LC call number,
    //    Dewey and LCSH subjects in one response.
    try {
      const hv = isIsbn
        ? await harvardByIsbn(digits).then(r => (r ? [r] : []))
        : await harvardSearch(query, author);
      for (const r of hv.slice(0, limit)) results.push(fromHarvard(r));
    } catch { /* fall through to the next source */ }

    // 2. Open Library — strong on established backlist, and the source of cover art.
    if (results.length === 0) {
      const attempts = isIsbn
        ? [`isbn:${digits}`]
        : [olQuery(query, author), ...(author ? [olQuery(query)] : [])];

      for (const q of attempts) {
        const res = await fetch(olUrl(q, limit));
        if (!res.ok) continue;
        const data = await res.json();
        if (data.docs?.length) {
          for (const doc of data.docs) results.push(docToResult(doc, isIsbn ? digits : undefined));
          break;
        }
      }
    }

    // 3. K10plus — the German/Austrian union catalogue. Added because it is
    //    measurably better than Open Library on exactly the books this library
    //    is made of: on 24 real 2026 Baker Academic biblical-studies ISBNs it
    //    found 8 where Open Library found none.
    if (results.length === 0 && isIsbn) {
      const k = await k10plusByIsbn(digits);
      if (k) results.push(k);
    }

    // Open Library is built from library MARC dumps, so it is strong on
    // established backlist and weak on new releases — a completed year still
    // back-fills for well over a year. Google Books tracks publisher feeds and
    // is the better bet for anything recent.
  } catch {
    // fall through with whatever we have
  }

  return results;
}

// Enrich a single result with classification data (called after user selects)
export async function enrichBook(
  book: BookSearchResult,
  workKey?: string
): Promise<BookSearchResult> {
  const cls = await fetchClassifications(book.isbn, workKey);
  return {
    ...book,
    lcc: cls.lcc || book.lcc,
    ddc: cls.ddc || book.ddc,
    topics: cls.topics?.length ? cls.topics : book.topics,
    // Prefer this edition's real count over the cross-edition median.
    pages: cls.pages ?? book.pages,
  };
}
