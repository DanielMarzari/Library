export interface BookSearchResult {
  title: string;
  subtitle?: string;
  author: string;
  isbn: string;
  cover_url: string | null;
  description: string | null;
  pages: number | null;
  publish_year?: number;
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

const OL_FIELDS =
  "key,title,subtitle,author_name,cover_i,number_of_pages_median,first_publish_year,isbn,edition_count";

export async function searchBooks(
  query: string,
  limit = 5
): Promise<BookSearchResult[]> {
  const results: BookSearchResult[] = [];

  try {
    const isIsbn = /^[0-9X-]{10,17}$/i.test(query.replace(/[^0-9X-]/gi, ""));
    const searchParam = isIsbn ? `isbn:${query.replace(/[^0-9X]/gi, "")}` : query;

    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(searchParam)}&limit=${limit}&fields=${OL_FIELDS}`
    );
    const data = await res.json();

    if (data.docs) {
      for (const doc of data.docs) {
        const { title, subtitle } = cleanTitle(doc.title || "Unknown");
        results.push({
          title,
          subtitle: subtitle || (doc.subtitle ? cleanTitle(doc.subtitle).title : undefined),
          author: doc.author_name?.[0] || "Unknown Author",
          isbn: isIsbn
            ? query.replace(/[^0-9X]/gi, "")
            : doc.isbn?.[0] || "",
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
          isIsbn ? `isbn:${query.replace(/[^0-9X]/gi, "")}` : query
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
            cover_url:
              vol.imageLinks?.thumbnail?.replace("http:", "https:") || null,
            description: vol.description?.substring(0, 300) || null,
            pages: vol.pageCount || null,
          });
        }
      }
    }
  } catch {
    // fall through with whatever we have
  }

  return results;
}
