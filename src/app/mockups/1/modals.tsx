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
//
// Full editor — pulls the complete Book record from /api/books/[id] so it can
// edit every field (not just what's in MockBook). Supports articles too via
// item_type === "article" — DOI / journal / year / URL sections appear when
// editing an article. Includes Duplicate (creates a "(copy)" of the row) and
// Refetch (re-enriches via Open Library / Google Books and fills empty fields).

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
  // Full record state — populated from /api/books/[id]
  const [loading, setLoading] = useState(true);
  const [full, setFull] = useState<Book | null>(null);

  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [isbn, setIsbn] = useState("");
  const [coverUrl, setCoverUrl] = useState(book.cover_url || "");
  const [status, setStatus] = useState<Book["status"]>(book.status);
  const [rating, setRating] = useState(book.rating || 0);
  const [favorite, setFavorite] = useState(!!book.favorite);
  const [description, setDescription] = useState("");

  // Page details
  const [pages, setPages] = useState(book.pages ? String(book.pages) : "");
  const [introPages, setIntroPages] = useState("");
  const [startPage, setStartPage] = useState("1");
  const [endPage, setEndPage] = useState("");
  const [currentPage, setCurrentPage] = useState("");

  // Dates
  const [startDate, setStartDate] = useState(book.start_date || "");
  const [completeDate, setCompleteDate] = useState(book.complete_date || "");

  // Acquisition / classification
  const [source, setSource] = useState(book.source || "");
  const [volume, setVolume] = useState("");
  const [lcc, setLcc] = useState("");
  const [ddc, setDdc] = useState("");

  // Topics — chip editor (manual + auto from OL)
  const [topics, setTopics] = useState<string[]>([]);
  const [autoTopics, setAutoTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState("");

  // Article fields
  const [itemType, setItemType] = useState<"book" | "article">("book");
  const [doi, setDoi] = useState("");
  const [journal, setJournal] = useState("");
  const [pubYear, setPubYear] = useState("");
  const [url, setUrl] = useState("");

  // UI state
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refetching, setRefetching] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [refetchMsg, setRefetchMsg] = useState("");
  const [error, setError] = useState("");

  // Fetch the full record so we can edit every field, not just the MockBook subset.
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const f = await api.books.get(book.id);
        if (cancel) return;
        setFull(f);
        setTitle(f.title || "");
        setAuthor(f.author || "");
        setIsbn(f.isbn || "");
        setCoverUrl(f.cover_url || "");
        setStatus(f.status);
        setRating(f.rating || 0);
        setFavorite(!!f.favorite);
        setDescription(f.description || "");
        setPages(f.pages ? String(f.pages) : "");
        setIntroPages(f.intro_pages != null ? String(f.intro_pages) : "0");
        setStartPage(f.start_page != null ? String(f.start_page) : "1");
        setEndPage(f.end_page != null ? String(f.end_page) : "");
        setCurrentPage(f.current_page != null ? String(f.current_page) : "");
        setStartDate(f.start_date || "");
        setCompleteDate(f.complete_date || "");
        setSource(f.source || "");
        setVolume(f.volume || "");
        setLcc(f.lcc || "");
        setDdc(f.ddc || "");
        setTopics(Array.isArray(f.topics) ? f.topics : []);
        setAutoTopics(Array.isArray(f.auto_topics) ? f.auto_topics : []);
        setItemType((f.item_type as "book" | "article") || "book");
        setDoi(f.doi || "");
        setJournal(f.journal || "");
        setPubYear(f.publication_year != null ? String(f.publication_year) : "");
        setUrl(f.url || "");
      } catch (e) {
        if (!cancel) setError(e instanceof Error ? e.message : "Failed to load book.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [book.id]);

  const addTopic = () => {
    const t = topicInput.trim();
    if (t && !topics.includes(t)) {
      setTopics([...topics, t]);
      setTopicInput("");
    }
  };
  const removeTopic = (t: string) => setTopics(topics.filter((x) => x !== t));
  const removeAutoTopic = (t: string) =>
    setAutoTopics(autoTopics.filter((x) => x !== t));
  const promoteAutoTopic = (t: string) => {
    if (!topics.includes(t)) setTopics([...topics, t]);
    setAutoTopics(autoTopics.filter((x) => x !== t));
  };

  // -- Save: send everything through PUT /api/books/[id]
  const save = async () => {
    if (!title.trim() || !author.trim()) {
      setError("Title and author are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const today = new Date().toISOString().split("T")[0];
      // Auto-stamp dates on status transitions when user didn't set them
      const autoStart =
        status === "reading" && !startDate ? today : startDate || undefined;
      const autoComplete =
        status === "read" && !completeDate ? today : completeDate || undefined;

      await api.books.update(book.id, {
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim() || undefined,
        cover_url: coverUrl.trim() || undefined,
        status,
        rating: rating || undefined,
        favorite,
        description: description.trim() || undefined,
        pages: pages ? parseInt(pages) : undefined,
        intro_pages: introPages ? parseInt(introPages) : 0,
        start_page: startPage ? parseInt(startPage) : 1,
        end_page: endPage ? parseInt(endPage) : undefined,
        current_page: currentPage ? parseInt(currentPage) : undefined,
        start_date: autoStart,
        complete_date: autoComplete,
        source: source.trim() || undefined,
        volume: volume.trim() || undefined,
        lcc: lcc.trim() || undefined,
        ddc: ddc.trim() || undefined,
        topics: topics.length > 0 ? topics : undefined,
        auto_topics: autoTopics.length > 0 ? autoTopics : undefined,
        item_type: itemType,
        doi: itemType === "article" ? doi.trim() || undefined : undefined,
        journal: itemType === "article" ? journal.trim() || undefined : undefined,
        publication_year:
          itemType === "article" && pubYear ? parseInt(pubYear) : undefined,
        url: itemType === "article" ? url.trim() || undefined : undefined,
      });
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  // -- Re-fetch from Open Library / Google Books to fill empty fields
  const refetchFromOpenLibrary = async () => {
    setRefetching(true);
    setRefetchMsg("");
    setError("");
    try {
      const query = isbn.trim() || title.trim();
      if (!query) {
        setError("Need an ISBN or title to re-fetch.");
        return;
      }
      const found = await searchBooks(query, 1);
      if (found.length === 0) {
        setRefetchMsg("No matches found.");
        return;
      }
      const enriched = await enrichBook(found[0]);
      const filled: string[] = [];
      if (enriched.cover_url && !coverUrl) {
        setCoverUrl(enriched.cover_url);
        filled.push("cover");
      }
      if (enriched.pages && !pages) {
        setPages(String(enriched.pages));
        if (!endPage) setEndPage(String(enriched.pages));
        filled.push("pages");
      }
      if (enriched.lcc && !lcc) {
        setLcc(enriched.lcc);
        filled.push("LCC");
      }
      if (enriched.ddc && !ddc) {
        setDdc(enriched.ddc);
        filled.push("DDC");
      }
      if (enriched.isbn && !isbn) {
        setIsbn(enriched.isbn);
        filled.push("ISBN");
      }
      if (enriched.description && !description) {
        setDescription(enriched.description);
        filled.push("description");
      }
      if (enriched.topics?.length && autoTopics.length === 0) {
        setAutoTopics(enriched.topics);
        filled.push("topics");
      }
      setRefetchMsg(
        filled.length > 0 ? `Filled: ${filled.join(", ")}.` : "Everything already set."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Re-fetch failed.");
    } finally {
      setRefetching(false);
    }
  };

  // -- Duplicate: creates a near-copy with "(copy)" suffix in not_read state
  const duplicate = async () => {
    if (!confirm(`Duplicate "${title}"?`)) return;
    setDuplicating(true);
    setError("");
    try {
      await api.books.create({
        title: `${title} (copy)`,
        author,
        isbn: isbn || undefined,
        cover_url: coverUrl || undefined,
        description: description || undefined,
        pages: pages ? parseInt(pages) : undefined,
        intro_pages: introPages ? parseInt(introPages) : 0,
        start_page: startPage ? parseInt(startPage) : 1,
        end_page: endPage ? parseInt(endPage) : undefined,
        status: "not_read",
        source: source || undefined,
        volume: volume || undefined,
        lcc: lcc || undefined,
        ddc: ddc || undefined,
        topics: topics.length > 0 ? topics : undefined,
        auto_topics: autoTopics.length > 0 ? autoTopics : undefined,
        item_type: itemType,
        doi: itemType === "article" ? doi || undefined : undefined,
        journal: itemType === "article" ? journal || undefined : undefined,
        publication_year:
          itemType === "article" && pubYear ? parseInt(pubYear) : undefined,
        url: itemType === "article" ? url || undefined : undefined,
        favorite: false,
      });
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Duplicate failed.");
    } finally {
      setDuplicating(false);
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

  // Computed reading_pages from page details (for display)
  const computedReadingPages = (() => {
    const ep = parseInt(endPage) || 0;
    const sp = parseInt(startPage) || 1;
    const ip = parseInt(introPages) || 0;
    return ep > 0 ? ep - sp + 1 + ip : null;
  })();

  return (
    <BentoModal title={itemType === "article" ? "Edit article" : "Edit book"} onClose={onClose} accent={bento.blue} size="lg">
      <ErrorBanner msg={error} />

      {loading ? (
        <div className="py-10 text-center text-sm" style={{ color: bento.inkSoft }}>
          Loading full record...
        </div>
      ) : (
        <>
          {/* Action bar */}
          <div className="flex gap-2 mb-5 flex-wrap">
            <button
              onClick={refetchFromOpenLibrary}
              disabled={refetching || !!(itemType === "article")}
              className="px-3 py-2 rounded-full text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
              style={{
                background: bento.lilac,
                color: bento.ink,
                ...display,
              }}
              title={itemType === "article" ? "Re-fetch is for books only" : "Fill empty fields from Open Library"}
            >
              {refetching ? "Fetching..." : "↻ Re-fetch metadata"}
            </button>
            <button
              onClick={duplicate}
              disabled={duplicating}
              className="px-3 py-2 rounded-full text-xs font-semibold disabled:opacity-50"
              style={{
                background: bento.card,
                color: bento.ink,
                border: `1px solid ${bento.ink}10`,
                ...display,
              }}
            >
              {duplicating ? "..." : "⧉ Duplicate"}
            </button>
            <button
              onClick={() => setItemType(itemType === "book" ? "article" : "book")}
              className="px-3 py-2 rounded-full text-xs font-semibold"
              style={{
                background: bento.card,
                color: bento.inkSoft,
                border: `1px solid ${bento.ink}10`,
                ...display,
              }}
            >
              Type: {itemType === "article" ? "📄 Article" : "📚 Book"} (switch)
            </button>
          </div>

          {refetchMsg && (
            <div
              className="mb-4 rounded-2xl px-3.5 py-2 text-sm"
              style={{ background: bento.green + "22", color: bento.ink }}
            >
              {refetchMsg}
            </div>
          )}

          {/* ---- Identity ---- */}
          <SectionLabel>Identity</SectionLabel>
          <div className="space-y-3 mb-5">
            <Field label="Title *" value={title} onChange={setTitle} />
            <Field label="Author *" value={author} onChange={setAuthor} />
            {itemType === "book" && (
              <Field label="ISBN" value={isbn} onChange={setIsbn} />
            )}
            <Field label="Cover URL" value={coverUrl} onChange={setCoverUrl} />
            {coverUrl && (
              <div className="flex items-center gap-3">
                <img
                  src={coverUrl}
                  alt=""
                  className="w-14 h-20 object-cover rounded-md shadow"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                />
                <span className="text-xs" style={{ color: bento.inkSoft }}>
                  Cover preview
                </span>
              </div>
            )}
          </div>

          {/* ---- Article-only ---- */}
          {itemType === "article" && (
            <>
              <SectionLabel>Article metadata</SectionLabel>
              <div className="space-y-3 mb-5">
                <Field label="DOI" value={doi} onChange={setDoi} placeholder="10.1038/nature12373" />
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Journal" value={journal} onChange={setJournal} />
                  <Field label="Year" value={pubYear} onChange={setPubYear} numeric />
                </div>
                <Field label="URL" value={url} onChange={setUrl} />
              </div>
            </>
          )}

          {/* ---- Status / rating / dates ---- */}
          <SectionLabel>Status &amp; rating</SectionLabel>
          <div className="space-y-3 mb-5">
            <StatusPicker value={status} onChange={setStatus} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: bento.inkSoft, ...display }}>
                  Rating
                </label>
                <StarPicker value={rating} onChange={setRating} />
              </div>
              <label className="flex items-end gap-2 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={favorite}
                  onChange={(e) => setFavorite(e.target.checked)}
                  className="w-5 h-5"
                />
                <span className="text-sm font-medium" style={display}>
                  ⭐ Favorite
                </span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls} style={{ color: bento.inkSoft, ...display }}>
                  Started
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} style={{ color: bento.inkSoft, ...display }}>
                  Finished
                </label>
                <input
                  type="date"
                  value={completeDate}
                  onChange={(e) => setCompleteDate(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* ---- Page details ---- */}
          <SectionLabel>Page details</SectionLabel>
          <div className="space-y-3 mb-5">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Total pages" value={pages} onChange={setPages} numeric />
              <Field label="Current page" value={currentPage} onChange={setCurrentPage} numeric />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Intro (roman)" value={introPages} onChange={setIntroPages} numeric placeholder="0" />
              <Field label="Start page" value={startPage} onChange={setStartPage} numeric placeholder="1" />
              <Field label="End page" value={endPage} onChange={setEndPage} numeric />
            </div>
            {computedReadingPages !== null && (
              <p className="text-xs" style={{ color: bento.inkSoft }}>
                Reading pages:{" "}
                <span className="font-bold" style={{ ...display, color: bento.ink }}>
                  {computedReadingPages}
                </span>
              </p>
            )}
          </div>

          {/* ---- Acquisition & classification ---- */}
          <SectionLabel>Acquisition &amp; classification</SectionLabel>
          <div className="space-y-3 mb-5">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Source" value={source} onChange={setSource} placeholder="Strand, Gift..." />
              <Field label="Volume" value={volume} onChange={setVolume} placeholder="Vol. 1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="LCC" value={lcc} onChange={setLcc} placeholder="PR4034.P7" />
              <Field label="DDC" value={ddc} onChange={setDdc} placeholder="823.7" />
            </div>
          </div>

          {/* ---- Topics ---- */}
          <SectionLabel>Topics</SectionLabel>
          <div className="space-y-2 mb-5">
            {topics.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {topics.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: bento.pink, color: "#FFF", ...display }}
                  >
                    {t}
                    <button
                      onClick={() => removeTopic(t)}
                      className="opacity-70 hover:opacity-100 ml-0.5"
                      title="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTopic();
                  }
                }}
                placeholder="Add a topic..."
                className={inputCls}
              />
              <button
                onClick={addTopic}
                disabled={!topicInput.trim()}
                className="px-3 py-2 rounded-2xl text-xs font-semibold disabled:opacity-50"
                style={{ background: bento.ink, color: bento.bg, ...display }}
              >
                Add
              </button>
            </div>
            {autoTopics.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: bento.inkSoft, ...display }}>
                  From Open Library — click to keep, × to drop
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {autoTopics.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                      style={{ background: bento.bg, color: bento.inkSoft, border: `1px solid ${bento.ink}10` }}
                    >
                      <button
                        onClick={() => promoteAutoTopic(t)}
                        className="hover:text-pink-600"
                        title="Promote to topics"
                        style={{ ...display, color: bento.ink }}
                      >
                        {t}
                      </button>
                      <button
                        onClick={() => removeAutoTopic(t)}
                        className="opacity-70 hover:opacity-100 ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ---- Notes ---- */}
          <SectionLabel>Notes</SectionLabel>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Description, summary, or personal notes..."
            className={`${inputCls} mb-5`}
          />

          {/* ---- Footer actions ---- */}
          <div className="flex justify-between gap-2 pt-3 border-t" style={{ borderColor: bento.ink + "10" }}>
            <button
              onClick={del}
              disabled={deleting}
              className="text-sm font-semibold disabled:opacity-50"
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
        </>
      )}
    </BentoModal>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-2 mt-2"
      style={{ color: bento.inkSoft, ...display }}
    >
      {children}
    </p>
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
//
// Supports BOOKS and ARTICLES. Lookup is optional — if Open Library / Crossref
// can't find it, the user can fill in fields by hand and save anyway. The
// modal never blocks you when an outside source has nothing to say.

type RecType = "book" | "article";
type LookupState = "idle" | "searching" | "found" | "not_found";

export function AddRecommendationModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [recType, setRecType] = useState<RecType>("book");

  // Shared fields
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [recommendedBy, setRecommendedBy] = useState("");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  // Book-specific
  const [isbn, setIsbn] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Article-specific
  const [doi, setDoi] = useState("");
  const [journal, setJournal] = useState("");
  const [url, setUrl] = useState("");
  const [pubYear, setPubYear] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [lookupMsg, setLookupMsg] = useState("");

  const titleRef = useRef<HTMLInputElement>(null);

  // -- Book lookup (Open Library / Google Books)
  const lookupBook = async () => {
    const q = (searchQuery || isbn || title).trim();
    if (!q) {
      setLookupState("not_found");
      setLookupMsg("Enter a title, author, or ISBN to search.");
      return;
    }
    setLookupState("searching");
    setLookupMsg("");
    try {
      const found = await searchBooks(q, 1);
      if (found.length === 0) {
        setLookupState("not_found");
        setLookupMsg(`No match in Open Library / Google Books for "${q}". Fill in by hand and save anyway.`);
        return;
      }
      const r = found[0];
      // Only fill empty fields — never clobber user input
      if (!title.trim()) setTitle(r.title);
      if (!author.trim()) setAuthor(r.author);
      if (!isbn.trim() && r.isbn) setIsbn(r.isbn);
      if (!coverUrl.trim() && r.cover_url) setCoverUrl(r.cover_url);
      setLookupState("found");
      setLookupMsg(`Found: "${r.title}" by ${r.author}.`);
    } catch (e) {
      setLookupState("not_found");
      setLookupMsg(
        `Lookup failed${e instanceof Error ? ` (${e.message})` : ""}. Fill in by hand if you'd like.`
      );
    }
  };

  // -- DOI lookup (Crossref)
  const lookupArticle = async () => {
    const d = doi.trim();
    if (!d) {
      setLookupState("not_found");
      setLookupMsg("Enter a DOI to search Crossref.");
      return;
    }
    if (!looksLikeDoi(d)) {
      setLookupState("not_found");
      setLookupMsg(`"${d}" doesn't look like a DOI. Expected format: 10.xxxx/...`);
      return;
    }
    setLookupState("searching");
    setLookupMsg("");
    try {
      const found = await lookupDoi(d);
      if (!found) {
        setLookupState("not_found");
        setLookupMsg(`Crossref had no record for "${d}". Fill in by hand and save anyway.`);
        return;
      }
      if (!title.trim()) setTitle(found.title);
      if (!author.trim()) setAuthor(found.author);
      if (!journal.trim() && found.journal) setJournal(found.journal);
      if (!pubYear.trim() && found.publication_year) setPubYear(String(found.publication_year));
      if (!url.trim() && found.url) setUrl(found.url);
      setLookupState("found");
      setLookupMsg(`Found: "${found.title}" in ${found.journal || "(no journal)"}.`);
    } catch (e) {
      setLookupState("not_found");
      setLookupMsg(
        `Crossref lookup failed${e instanceof Error ? ` (${e.message})` : ""}. Fill in by hand if you'd like.`
      );
    }
  };

  const reset = () => {
    setLookupState("idle");
    setLookupMsg("");
    setError("");
  };

  const switchType = (t: RecType) => {
    setRecType(t);
    reset();
  };

  const save = async () => {
    if (!title.trim()) {
      setError("Title is required — everything else is optional.");
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
        // Item-type-specific persistence
        item_type: recType,
        isbn: recType === "book" ? isbn.trim() || undefined : undefined,
        doi: recType === "article" ? doi.trim() || undefined : undefined,
        journal: recType === "article" ? journal.trim() || undefined : undefined,
        url: recType === "article" ? url.trim() || undefined : undefined,
        year: pubYear ? parseInt(pubYear) : undefined,
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

      {/* Type toggle */}
      <div className="flex gap-1 p-1 rounded-full mb-4" style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}>
        {[
          { key: "book", label: "📚 Book" },
          { key: "article", label: "📄 Article" },
        ].map((t) => {
          const active = recType === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => switchType(t.key as RecType)}
              className="flex-1 px-3 py-2 rounded-full text-sm font-semibold transition-colors"
              style={{
                background: active ? bento.ink : "transparent",
                color: active ? bento.bg : bento.inkSoft,
                ...display,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Lookup — optional, dismissible */}
      {recType === "book" ? (
        <div className="rounded-2xl p-3 mb-4" style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}>
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: bento.inkSoft, ...display }}>
            Optional: look it up
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookupBook()}
              placeholder="Title, author, or ISBN"
              className={inputCls}
            />
            <SecondaryButton onClick={lookupBook}>
              {lookupState === "searching" ? "..." : "Find"}
            </SecondaryButton>
          </div>
          <p className="text-[11px] mt-2" style={{ color: bento.inkSoft }}>
            Searches Open Library + Google Books. If nothing is found, just fill in the form yourself.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl p-3 mb-4" style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}>
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: bento.inkSoft, ...display }}>
            Optional: look it up by DOI
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={doi}
              onChange={(e) => setDoi(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookupArticle()}
              placeholder="10.1038/nature12373"
              className={inputCls}
            />
            <SecondaryButton onClick={lookupArticle}>
              {lookupState === "searching" ? "..." : "Find"}
            </SecondaryButton>
          </div>
          <p className="text-[11px] mt-2" style={{ color: bento.inkSoft }}>
            Searches Crossref. No DOI or no match? No problem — just fill in the form yourself.
          </p>
        </div>
      )}

      {/* Lookup result feedback */}
      {lookupMsg && (
        <div
          className="rounded-2xl px-3 py-2 text-sm mb-4 flex items-start gap-2"
          style={{
            background:
              lookupState === "found"
                ? bento.green + "22"
                : lookupState === "not_found"
                ? bento.yellow + "33"
                : bento.card,
            color: bento.ink,
          }}
        >
          <span>{lookupState === "found" ? "✓" : "ℹ️"}</span>
          <p className="flex-1">{lookupMsg}</p>
          <button
            onClick={reset}
            className="text-xs opacity-60 hover:opacity-100"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* ---- Common fields ---- */}
      <div className="space-y-3">
        <div>
          <label className={labelCls} style={{ color: bento.inkSoft, ...display }}>
            Title *
          </label>
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={recType === "article" ? "On the Electrodynamics of Moving Bodies" : "The Idiot"}
            className={inputCls}
          />
        </div>
        <Field
          label={recType === "article" ? "Author(s)" : "Author"}
          value={author}
          onChange={setAuthor}
          placeholder={recType === "article" ? "Einstein, A." : "Elif Batuman"}
        />

        {/* Type-specific fields */}
        {recType === "book" && (
          <>
            <Field label="ISBN" value={isbn} onChange={setIsbn} placeholder="optional" />
            <Field label="Cover URL" value={coverUrl} onChange={setCoverUrl} placeholder="https://..." />
          </>
        )}
        {recType === "article" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Journal" value={journal} onChange={setJournal} placeholder="Annalen der Physik" />
              <Field label="Year" value={pubYear} onChange={setPubYear} numeric placeholder="1905" />
            </div>
            <Field label="DOI" value={doi} onChange={setDoi} placeholder="10.xxxx/..." />
            <Field label="URL" value={url} onChange={setUrl} placeholder="https://doi.org/..." />
          </>
        )}

        <Field
          label="Recommended by"
          value={recommendedBy}
          onChange={setRecommendedBy}
          placeholder="Sarah K., Ezra Klein Show, Substack, ..."
        />
        <Field label="Topic" value={topic} onChange={setTopic} placeholder="Coming of age" />

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
