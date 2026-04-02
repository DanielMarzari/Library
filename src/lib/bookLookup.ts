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
async function fetchClassifications(
  isbn: string,
  workKey?: string
): Promise<{ lcc?: string; ddc?: string; topics?: string[] }> {
  const result: { lcc?: string; ddc?: string; topics?: string[] } = {};

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
        // If we don't have a work key yet, grab it from edition
        if (!workKey && ed.works?.length) {
          workKey = ed.works[0].key;
        }
      }
    }

    // Works API for subjects
    if (workKey) {
      const wRes = await fetch(`https://openlibrary.org${workKey}.json`);
      if (wRes.ok) {
        const work = await wRes.json();
        if (work.subjects?.length) {
          // Take top 10 most relevant subjects, filter out overly generic ones
          const skip = new Set([
            "fiction",
            "nonfiction",
            "large type books",
            "exhibitions",
            "specimens",
            "accessible book",
            "protected daisy",
            "in library",
            "lending library",
          ]);
          result.topics = work.subjects
            .filter(
              (s: string) =>
                !skip.has(s.toLowerCase()) &&
                !s.includes("--") &&
                !s.includes("fiction,") &&
                s.length < 60
            )
            .slice(0, 10);
        }
      }
    }
  } catch {
    // Classifications are nice-to-have, don't fail the lookup
  }

  return result;
}

const OL_FIELDS =
  "key,title,subtitle,author_name,cover_i,number_of_pages_median,first_publish_year,isbn,edition_count";

export async function searchBooks(
  query: string,
  limit = 5
): Promise<BookSearchResult[]> {
  const results: BookSearchResult[] = [];

  try {
    const isIsbn = /^[0-9X-]{10,17}$/i.test(query.replace(/[^0-9X-]/gi, ""));
    const searchParam = isIsbn
      ? `isbn:${query.replace(/[^0-9X]/gi, "")}`
      : query;

    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(searchParam)}&limit=${limit}&fields=${OL_FIELDS}`
    );
    const data = await res.json();

    if (data.docs) {
      for (const doc of data.docs) {
        const { title, subtitle } = cleanTitle(doc.title || "Unknown");
        const bookIsbn = isIsbn
          ? query.replace(/[^0-9X]/gi, "")
          : doc.isbn?.[0] || "";

        results.push({
          title,
          subtitle:
            subtitle ||
            (doc.subtitle ? cleanTitle(doc.subtitle).title : undefined),
          author: doc.author_name?.[0] || "Unknown Author",
          isbn: bookIsbn,
          cover_url: doc.cover_i
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
            : null,
          description: null,
          pages: doc.number_of_pages_median || null,
          publish_year: doc.first_publish_year || undefined,
        });
      }
    }

    // If Open Library returned nothing, try Google Books
    if (results.length === 0) {
      const gRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
          isIsbn
            ? `isbn:${query.replace(/[^0-9X]/gi, "")}`
            : query
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
                (id: { type: string; identifier: string }) =>
                  id.type === "ISBN_13"
              )?.identifier ||
              vol.industryIdentifiers?.[0]?.identifier ||
              "",
            cover_url:
              vol.imageLinks?.thumbnail?.replace("http:", "https:") || null,
            description: vol.description?.substring(0, 300) || null,
            pages: vol.pageCount || null,
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
  };
}
