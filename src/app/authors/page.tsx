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

export default function AuthorsPage() {
  const [authors, setAuthors] = useState<AuthorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "bookCount",
    direction: "desc",
  });
  const [editingCell, setEditingCell] = useState<EditingState | null>(null);
  const [editValue, setEditValue] = useState("");

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

  const handleCellClick = useCallback(
    (author: string, field: "ethnicity" | "nationality") => {
      const authorData = authors.find((a) => a.name === author);
      setEditingCell({ author, field });
      setEditValue(authorData?.[field] || "");
    },
    [authors]
  );

  const handleSaveEdit = useCallback(
    async (authorName: string) => {
      if (!editingCell) return;

      try {
        const { error } = await supabase.from("authors").upsert([
          {
            name: authorName,
            [editingCell.field]: editValue || null,
          },
        ]);

        if (error) throw error;

        setAuthors((prev) =>
          prev.map((author) =>
            author.name === authorName
              ? { ...author, [editingCell.field]: editValue || null }
              : author
          )
        );

        setEditingCell(null);
        setEditValue("");
      } catch (error) {
        console.error("Error saving author metadata:", error);
      }
    },
    [editingCell, editValue]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, authorName: string) => {
      if (e.key === "Enter") {
        handleSaveEdit(authorName);
      } else if (e.key === "Escape") {
        setEditingCell(null);
        setEditValue("");
      }
    },
    [handleSaveEdit]
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
                className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 hover:border-zinc-700 transition-colors"
              >
                {/* Avatar */}
                <div className="flex justify-center mb-4">
                  <div
                    className={`w-16 h-16 rounded-full ${colorClasses.bg} ${colorClasses.text} flex items-center justify-center font-bold text-xl`}
                  >
                    {initials}
                  </div>
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
                  {/* Ethnicity Badge */}
                  {editingCell?.author === author.name &&
                  editingCell?.field === "ethnicity" ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleSaveEdit(author.name)}
                      onKeyDown={(e) => handleKeyDown(e, author.name)}
                      autoFocus
                      className="w-full px-2 py-1 bg-zinc-800 border border-emerald-500 rounded text-xs text-zinc-200 focus:outline-none"
                    />
                  ) : (
                    <div
                      onClick={() => handleCellClick(author.name, "ethnicity")}
                      className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-300 cursor-pointer hover:bg-zinc-700 transition-colors"
                    >
                      {author.ethnicity ? (
                        <span>Ethnicity: {author.ethnicity}</span>
                      ) : (
                        <span className="text-zinc-500 italic">+ Add ethnicity</span>
                      )}
                    </div>
                  )}

                  {/* Nationality Badge */}
                  {editingCell?.author === author.name &&
                  editingCell?.field === "nationality" ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => handleSaveEdit(author.name)}
                      onKeyDown={(e) => handleKeyDown(e, author.name)}
                      autoFocus
                      className="w-full px-2 py-1 bg-zinc-800 border border-emerald-500 rounded text-xs text-zinc-200 focus:outline-none"
                    />
                  ) : (
                    <div
                      onClick={() => handleCellClick(author.name, "nationality")}
                      className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-300 cursor-pointer hover:bg-zinc-700 transition-colors"
                    >
                      {author.nationality ? (
                        <span>Nationality: {author.nationality}</span>
                      ) : (
                        <span className="text-zinc-500 italic">+ Add nationality</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
