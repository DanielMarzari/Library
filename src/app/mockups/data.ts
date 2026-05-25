// Static sample data shared across the three mockup pages.
// Covers are remote OpenLibrary URLs — fine for static mockups.

export interface MockBook {
  id: string;
  title: string;
  author: string;
  year: number;
  pages: number;
  status: "reading" | "read" | "not_read";
  rating?: number;
  cover: string;
  topics: string[];
  source?: string;
  progress?: number; // 0-100, for reading status
  // Extra real-data fields surfaced when available (auth/borrowers wire-up).
  cover_url?: string;
  has_cover_blob?: boolean;
  current_page?: number;
}

export const MOCK_BOOKS: MockBook[] = [
  {
    id: "1",
    title: "The Brothers Karamazov",
    author: "Fyodor Dostoevsky",
    year: 1880,
    pages: 796,
    status: "reading",
    cover: "https://covers.openlibrary.org/b/id/8231948-L.jpg",
    topics: ["Russian Literature", "Philosophy"],
    source: "Gift",
    progress: 42,
  },
  {
    id: "2",
    title: "The Name of the Rose",
    author: "Umberto Eco",
    year: 1980,
    pages: 502,
    status: "read",
    rating: 5,
    cover: "https://covers.openlibrary.org/b/id/8231856-L.jpg",
    topics: ["Mystery", "Medieval"],
    source: "Strand",
  },
  {
    id: "3",
    title: "Gödel, Escher, Bach",
    author: "Douglas Hofstadter",
    year: 1979,
    pages: 777,
    status: "read",
    rating: 5,
    cover: "https://covers.openlibrary.org/b/id/8225267-L.jpg",
    topics: ["Mathematics", "Cognition"],
    source: "Amazon",
  },
  {
    id: "4",
    title: "Pale Fire",
    author: "Vladimir Nabokov",
    year: 1962,
    pages: 248,
    status: "read",
    rating: 4,
    cover: "https://covers.openlibrary.org/b/id/8259256-L.jpg",
    topics: ["Postmodern", "Poetry"],
    source: "Library",
  },
  {
    id: "5",
    title: "Invisible Cities",
    author: "Italo Calvino",
    year: 1972,
    pages: 165,
    status: "reading",
    cover: "https://covers.openlibrary.org/b/id/8231996-L.jpg",
    topics: ["Italian Lit", "Fable"],
    source: "Gift",
    progress: 78,
  },
  {
    id: "6",
    title: "The Master and Margarita",
    author: "Mikhail Bulgakov",
    year: 1967,
    pages: 384,
    status: "not_read",
    cover: "https://covers.openlibrary.org/b/id/8233068-L.jpg",
    topics: ["Russian Literature", "Satire"],
    source: "Strand",
  },
  {
    id: "7",
    title: "Beloved",
    author: "Toni Morrison",
    year: 1987,
    pages: 324,
    status: "read",
    rating: 5,
    cover: "https://covers.openlibrary.org/b/id/240727-L.jpg",
    topics: ["American Lit", "History"],
    source: "Bookshop.org",
  },
  {
    id: "8",
    title: "If on a winter's night a traveler",
    author: "Italo Calvino",
    year: 1979,
    pages: 260,
    status: "not_read",
    cover: "https://covers.openlibrary.org/b/id/8234562-L.jpg",
    topics: ["Italian Lit", "Metafiction"],
    source: "Library",
  },
  {
    id: "9",
    title: "The Magic Mountain",
    author: "Thomas Mann",
    year: 1924,
    pages: 706,
    status: "read",
    rating: 4,
    cover: "https://covers.openlibrary.org/b/id/8240375-L.jpg",
    topics: ["German Lit", "Philosophy"],
    source: "Gift",
  },
  {
    id: "10",
    title: "One Hundred Years of Solitude",
    author: "Gabriel García Márquez",
    year: 1967,
    pages: 417,
    status: "read",
    rating: 5,
    cover: "https://covers.openlibrary.org/b/id/8231891-L.jpg",
    topics: ["Magical Realism"],
    source: "Strand",
  },
  {
    id: "11",
    title: "The Mezzanine",
    author: "Nicholson Baker",
    year: 1988,
    pages: 135,
    status: "not_read",
    cover: "https://covers.openlibrary.org/b/id/542302-L.jpg",
    topics: ["Postmodern", "Comedy"],
    source: "Amazon",
  },
  {
    id: "12",
    title: "Cosmicomics",
    author: "Italo Calvino",
    year: 1965,
    pages: 153,
    status: "read",
    rating: 4,
    cover: "https://covers.openlibrary.org/b/id/8233072-L.jpg",
    topics: ["Italian Lit", "Sci-Fi"],
    source: "Library",
  },
];

export const MOCK_STATS = {
  totalBooks: MOCK_BOOKS.length,
  read: MOCK_BOOKS.filter((b) => b.status === "read").length,
  reading: MOCK_BOOKS.filter((b) => b.status === "reading").length,
  notRead: MOCK_BOOKS.filter((b) => b.status === "not_read").length,
  avgRating:
    MOCK_BOOKS.filter((b) => b.rating).reduce((sum, b) => sum + (b.rating || 0), 0) /
    Math.max(1, MOCK_BOOKS.filter((b) => b.rating).length),
  pagesRead: MOCK_BOOKS.filter((b) => b.status === "read").reduce(
    (sum, b) => sum + b.pages,
    0
  ),
};
