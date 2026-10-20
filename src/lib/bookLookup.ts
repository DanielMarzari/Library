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
 * Look a book up, trying the most precise route first and falling through only
 * on a genuine miss:
 *
 *   1. ISBN      — exact and authoritative
 *   2. title + author
 *   3. title alone — catches pseudonyms, transliterations (Joüon/Jouon),
 *                    corporate authors, and plain author-spelling mismatches
 *   4. Google Books — more current than Open Library on new releases
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

    // Open Library is built from library MARC dumps, so it is strong on
    // established backlist and weak on new releases — a completed year still
    // back-fills for well over a year. Google Books tracks publisher feeds and
    // is the better bet for anything recent.
    if (results.length === 0) {
      const gRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
          isIsbn ? `isbn:${digits}` : [query, author].filter(Boolean).join(" ")
        )}&maxResults=${limit}`
      );
      const gData = await gRes.json();

      if (gData.items) {
        for (const item of gData.items) {
          const vol = item.volumeInfo;
          const { title, subtitle } = cleanTitle(vol.title || "Unknown");
          results.push({
            title,
            subtitle: subtitle || vol.subtitle || undefined,
            author: vol.authors?.[0] || "Unknown Author",
            isbn:
              vol.industryIdentifiers?.find(
                (id: { type: string; identifier: string }) => id.type === "ISBN_13"
              )?.identifier ||
              vol.industryIdentifiers?.[0]?.identifier ||
              "",
            cover_url: vol.imageLinks?.thumbnail?.replace("http:", "https:") || null,
            description: vol.description?.substring(0, 300) || null,
            pages: vol.pageCount || null,
            publish_year: vol.publishedDate ? parseInt(vol.publishedDate.slice(0, 4), 10) || undefined : undefined,
            topics: vol.categories || undefined,
          });
        }
      }
    }
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
