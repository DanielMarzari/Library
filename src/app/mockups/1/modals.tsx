"use client";

// Bento-styled modals that perform real DB mutations against the existing
// /api/* routes via the api client. Each modal accepts `onClose` and an
// optional `onSuccess` so the caller can refetch its data after a write.

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { api } from "@/lib/api-client";
import { searchBooks, enrichBook, lookupDoi, looksLikeDoi, type BookSearchResult } from "@/lib/bookLookup";
import type { Book } from "@/types/book";
import { bento, display } from "./theme";
import type { MockBook } from "../data";

// ---- Shared shell ----------------------------------------------------------

export function BentoModal({
  title,
  onClose,
  children,
  accent = bento.pink,
  size = "md",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  accent?: string;
  size?: "sm" | "md" | "lg";
}) {
  // ESC closes
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const widthClass =
    size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-lg";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${widthClass} max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl`}
        style={{ background: bento.bg }}
      >
        <header
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-3"
          style={{ background: bento.bg, borderBottom: `1px solid ${bento.ink}10` }}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: accent }} />
            <h2 className="text-lg font-bold" style={display}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full grid place-items-center text-lg"
            style={{ background: bento.card, color: bento.inkSoft }}
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ---- Form primitives -------------------------------------------------------

export const inputCls = "w-full bg-white border rounded-2xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF476F] focus:border-transparent";
export const labelCls = "block text-[10px] uppercase tracking-wider font-semibold mb-1.5";

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2.5 rounded-full text-sm font-semibold text-white disabled:opacity-50 ${className}`}
      style={{ background: bento.pink, ...display }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 rounded-full text-sm font-semibold ${className}`}
      style={{
        background: bento.card,
        color: bento.ink,
        border: `1px solid ${bento.ink}10`,
        ...display,
      }}
    >
      {children}
    </button>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div
      className="rounded-2xl px-3.5 py-2.5 text-sm mb-3"
      style={{ background: `${bento.pink}11`, color: bento.pink, border: `1px solid ${bento.pink}33` }}
    >
      {msg}
    </div>
  );
}

// ---- 1) ADD BOOK ----------------------------------------------------------

type AddMode = "choose" | "search" | "pick" | "confirm" | "manual" | "doi" | "doi-confirm";

export function AddBookModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<AddMode>("choose");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [selected, setSelected] = useState<BookSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // DOI flow
  const [doi, setDoi] = useState("");

  // Manual flow + confirm flow shared fields
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [pages, setPages] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [status, setStatus] = useState<Book["status"]>("not_read");

  // Article fields (DOI confirm)
  const [journal, setJournal] = useState("");
  const [year, setYear] = useState("");
  const [url, setUrl] = useState("");

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError("");
    setResults([]);
    const found = await searchBooks(q, 8);
    setSearching(false);
    if (found.length === 0) {
      setError(`No books found for "${q}". Try manual entry or DOI.`);
      return;
    }
    setResults(found);
    setMode("pick");
  };

  const selectResult = async (r: BookSearchResult) => {
    setSelected(r);
    setMode("confirm");
    setTitle(r.title);
    setAuthor(r.author);
    setIsbn(r.isbn || "");
    setPages(r.pages?.toString() || "");
    setCoverUrl(r.cover_url || "");
    // enrich in background
    enrichBook(r).then((enriched) => {
      if (enriched.cover_url && !coverUrl) setCoverUrl(enriched.cover_url);
      setSelected(enriched);
    });
  };

  const saveBook = async () => {
    if (!title.trim() || !author.trim()) {
      setError("Title and author are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.books.create({
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim() || undefined,
        cover_url: coverUrl.trim() || undefined,
        pages: pages ? parseInt(pages) : undefined,
        status,
        lcc: selected?.lcc,
        ddc: selected?.ddc,
        topics: selected?.topics?.length ? selected.topics : undefined,
      });
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save book.");
    } finally {
      setSaving(false);
    }
  };

  const handleDoi = async () => {
    const d = doi.trim();
    if (!d) return;
    if (!looksLikeDoi(d)) {
      setError("That doesn't look like a DOI (expected 10.xxxx/...).");
      return;
    }
    setSearching(true);
    setError("");
    const article = await lookupDoi(d);
    setSearching(false);
    if (!article) {
      setError(`Couldn't find an article for "${d}".`);
      return;
    }
    setTitle(article.title);
    setAuthor(article.author);
    setJournal(article.journal || "");
    setYear(article.publication_year ? String(article.publication_year) : "");
    setUrl(article.url || `https://doi.org/${article.doi}`);
    setPages(article.pages?.toString() || "");
    setMode("doi-confirm");
  };

  const saveArticle = async () => {
    if (!title.trim() || !author.trim()) {
      setError("Title and author are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.books.create({
        title: title.trim(),
        author: author.trim(),
        item_type: "article" as const,
        doi: doi.trim(),
        journal: journal.trim() || undefined,
        publication_year: year ? parseInt(year) : undefined,
        url: url.trim() || undefined,
        pages: pages ? parseInt(pages) : undefined,
        status,
      });
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save article.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BentoModal title="Add to library" onClose={onClose} accent={bento.pink}>
      <ErrorBanner msg={error} />

      {mode === "choose" && (
        <div className="space-y-3">
          <ChoiceButton
            color={bento.green}
            icon="🔍"
            title="Search by title, author, or ISBN"
            sub="Open Library & Google Books"
            onClick={() => setMode("search")}
          />
          <ChoiceButton
            color={bento.blue}
            icon="📄"
            title="Add article by DOI"
            sub="Crossref lookup"
            onClick={() => setMode("doi")}
          />
          <ChoiceButton
            color={bento.lilac}
            icon="✏️"
            title="Add manually"
            sub="Enter the details yourself"
            onClick={() => setMode("manual")}
          />
        </div>
      )}

      {mode === "search" && (
        <div>
          <label className={labelCls} style={{ color: bento.inkSoft, ...display }}>
            Title, author, or ISBN
          </label>
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. The Great Gatsby"
              className={inputCls}
            />
            <PrimaryButton onClick={handleSearch} disabled={!query.trim() || searching}>
              {searching ? "..." : "Search"}
            </PrimaryButton>
          </div>
          <div className="flex justify-between mt-4">
            <SecondaryButton onClick={() => setMode("choose")}>← Back</SecondaryButton>
          </div>
        </div>
      )}

      {mode === "pick" && (
        <div>
          <p className="text-xs mb-3" style={{ color: bento.inkSoft }}>
            {results.length} results · tap to choose
          </p>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => selectResult(r)}
                className="w-full flex gap-3 p-3 rounded-2xl text-left transition-colors hover:bg-white"
                style={{ background: bento.card }}
              >
                {r.cover_url ? (
                  <img
                    src={r.cover_url}
                    alt=""
                    className="w-10 h-14 object-cover rounded-md shadow flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-14 bg-gray-200 rounded-md flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-tight" style={display}>
                    {r.title}
                  </p>
                  <p className="text-xs" style={{ color: bento.inkSoft }}>
                    {r.author}
                    {r.publish_year && ` · ${r.publish_year}`}
                    {r.pages && ` · ${r.pages} pp`}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-4">
            <SecondaryButton onClick={() => setMode("search")}>← Search again</SecondaryButton>
          </div>
        </div>
      )}

      {mode === "confirm" && selected && (
        <div className="space-y-3">
          <div className="flex gap-3 mb-2">
            {coverUrl && (
              <img
                src={coverUrl}
                alt=""
                className="w-16 h-24 object-cover rounded-md shadow flex-shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs" style={{ color: bento.inkSoft }}>
                Found a match — review and save.
              </p>
            </div>
          </div>
          <Field label="Title" value={title} onChange={setTitle} />
          <Field label="Author" value={author} onChange={setAuthor} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="ISBN" value={isbn} onChange={setIsbn} />
            <Field label="Pages" value={pages} onChange={setPages} numeric />
          </div>
          <Field label="Cover URL" value={coverUrl} onChange={setCoverUrl} />
          <StatusPicker value={status} onChange={setStatus} />
          <div className="flex justify-between gap-2 pt-2">
            <SecondaryButton onClick={() => setMode("pick")}>← Back</SecondaryButton>
            <PrimaryButton onClick={saveBook} disabled={saving}>
              {saving ? "Saving..." : "Add book"}
            </PrimaryButton>
          </div>
        </div>
      )}

      {mode === "manual" && (
        <div className="space-y-3">
          <Field label="Title *" value={title} onChange={setTitle} placeholder="Book title" />
          <Field label="Author *" value={author} onChange={setAuthor} placeholder="Author name" />
          <div className="grid grid-cols-2 gap-2">
            <Field label="ISBN" value={isbn} onChange={setIsbn} />
            <Field label="Pages" value={pages} onChange={setPages} numeric />
          </div>
          <Field label="Cover URL" value={coverUrl} onChange={setCoverUrl} placeholder="https://..." />
          <StatusPicker value={status} onChange={setStatus} />
          <div className="flex justify-between gap-2 pt-2">
            <SecondaryButton onClick={() => setMode("choose")}>← Back</SecondaryButton>
            <PrimaryButton
              onClick={saveBook}
              disabled={saving || !title.trim() || !author.trim()}
            >
              {saving ? "Saving..." : "Add book"}
            </PrimaryButton>
          </div>
        </div>
      )}

      {mode === "doi" && (
        <div>
          <label className={labelCls} style={{ color: bento.inkSoft, ...display }}>
            DOI
          </label>
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={doi}
              onChange={(e) => setDoi(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDoi()}
              placeholder="10.1038/nature12373"
              className={inputCls}
            />
            <PrimaryButton onClick={handleDoi} disabled={!doi.trim() || searching}>
              {searching ? "..." : "Lookup"}
            </PrimaryButton>
          </div>
          <p className="text-[11px] mt-2" style={{ color: bento.inkSoft }}>
            Fetches metadata from Crossref.
          </p>
          <div className="flex justify-between mt-4">
            <SecondaryButton onClick={() => setMode("choose")}>← Back</SecondaryButton>
          </div>
        </div>
      )}

      {mode === "doi-confirm" && (
        <div className="space-y-3">
          <div
            className="rounded-2xl p-3 text-xs"
            style={{ background: bento.lilac + "33", color: bento.ink }}
          >
            DOI: <span className="font-mono">{doi}</span>
          </div>
          <Field label="Title *" value={title} onChange={setTitle} />
          <Field label="Author(s) *" value={author} onChange={setAuthor} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Journal" value={journal} onChange={setJournal} />
            <Field label="Year" value={year} onChange={setYear} numeric />
          </div>
          <Field label="URL" value={url} onChange={setUrl} />
          <StatusPicker value={status} onChange={setStatus} />
          <div className="flex justify-between gap-2 pt-2">
            <SecondaryButton onClick={() => setMode("doi")}>← Back</SecondaryButton>
            <PrimaryButton onClick={saveArticle} disabled={saving}>
              {saving ? "Saving..." : "Add article"}
            </PrimaryButton>
          </div>
        </div>
      )}
    </BentoModal>
  );
}

function ChoiceButton({
  color,
  icon,
  title,
  sub,
  onClick,
}: {
  color: string;
  icon: string;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-transform active:scale-[0.99]"
      style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}
    >
      <div
        className="w-12 h-12 rounded-2xl grid place-items-center text-2xl flex-shrink-0"
        style={{ background: color + "33" }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-tight" style={display}>
          {title}
        </p>
        <p className="text-xs mt-0.5" style={{ color: bento.inkSoft }}>
          {sub}
        </p>
      </div>
      <span style={{ color: bento.inkSoft }}>→</span>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  numeric,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  numeric?: boolean;
}) {
  return (
    <div>
      <label className={labelCls} style={{ color: bento.inkSoft, ...display }}>
        {label}
      </label>
      <input
        type="text"
        inputMode={numeric ? "numeric" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
    </div>
  );
}

function StatusPicker({
  value,
  onChange,
}: {
  value: Book["status"];
  onChange: (v: Book["status"]) => void;
}) {
  const options: { key: Book["status"]; label: string; color: string }[] = [
    { key: "not_read", label: "Up next", color: bento.lilac },
    { key: "reading", label: "Reading", color: bento.yellow },
    { key: "read", label: "Read", color: bento.green },
  ];
  return (
    <div>
      <label className={labelCls} style={{ color: bento.inkSoft, ...display }}>
        Status
      </label>
      <div className="flex gap-1.5">
        {options.map((o) => {
          const active = value === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onChange(o.key)}
              className="flex-1 px-3 py-2 rounded-full text-xs font-semibold"
              style={{
                background: active ? o.color : bento.card,
                color: active ? bento.ink : bento.inkSoft,
                border: active ? "none" : `1px solid ${bento.ink}10`,
                ...display,
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- 2) LOG PROGRESS -------------------------------------------------------

export function LogProgressModal({
  book,
  onClose,
  onSuccess,
}: {
  book: MockBook;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [pagesRead, setPagesRead] = useState("");
  const [currentPage, setCurrentPage] = useState(
    book.current_page ? String(book.current_page) : ""
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    const pr = parseInt(pagesRead);
    const cp = parseInt(currentPage);
    if (!pr && !cp && !notes.trim()) {
      setError("Add at least pages read, current page, or a note.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.readingUpdates.create({
        book_id: book.id,
        pages_read: pr || 0,
        current_page: cp || 0,
        notes: notes.trim() || undefined,
      });
      // Also update the book's current_page so progress bars refresh
      if (cp > 0) {
        await api.books.update(book.id, { current_page: cp });
      }
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to log progress.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BentoModal title="Log progress" onClose={onClose} accent={bento.yellow}>
      <ErrorBanner msg={error} />

      <div className="flex gap-3 mb-4">
        {book.cover ? (
          <img
            src={book.cover}
            alt=""
            className="w-12 h-18 object-cover rounded-md shadow flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-18 rounded-md flex-shrink-0" style={{ background: bento.card }} />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight" style={display}>
            {book.title}
          </p>
          <p className="text-xs" style={{ color: bento.inkSoft }}>
            {book.author}
            {book.pages > 0 && ` · ${book.pages} pp`}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Pages just read"
            value={pagesRead}
            onChange={setPagesRead}
            placeholder="0"
            numeric
          />
          <Field
            label="Now on page"
            value={currentPage}
            onChange={setCurrentPage}
            placeholder="0"
            numeric
          />
        </div>
        <div>
          <label className={labelCls} style={{ color: bento.inkSoft, ...display }}>
            Note (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you think?"
            rows={3}
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Log"}
        </PrimaryButton>
      </div>
    </BentoModal>
  );
}

// ---- 3) EDIT BOOK ----------------------------------------------------------

export function EditBookModal({
  book,
  onClose,
  onSuccess,
  onDelete,
}: {
  book: MockBook;
  onClose: () => void;
  onSuccess: () => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [pages, setPages] = useState(book.pages ? String(book.pages) : "");
  const [coverUrl, setCoverUrl] = useState(book.cover_url || "");
  const [status, setStatus] = useState<Book["status"]>(book.status);
  const [rating, setRating] = useState(book.rating || 0);
  const [favorite, setFavorite] = useState(!!book.favorite);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!title.trim() || !author.trim()) {
      setError("Title and author are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const now = new Date().toISOString().split("T")[0];
      await api.books.update(book.id, {
        title: title.trim(),
        author: author.trim(),
        pages: pages ? parseInt(pages) : undefined,
        cover_url: coverUrl.trim() || undefined,
        status,
        rating: rating || undefined,
        favorite,
        // Auto-stamp completion when transitioning to read
        complete_date:
          status === "read" && book.status !== "read" ? now : undefined,
        start_date:
          status === "reading" && !book.start_date ? now : undefined,
      });
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!confirm("Delete this book? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await api.books.delete(book.id);
      onDelete?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete.");
      setDeleting(false);
    }
  };

  return (
    <BentoModal title="Edit book" onClose={onClose} accent={bento.blue}>
      <ErrorBanner msg={error} />

      <div className="space-y-3">
        <Field label="Title *" value={title} onChange={setTitle} />
        <Field label="Author *" value={author} onChange={setAuthor} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Pages" value={pages} onChange={setPages} numeric />
          <div>
            <label className={labelCls} style={{ color: bento.inkSoft, ...display }}>
              Rating
            </label>
            <StarPicker value={rating} onChange={setRating} />
          </div>
        </div>
        <Field label="Cover URL" value={coverUrl} onChange={setCoverUrl} />
        <StatusPicker value={status} onChange={setStatus} />

        <label className="flex items-center gap-2 mt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={favorite}
            onChange={(e) => setFavorite(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium" style={display}>
            ⭐ Favorite
          </span>
        </label>
      </div>

      <div className="flex justify-between gap-2 pt-4">
        <button
          onClick={del}
          disabled={deleting}
          className="text-sm font-semibold"
          style={{ color: bento.pink, ...display }}
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
        <div className="flex gap-2">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </PrimaryButton>
        </div>
      </div>
    </BentoModal>
  );
}

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? 0 : n)}
          className="text-2xl leading-none transition-transform hover:scale-110"
          style={{ color: n <= value ? bento.yellow : bento.ink + "20" }}
        >
          ★
        </button>
      ))}
      {value > 0 && (
        <button
          type="button"
          onClick={() => onChange(0)}
          className="ml-2 text-[10px] uppercase tracking-wider"
          style={{ color: bento.inkSoft, ...display }}
        >
          clear
        </button>
      )}
    </div>
  );
}

// ---- 4) LEND BOOK ----------------------------------------------------------

export function LendBookModal({
  books,
  onClose,
  onSuccess,
}: {
  books: MockBook[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [bookId, setBookId] = useState("");
  const [borrower, setBorrower] = useState("");
  const [lentDate, setLentDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const selectableBooks = books.filter((b) =>
    !search.trim() ||
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.author.toLowerCase().includes(search.toLowerCase())
  );

  const save = async () => {
    if (!bookId) {
      setError("Pick a book to lend.");
      return;
    }
    if (!borrower.trim()) {
      setError("Who's borrowing it?");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.lending.create({
        book_id: bookId,
        borrower_name: borrower.trim(),
        lent_date: lentDate,
        due_date: dueDate || undefined,
        notes: notes.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to log lending.");
    } finally {
      setSaving(false);
    }
  };

  const selected = books.find((b) => b.id === bookId);

  return (
    <BentoModal title="Lend a book" onClose={onClose} accent={bento.orange}>
      <ErrorBanner msg={error} />

      {!selected ? (
        <div>
          <label className={labelCls} style={{ color: bento.inkSoft, ...display }}>
            Which book?
          </label>
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your library..."
            className={`${inputCls} mb-3`}
          />
          <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
            {selectableBooks.slice(0, 20).map((b) => (
              <button
                key={b.id}
                onClick={() => setBookId(b.id)}
                className="w-full flex gap-3 p-2.5 rounded-2xl text-left transition-colors hover:bg-white"
                style={{ background: bento.card }}
              >
                {b.cover ? (
                  <img
                    src={b.cover}
                    alt=""
                    className="w-8 h-12 object-cover rounded shadow flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-12 rounded flex-shrink-0" style={{ background: bento.ink + "10" }} />
                )}
                <div className="min-w-0 flex-1 self-center">
                  <p className="text-sm font-bold leading-tight line-clamp-1" style={display}>
                    {b.title}
                  </p>
                  <p className="text-[11px]" style={{ color: bento.inkSoft }}>
                    {b.author}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-3 p-3 rounded-2xl" style={{ background: bento.card }}>
            {selected.cover ? (
              <img src={selected.cover} alt="" className="w-10 h-14 object-cover rounded shadow" />
            ) : (
              <div className="w-10 h-14 rounded" style={{ background: bento.ink + "10" }} />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight" style={display}>
                {selected.title}
              </p>
              <p className="text-xs" style={{ color: bento.inkSoft }}>
                {selected.author}
              </p>
            </div>
            <button
              onClick={() => setBookId("")}
              className="text-xs font-semibold"
              style={{ color: bento.pink, ...display }}
            >
              Change
            </button>
          </div>

          <Field label="Borrower name *" value={borrower} onChange={setBorrower} placeholder="Sarah K." />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls} style={{ color: bento.inkSoft, ...display }}>
                Lent on
              </label>
              <input
                type="date"
                value={lentDate}
                onChange={(e) => setLentDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} style={{ color: bento.inkSoft, ...display }}>
                Due (optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls} style={{ color: bento.inkSoft, ...display }}>
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={inputCls}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Lend it"}
            </PrimaryButton>
          </div>
        </div>
      )}
    </BentoModal>
  );
}

// ---- 5) ADD RECOMMENDATION -------------------------------------------------

export function AddRecommendationModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [recommendedBy, setRecommendedBy] = useState("");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const titleRef = useRef<HTMLInputElement>(null);

  // Quick lookup helper — if title looks substantial, search Open Library and fill missing fields
  const quickFill = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const found = await searchBooks(title.trim(), 1);
    setSaving(false);
    if (found.length > 0) {
      const r = found[0];
      if (!author) setAuthor(r.author);
      if (!coverUrl && r.cover_url) setCoverUrl(r.cover_url);
    }
  };

  const save = async () => {
    if (!title.trim()) {
      setError("Title is required.");
      titleRef.current?.focus();
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.recommendations.create({
        title: title.trim(),
        author: author.trim() || undefined,
        recommended_by: recommendedBy.trim() || undefined,
        topic: topic.trim() || undefined,
        notes: notes.trim() || undefined,
        cover_url: coverUrl.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BentoModal title="Add recommendation" onClose={onClose} accent={bento.lilac}>
      <ErrorBanner msg={error} />

      <div className="space-y-3">
        <div>
          <label className={labelCls} style={{ color: bento.inkSoft, ...display }}>
            Title *
          </label>
          <div className="flex gap-2">
            <input
              ref={titleRef}
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="The Idiot"
              className={inputCls}
            />
            <SecondaryButton onClick={quickFill}>Lookup</SecondaryButton>
          </div>
        </div>
        <Field label="Author" value={author} onChange={setAuthor} />
        <Field label="Recommended by" value={recommendedBy} onChange={setRecommendedBy} placeholder="Sarah K., Ezra Klein Show, ..." />
        <Field label="Topic" value={topic} onChange={setTopic} placeholder="Coming of age" />
        <Field label="Cover URL" value={coverUrl} onChange={setCoverUrl} />
        <div>
          <label className={labelCls} style={{ color: bento.inkSoft, ...display }}>
            Why?
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="What did they say about it?"
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton onClick={save} disabled={saving || !title.trim()}>
          {saving ? "Saving..." : "Add"}
        </PrimaryButton>
      </div>
    </BentoModal>
  );
}

// ---- 6) SET READING GOAL ---------------------------------------------------

export function SetReadingGoalModal({
  year,
  current,
  onClose,
  onSuccess,
}: {
  year: number;
  current?: { id: string; target: number };
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [target, setTarget] = useState(String(current?.target || 24));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    const n = parseInt(target);
    if (!n || n < 1) {
      setError("Pick a target ≥ 1.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (current) {
        await api.readingGoals.update(current.id, { year, target: n });
      } else {
        await api.readingGoals.create({ year, target: n });
      }
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BentoModal title={`Goal · ${year}`} onClose={onClose} accent={bento.green}>
      <ErrorBanner msg={error} />
      <p className="text-sm mb-3" style={{ color: bento.inkSoft }}>
        How many books do you want to read this year?
      </p>
      <Field label="Target" value={target} onChange={setTarget} numeric />
      <div className="flex gap-1.5 mt-2">
        {[12, 24, 36, 52].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setTarget(String(n))}
            className="flex-1 px-2 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: target === String(n) ? bento.green : bento.card,
              color: target === String(n) ? bento.ink : bento.inkSoft,
              border: `1px solid ${bento.ink}10`,
              ...display,
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save goal"}
        </PrimaryButton>
      </div>
    </BentoModal>
  );
}

// ---- 7) ADD LEARNING GOAL --------------------------------------------------

export function AddLearningGoalModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(bento.pink);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const COLORS = [bento.pink, bento.yellow, bento.green, bento.lilac, bento.blue, bento.orange];

  const save = async () => {
    if (!name.trim()) {
      setError("Name a focus.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.learningGoals.create({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      });
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BentoModal title="New learning goal" onClose={onClose} accent={bento.lilac}>
      <ErrorBanner msg={error} />
      <Field label="Name *" value={name} onChange={setName} placeholder="Russian Lit Deep Dive" />
      <div className="mt-3">
        <label className={labelCls} style={{ color: bento.inkSoft, ...display }}>
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="What are you trying to learn?"
          className={inputCls}
        />
      </div>
      <div className="mt-3">
        <label className={labelCls} style={{ color: bento.inkSoft, ...display }}>
          Color
        </label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full"
              style={{
                background: c,
                outline: color === c ? `3px solid ${bento.ink}` : "none",
                outlineOffset: 2,
              }}
              aria-label={c}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton onClick={save} disabled={saving || !name.trim()}>
          {saving ? "Saving..." : "Create"}
        </PrimaryButton>
      </div>
    </BentoModal>
  );
}
