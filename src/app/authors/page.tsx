"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Book } from "@/types/book";

interface AuthorData {
  name: string;
  bookCount: number;
  readCount: number;
  averageRating: number | null;
  ethnicity: string | null;
  nationality: string | null;
  image_url: string | null;
  id?: string;
}

interface SortConfig {
  key: keyof AuthorData;
  direction: "asc" | "desc";
}

interface EditingState {
  author: string;
  field: "ethnicity" | "nationality";
}

const ETHNICITY_OPTIONS = [
  "African / Black",
  "Arab / Middle Eastern",
  "East Asian",
  "South Asian",
  "Southeast Asian",
  "European / White",
  "Hispanic / Latino",
  "Indigenous / Native",
  "Mixed / Multiracial",
  "Pacific Islander",
  "Caribbean",
  "Central Asian",
  "Jewish",
  "Other",
];

const NATIONALITY_OPTIONS = [
  "Afghan",
  "Algerian",
  "American",
  "Argentinian",
  "Australian",
  "Austrian",
  "Bangladeshi",
  "Belgian",
  "Bolivian",
  "Brazilian",
  "British",
  "Bulgarian",
  "Cambodian",
  "Canadian",
  "Chilean",
  "Chinese",
  "Colombian",
  "Congolese",
  "Costa Rican",
  "Croatian",
  "Cuban",
  "Czech",
  "Danish",
  "Dominican",
  "Dutch",
  "Ecuadorian",
  "Egyptian",
  "Ethiopian",
  "Filipino",
  "Finnish",
  "French",
  "German",
  "Ghanaian",
  "Greek",
  "Guatemalan",
  "Haitian",
  "Honduran",
  "Hungarian",
  "Icelandic",
  "Indian",
  "Indonesian",
  "Iranian",
  "Iraqi",
  "Irish",
  "Israeli",
  "Italian",
  "Jamaican",
  "Japanese",
  "Jordanian",
  "Kazakh",
  "Kenyan",
  "Korean",
  "Kuwaiti",
  "Lebanese",
  "Libyan",
  "Malaysian",
  "Mexican",
  "Moroccan",
  "Mozambican",
  "Myanmar",
  "Nepali",
  "New Zealander",
  "Nicaraguan",
  "Nigerian",
  "Norwegian",
  "Pakistani",
  "Palestinian",
  "Panamanian",
  "Paraguayan",
  "Peruvian",
  "Polish",
  "Portuguese",
  "Puerto Rican",
  "Romanian",
  "Russian",
  "Saudi",
  "Senegalese",
  "Serbian",
  "Singaporean",
  "Slovak",
  "Slovenian",
  "Somali",
  "South African",
  "Spanish",
  "Sri Lankan",
  "Sudanese",
  "Swedish",
  "Swiss",
  "Syrian",
  "Taiwanese",
  "Tanzanian",
  "Thai",
  "Trinidadian",
  "Tunisian",
  "Turkish",
  "Ugandan",
  "Ukrainian",
  "Uruguayan",
  "Uzbek",
  "Venezuelan",
  "Vietnamese",
  "Yemeni",
  "Zimbabwean",
];

const colorPalette = ["emerald", "blue", "purple", "pink", "amber", "cyan", "rose", "orange"];

const getInitials = (name: string): string => {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
};

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

const getAvatarColor = (name: string): string => {
  const hash = hashString(name);
  return colorPalette[hash % colorPalette.length];
};

const getColorClasses = (color: string): { bg: string; text: string } => {
  const colorMap: Record<string, { bg: string; text: string }> = {
    emerald: { bg: "bg-emerald-500", text: "text-emerald-900" },
    blue: { bg: "bg-blue-500", text: "text-blue-900" },
    purple: { bg: "bg-purple-500", text: "text-purple-900" },
    pink: { bg: "bg-pink-500", text: "text-pink-900" },
    amber: { bg: "bg-amber-500", text: "text-amber-900" },
    cyan: { bg: "bg-cyan-500", text: "text-cyan-900" },
    rose: { bg: "bg-rose-500", text: "text-rose-900" },
    orange: { bg: "bg-orange-500", text: "text-orange-900" },
  };
  return colorMap[color] || colorMap.emerald;
};

// Dropdown Component for Ethnicity/Nationality
function DropdownSelector({
  value,
  options,
  onSelect,
  onClear,
  label,
}: {
  value: string | null;
  options: string[];
  onSelect: (value: string) => void;
  onClear: () => void;
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const filtered = options.filter((option) =>
    option.toLowerCase().includes(searchInput.toLowerCase())
  );

  const handleSelect = (option: string) => {
    onSelect(option);
    setIsOpen(false);
    setSearchInput("");
  };

  const handleClear = () => {
    onClear();
    setIsOpen(false);
    setSearchInput("");
  };

  return (
    <div className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-300 cursor-pointer hover:bg-zinc-700 transition-colors"
      >
        {value ? (
          <span>
            {label}: {value}
          </span>
        ) : (
          <span className="text-zinc-500 italic">+ Add {label.toLowerCase()}</span>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg">
          <input
            type="text"
            placeholder={`Search ${label.toLowerCase()}...`}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-750 text-xs text-zinc-200 placeholder-zinc-500 border-b border-zinc-700 focus:outline-none"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((option) => (
                <div
                  key={option}
                  onClick={() => handleSelect(option)}
                  className="px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                >
                  {option}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-zinc-500 italic">No matches</div>
            )}
          </div>
          {value && (
            <div className="border-t border-zinc-700 px-3 py-2">
              <button
                onClick={handleClear}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsOpen(false);
            setSearchInput("");
          }}
        />
      )}
    </div>
  );
}

// Image Search Modal Component
function ImageSearchModal({
  authorName,
  onSelectImage,
  onClose,
}: {
  authorName: string;
  onSelectImage: (imageUrl: string) => void;
  onClose: () => void;
}) {
  const [images, setImages] = useState<{ url: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoading(true);
        setError(null);
        const results: { url: string; label: string }[] = [];

        // 1. Wikipedia REST API — best source for author portraits
        try {
          const wikiRes = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(authorName)}`
          );
          if (wikiRes.ok) {
            const wikiData = await wikiRes.json();
            if (wikiData.thumbnail?.source) {
              // Get higher res version by replacing size in URL
              const hiRes = wikiData.thumbnail.source.replace(/\/\d+px-/, "/500px-");
              results.push({ url: hiRes, label: "Wikipedia" });
            }
            if (wikiData.originalimage?.source) {
              results.push({ url: wikiData.originalimage.source, label: "Wikipedia (full)" });
            }
          }
        } catch {
          // Wikipedia failed, continue
        }

        // 2. Try name variants on Wikipedia (first last, last)
        const nameParts = authorName.split(" ");
        if (nameParts.length >= 2) {
          // Try "First_Last_(author)" pattern
          const wikiVariant = `${nameParts.join("_")}_(author)`;
          try {
            const res = await fetch(
              `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiVariant)}`
            );
            if (res.ok) {
              const data = await res.json();
              if (data.thumbnail?.source) {
                const hiRes = data.thumbnail.source.replace(/\/\d+px-/, "/500px-");
                const existing = results.find((r) => r.url === hiRes);
                if (!existing) {
                  results.push({ url: hiRes, label: "Wikipedia (author)" });
                }
              }
            }
          } catch {
            // skip
          }
        }

        // 3. Open Library as fallback
        try {
          const olRes = await fetch(
            `https://openlibrary.org/search/authors.json?q=${encodeURIComponent(authorName)}`
          );
          if (olRes.ok) {
            const olData = await olRes.json();
            if (olData.docs && Array.isArray(olData.docs)) {
              const candidates: string[] = [];
              for (const doc of olData.docs) {
                if (doc.key && candidates.length < 4) {
                  const olid = doc.key.replace("/authors/", "");
                  candidates.push(
                    `https://covers.openlibrary.org/a/olid/${olid}-M.jpg?default=false`
                  );
                }
              }
              // Validate with HEAD requests
              await Promise.all(
                candidates.map(async (url) => {
                  try {
                    const res = await fetch(url, { method: "HEAD" });
                    if (res.ok) {
                      results.push({ url, label: "Open Library" });
                    }
                  } catch {
                    // skip
                  }
                })
              );
            }
          }
        } catch {
          // Open Library failed, continue
        }

        if (results.length === 0) {
          setError("No images found for this author.");
        } else {
          // Deduplicate by URL
          const seen = new Set<string>();
          const unique = results.filter((r) => {
            if (seen.has(r.url)) return false;
            seen.add(r.url);
            return true;
          });
          setImages(unique.slice(0, 6));
        }
      } catch (err) {
        setError("Failed to fetch author images.");
        console.error("Image fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [authorName]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-zinc-100">
            Find photo for {authorName}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-zinc-400">
            Loading images...
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-400">{error}</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {images.map((img, index) => (
              <div
                key={index}
                onClick={() => onSelectImage(img.url)}
                className="cursor-pointer group"
              >
                <div className="relative overflow-hidden rounded-lg border border-zinc-700 hover:border-emerald-500 transition-colors">
                  <img
                    src={img.url}
                    alt={`Author ${index + 1}`}
                    className="w-full h-36 object-cover bg-zinc-800"
                    onError={(e) => {
                      ((e.target as HTMLImageElement).closest("div.group") as HTMLElement).style.display = "none";
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                    <span className="text-[10px] text-zinc-300">{img.label}</span>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <span className="text-white font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthorsPage() {
  const [authors, setAuthors] = useState<AuthorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "bookCount",
    direction: "desc",
  });
  const [imageSearchAuthor, setImageSearchAuthor] = useState<string | null>(null);

  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        setLoading(true);
        const { data: books, error: booksError } = await supabase
          .from("books")
          .select("*");

        if (booksError) throw booksError;

        const authorMap = new Map<string, AuthorData>();

        books.forEach((book: Book) => {
          if (book.author) {
            const authorNames = book.author
              .split(",")
              .map((a) => a.trim())
              .filter((a) => a.length > 0);

            authorNames.forEach((authorName) => {
              if (!authorMap.has(authorName)) {
                authorMap.set(authorName, {
                  name: authorName,
                  bookCount: 0,
                  readCount: 0,
                  averageRating: null,
                  ethnicity: null,
                  nationality: null,
                  image_url: null,
                });
              }

              const author = authorMap.get(authorName)!;
              author.bookCount += 1;

              if (book.status === "read") {
                author.readCount += 1;
              }

              if (book.rating) {
                if (author.averageRating === null) {
                  author.averageRating = book.rating;
                } else {
                  author.averageRating =
                    (author.averageRating * (author.readCount - 1) +
                      book.rating) /
                    author.readCount;
                }
              }
            });
          }
        });

        const authorNames = Array.from(authorMap.keys());
        if (authorNames.length > 0) {
          const { data: authorsMetadata, error: metadataError } = await supabase
            .from("authors")
            .select("*")
            .in("name", authorNames);

          if (metadataError) throw metadataError;

          authorsMetadata.forEach((metadata: any) => {
            const author = authorMap.get(metadata.name);
            if (author) {
              author.ethnicity = metadata.ethnicity;
              author.nationality = metadata.nationality;
              author.image_url = metadata.image_url;
              author.id = metadata.id;
            }
          });
        }

        const authorsList = Array.from(authorMap.values());
        setAuthors(authorsList);
      } catch (error) {
        console.error("Error fetching authors:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAuthors();
  }, []);

  const filteredAndSortedAuthors = useMemo(() => {
    let filtered = authors.filter((author) =>
      author.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      let comparison = 0;
      if (typeof aValue === "string") {
        comparison = aValue.localeCompare(bValue as string);
      } else {
        comparison = (aValue as number) - (bValue as number);
      }

      return sortConfig.direction === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [authors, searchTerm, sortConfig]);

  const handleSort = useCallback((key: keyof AuthorData) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  }, []);

  const handleSaveMetadata = useCallback(
    async (authorName: string, field: "ethnicity" | "nationality", value: string | null) => {
      try {
        // Get current author data to preserve other fields
        const currentAuthor = authors.find((a) => a.name === authorName);
        const upsertData: Record<string, unknown> = {
          name: authorName,
          ethnicity: currentAuthor?.ethnicity ?? null,
          nationality: currentAuthor?.nationality ?? null,
          image_url: currentAuthor?.image_url ?? null,
          [field]: value,
        };

        const { error } = await supabase.from("authors").upsert([upsertData]);

        if (error) throw error;

        setAuthors((prev) =>
          prev.map((author) =>
            author.name === authorName
              ? { ...author, [field]: value }
              : author
          )
        );
      } catch (error) {
        console.error("Error saving author metadata:", error);
      }
    },
    [authors]
  );

  const handleSaveImage = useCallback(
    async (authorName: string, imageUrl: string) => {
      try {
        const currentAuthor = authors.find((a) => a.name === authorName);
        const upsertData: Record<string, unknown> = {
          name: authorName,
          ethnicity: currentAuthor?.ethnicity ?? null,
          nationality: currentAuthor?.nationality ?? null,
          image_url: imageUrl,
        };

        const { error } = await supabase.from("authors").upsert([upsertData]);

        if (error) throw error;

        setAuthors((prev) =>
          prev.map((author) =>
            author.name === authorName
              ? { ...author, image_url: imageUrl }
              : author
          )
        );

        setImageSearchAuthor(null);
      } catch (error) {
        console.error("Error saving author image:", error);
      }
    },
    [authors]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200 flex items-center justify-center">
        <div className="text-lg">Loading authors...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-emerald-500">
            Authors <span className="text-zinc-400 text-lg">({filteredAndSortedAuthors.length})</span>
          </h1>
          <Link
            href="/"
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-zinc-200 transition-colors"
          >
            Back to Library
          </Link>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Filter authors by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Sort Options */}
        <div className="flex gap-2">
          <button
            onClick={() => handleSort("bookCount")}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              sortConfig.key === "bookCount"
                ? "bg-emerald-500 text-zinc-950"
                : "bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            Books {sortConfig.key === "bookCount" && (sortConfig.direction === "desc" ? "↓" : "↑")}
          </button>
          <button
            onClick={() => handleSort("name")}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              sortConfig.key === "name"
                ? "bg-emerald-500 text-zinc-950"
                : "bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            Name {sortConfig.key === "name" && (sortConfig.direction === "desc" ? "↓" : "↑")}
          </button>
          <button
            onClick={() => handleSort("averageRating")}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              sortConfig.key === "averageRating"
                ? "bg-emerald-500 text-zinc-950"
                : "bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            Rating {sortConfig.key === "averageRating" && (sortConfig.direction === "desc" ? "↓" : "↑")}
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      {filteredAndSortedAuthors.length === 0 ? (
        <div className="p-8 text-center text-zinc-400">
          {searchTerm ? "No authors match your search." : "No authors found."}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAndSortedAuthors.map((author) => {
            const avatarColor = getAvatarColor(author.name);
            const colorClasses = getColorClasses(avatarColor);
            const initials = getInitials(author.name);

            return (
              <div
                key={author.name}
                className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 hover:border-zinc-700 transition-colors relative focus-within:z-50"
              >
                {/* Avatar */}
                <div className="flex justify-center mb-4">
                  <button
                    onClick={() => setImageSearchAuthor(author.name)}
                    className="relative group"
                  >
                    {author.image_url ? (
                      <img
                        src={author.image_url}
                        alt={author.name}
                        className="w-16 h-16 rounded-full object-cover border border-zinc-700 group-hover:border-emerald-500 transition-colors"
                      />
                    ) : (
                      <div
                        className={`w-16 h-16 rounded-full ${colorClasses.bg} ${colorClasses.text} flex items-center justify-center font-bold text-xl group-hover:ring-2 group-hover:ring-emerald-500 transition-all`}
                      >
                        {initials}
                      </div>
                    )}
                  </button>
                </div>

                {/* Author Name */}
                <h3 className="text-center font-bold text-zinc-100 mb-3 text-sm break-words">
                  {author.name}
                </h3>

                {/* Stats */}
                <div className="text-center text-xs text-zinc-400 mb-4">
                  <div className="font-semibold text-zinc-300">
                    {author.bookCount} books · {author.readCount} read · {author.averageRating !== null ? author.averageRating.toFixed(1) : "—"}★ avg
                  </div>
                </div>

                {/* Badges */}
                <div className="space-y-2 mb-4">
                  {/* Ethnicity Dropdown */}
                  <DropdownSelector
                    value={author.ethnicity}
                    options={ETHNICITY_OPTIONS}
                    onSelect={(value) => handleSaveMetadata(author.name, "ethnicity", value)}
                    onClear={() => handleSaveMetadata(author.name, "ethnicity", null)}
                    label="Ethnicity"
                  />

                  {/* Nationality Dropdown */}
                  <DropdownSelector
                    value={author.nationality}
                    options={NATIONALITY_OPTIONS}
                    onSelect={(value) => handleSaveMetadata(author.name, "nationality", value)}
                    onClear={() => handleSaveMetadata(author.name, "nationality", null)}
                    label="Nationality"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Search Modal */}
      {imageSearchAuthor && (
        <ImageSearchModal
          authorName={imageSearchAuthor}
          onSelectImage={(imageUrl) => handleSaveImage(imageSearchAuthor, imageUrl)}
          onClose={() => setImageSearchAuthor(null)}
        />
      )}
    </div>
  );
}
