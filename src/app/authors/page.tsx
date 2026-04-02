"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
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

export default function AuthorsPage() {
  const [authors, setAuthors] = useState<AuthorData[]>([]);
  const [filteredAuthors, setFilteredAuthors] = useState<AuthorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "bookCount",
    direction: "desc",
  });
  const [editingCell, setEditingCell] = useState<{
    author: string;
    field: "ethnicity" | "nationality";
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    fetchAuthors();
  }, []);

  useEffect(() => {
    filterAndSortAuthors();
  }, [authors, searchTerm, sortConfig]);

  const fetchAuthors = async () => {
    try {
      setLoading(true);
      const { data: books, error: booksError } = await supabase
        .from("books")
        .select("*");

      if (booksError) throw booksError;

      // Parse authors from books
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

      // Fetch author metadata from database
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

  const filterAndSortAuthors = () => {
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

    setFilteredAuthors(filtered);
  };

  const handleSort = (key: keyof AuthorData) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  const handleCellClick = (
    author: string,
    field: "ethnicity" | "nationality"
  ) => {
    const authorData = authors.find((a) => a.name === author);
    setEditingCell({ author, field });
    setEditValue(authorData?.[field] || "");
  };

  const handleSaveEdit = async (authorName: string) => {
    if (!editingCell) return;

    try {
      const authorData = authors.find((a) => a.name === authorName);
      if (!authorData) return;

      const { error } = await supabase.from("authors").upsert([
        {
          name: authorName,
          [editingCell.field]: editValue || null,
        },
      ]);

      if (error) throw error;

      // Update local state
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
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    authorName: string
  ) => {
    if (e.key === "Enter") {
      handleSaveEdit(authorName);
    } else if (e.key === "Escape") {
      setEditingCell(null);
      setEditValue("");
    }
  };

  const SortableHeader = ({ label, field }: { label: string; field: keyof AuthorData }) => (
    <th
      onClick={() => handleSort(field)}
      className="cursor-pointer select-none hover:bg-zinc-800 px-4 py-3 text-left font-semibold text-zinc-200"
    >
      <div className="flex items-center gap-2">
        {label}
        {sortConfig.key === field && (
          <span className="text-emerald-500">
            {sortConfig.direction === "desc" ? "↓" : "↑"}
          </span>
        )}
      </div>
    </th>
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
          <h1 className="text-4xl font-bold text-emerald-500">Authors</h1>
          <Link
            href="/library"
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-zinc-200 transition-colors"
          >
            Back to Library
          </Link>
        </div>

        {/* Stats */}
        <div className="text-sm text-zinc-400 mb-4">
          Total Authors: <span className="text-emerald-500 font-semibold">{filteredAuthors.length}</span>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Filter authors by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Table */}
      <div className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800">
              <tr>
                <SortableHeader label="Author Name" field="name" />
                <SortableHeader label="Ethnicity" field="ethnicity" />
                <SortableHeader label="Nationality" field="nationality" />
                <SortableHeader label="Books" field="bookCount" />
                <SortableHeader label="Read" field="readCount" />
                <SortableHeader label="Avg Rating" field="averageRating" />
              </tr>
            </thead>
            <tbody>
              {filteredAuthors.map((author, index) => (
                <tr
                  key={author.name}
                  className={`border-b border-zinc-800 ${
                    index % 2 === 0 ? "bg-zinc-900" : "bg-zinc-850"
                  } hover:bg-zinc-800 transition-colors`}
                >
                  <td className="px-4 py-3 font-medium text-emerald-400">
                    {author.name}
                  </td>
                  <td className="px-4 py-3">
                    {editingCell?.author === author.name &&
                    editingCell?.field === "ethnicity" ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleSaveEdit(author.name)}
                        onKeyDown={(e) => handleKeyDown(e, author.name)}
                        autoFocus
                        className="w-full px-2 py-1 bg-zinc-800 border border-emerald-500 rounded text-zinc-200 focus:outline-none"
                      />
                    ) : (
                      <span
                        onClick={() =>
                          handleCellClick(author.name, "ethnicity")
                        }
                        className="cursor-pointer hover:text-emerald-400 transition-colors py-1"
                      >
                        {author.ethnicity || "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingCell?.author === author.name &&
                    editingCell?.field === "nationality" ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleSaveEdit(author.name)}
                        onKeyDown={(e) => handleKeyDown(e, author.name)}
                        autoFocus
                        className="w-full px-2 py-1 bg-zinc-800 border border-emerald-500 rounded text-zinc-200 focus:outline-none"
                      />
                    ) : (
                      <span
                        onClick={() =>
                          handleCellClick(author.name, "nationality")
                        }
                        className="cursor-pointer hover:text-emerald-400 transition-colors py-1"
                      >
                        {author.nationality || "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-zinc-300">
                    {author.bookCount}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-zinc-300">
                    {author.readCount}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-zinc-300">
                    {author.averageRating !== null
                      ? author.averageRating.toFixed(1)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredAuthors.length === 0 && (
          <div className="p-8 text-center text-zinc-400">
            {searchTerm ? "No authors match your search." : "No authors found."}
          </div>
        )}
      </div>
    </div>
  );
}
