"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LibcatShell, libcat, serif, sans, mono } from "./theme";
import { coverFor, lccSubject, useCatalog, type CatalogBook } from "./useCatalog";

type SortKey = "relevance" | "title" | "author" | "year" | "added" | "rating";
type StatusFilter = "all" | "read" | "reading" | "not_read" | "favorites";

export default function LibcatCatalog() {
  const { books, loading } = useCatalog();

  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [pageSize] = useState(20);

  // Facets
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedAuthors, setSelectedAuthors] = useState<Set<string>>(new Set());
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<StatusFilter>("all");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // -- Search match ----------------------------------------------------------
  const matches = (b: CatalogBook, q: string): boolean => {
    if (!q) return true;
    const lower = q.toLowerCase();
    return (
      b.title.toLowerCase().includes(lower) ||
      b.author.toLowerCase().includes(lower) ||
      (b.isbn || "").toLowerCase().includes(lower) ||
      (b.doi || "").toLowerCase().includes(lower) ||
      (b.description || "").toLowerCase().includes(lower) ||
      b.topics.some((t) => t.toLowerCase().includes(lower)) ||
      b.auto_topics.some((t) => t.toLowerCase().includes(lower))
    );
  };

  // -- Apply search + facets -------------------------------------------------
  const filtered = useMemo(() => {
    return books
      .filter((b) => matches(b, appliedQuery))
      .filter((b) => {
        if (status === "all") return true;
        if (status === "favorites") return !!b.favorite || b.rating === 5;
        return b.status === status;
      })
      .filter((b) => {
        if (selectedTags.size === 0) return true;
        return b.topics.some((t) => selectedTags.has(t));
      })
      .filter((b) => {
        if (selectedAuthors.size === 0) return true;
        return b.authors.some((a) => selectedAuthors.has(a));
      })
      .filter((b) => {
        if (selectedSubjects.size === 0) return true;
        const subj = lccSubject(b.lcc);
        return subj ? selectedSubjects.has(subj) : false;
      });
  }, [books, appliedQuery, status, selectedTags, selectedAuthors, selectedSubjects]);

  const sorted = useMemo(() => {
    const out = [...filtered];
    switch (sort) {
      case "title":
        out.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "author":
        out.sort((a, b) => a.author.localeCompare(b.author));
        break;
      case "year":
        out.sort((a, b) => (b.publication_year || 0) - (a.publication_year || 0));
        break;
      case "added":
        out.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
        break;
      case "rating":
        out.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "relevance":
      default:
        // Surface exact title/author matches when there's a query, else alpha
        if (appliedQuery) {
          const q = appliedQuery.toLowerCase();
          const score = (b: CatalogBook) => {
            let s = 0;
            if (b.title.toLowerCase() === q) s += 100;
            if (b.title.toLowerCase().startsWith(q)) s += 30;
            if (b.title.toLowerCase().includes(q)) s += 10;
            if (b.author.toLowerCase().includes(q)) s += 5;
            if (b.topics.some((t) => t.toLowerCase() === q)) s += 8;
            return s;
          };
          out.sort((a, b) => score(b) - score(a) || a.title.localeCompare(b.title));
        } else {
          out.sort((a, b) => a.title.localeCompare(b.title));
        }
        break;
    }
    return out;
  }, [filtered, sort, appliedQuery]);

  // -- Facet counts (computed over the books matching the search but BEFORE
  //    that specific facet is applied — gives the user the "if I add this
  //    facet, this is how many results I'll have" intuition).
  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    books
      .filter((b) => matches(b, appliedQuery))
      .filter((b) => status === "all" || (status === "favorites" ? b.favorite || b.rating === 5 : b.status === status))
      .forEach((b) => b.topics.forEach((t) => m.set(t, (m.get(t) || 0) + 1)));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [books, appliedQuery, status]);

  const authorCounts = useMemo(() => {
    const m = new Map<string, number>();
    books
      .filter((b) => matches(b, appliedQuery))
      .filter((b) => status === "all" || (status === "favorites" ? b.favorite || b.rating === 5 : b.status === status))
      .forEach((b) => b.authors.forEach((a) => m.set(a, (m.get(a) || 0) + 1)));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [books, appliedQuery, status]);

  const subjectCounts = useMemo(() => {
    const m = new Map<string, number>();
    books
      .filter((b) => matches(b, appliedQuery))
      .filter((b) => status === "all" || (status === "favorites" ? b.favorite || b.rating === 5 : b.status === status))
      .forEach((b) => {
        const subj = lccSubject(b.lcc);
        if (subj) m.set(subj, (m.get(subj) || 0) + 1);
      });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [books, appliedQuery, status]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageBooks = sorted.slice(pageStart, pageStart + pageSize);

  // -- Helpers ---------------------------------------------------------------
  const toggle = <T,>(set: Set<T>, value: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
    setPage(1);
  };

  const clearAll = () => {
    setSelectedTags(new Set());
    setSelectedAuthors(new Set());
    setSelectedSubjects(new Set());
    setStatus("all");
    setPage(1);
  };

  const applySearch = () => {
    setAppliedQuery(query.trim());
    setPage(1);
  };

  return (
    <LibcatShell
      query={query}
      onQueryChange={setQuery}
      onSubmit={applySearch}
    >
      {/* Two-column layout — sidebar + main */}
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 mt-2">
        {/* ---- FACET SIDEBAR ---- */}
        <aside className="md:sticky md:top-3 md:self-start space-y-5 md:max-h-[calc(100vh-2rem)] md:overflow-y-auto pr-1">
          <FacetPanel title="Refine your search">
            <button
              onClick={clearAll}
              className="text-xs hover:underline"
              style={{ color: libcat.link }}
            >
              Clear all filters
            </button>
          </FacetPanel>

          <FacetPanel title="Status">
            <div className="space-y-0.5">
              {([
                { key: "all", label: "All items" },
                { key: "read", label: "Read" },
                { key: "reading", label: "Reading" },
                { key: "not_read", label: "Not yet read" },
                { key: "favorites", label: "Favorites" },
              ] as { key: StatusFilter; label: string }[]).map((s) => {
                const count =
                  s.key === "all"
                    ? books.length
                    : s.key === "favorites"
                    ? books.filter((b) => b.favorite || b.rating === 5).length
                    : books.filter((b) => b.status === s.key).length;
                const selected = status === s.key;
                return (
                  <label
                    key={s.key}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                    style={{ color: selected ? libcat.accent : libcat.ink }}
                  >
                    <input
                      type="radio"
                      name="status"
                      checked={selected}
                      onChange={() => {
                        setStatus(s.key);
                        setPage(1);
                      }}
                      className="accent-amber-700"
                    />
                    <span className="flex-1">{s.label}</span>
                    <span className="text-xs" style={{ color: libcat.inkSoft }}>
                      ({count})
                    </span>
                  </label>
                );
              })}
            </div>
          </FacetPanel>

          <FacetPanel title="Tags" badge={`${tagCounts.length}`}>
            <FacetCheckList
              items={tagCounts}
              selected={selectedTags}
              onToggle={(v) => toggle(selectedTags, v, setSelectedTags)}
              limit={showAdvanced ? 50 : 8}
              onSelectExclusive={(v) => {
                setSelectedTags(new Set([v]));
                setPage(1);
              }}
            />
          </FacetPanel>

          <FacetPanel title="Authors" badge={`${authorCounts.length}`}>
            <FacetCheckList
              items={authorCounts}
              selected={selectedAuthors}
              onToggle={(v) => toggle(selectedAuthors, v, setSelectedAuthors)}
              limit={showAdvanced ? 30 : 6}
              onSelectExclusive={(v) => {
                setSelectedAuthors(new Set([v]));
                setPage(1);
              }}
            />
          </FacetPanel>

          <FacetPanel title="Subject (LCC)" badge={`${subjectCounts.length}`}>
            <FacetCheckList
              items={subjectCounts}
              selected={selectedSubjects}
              onToggle={(v) => toggle(selectedSubjects, v, setSelectedSubjects)}
              limit={20}
            />
          </FacetPanel>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs hover:underline"
            style={{ color: libcat.link }}
          >
            {showAdvanced ? "← Show fewer facets" : "Show all facets →"}
          </button>
        </aside>

        {/* ---- RESULTS ---- */}
        <main>
          {/* Result count + sort */}
          <div
            className="flex items-center justify-between gap-3 pb-2 mb-3"
            style={{ borderBottom: `2px solid ${libcat.border}` }}
          >
            <p className="text-sm" style={sans}>
              {loading ? (
                "Loading catalog..."
              ) : appliedQuery ? (
                <>
                  <span style={{ ...serif, fontWeight: 700 }}>{sorted.length}</span>{" "}
                  result{sorted.length === 1 ? "" : "s"} for{" "}
                  <em style={{ color: libcat.accent }}>&ldquo;{appliedQuery}&rdquo;</em>
                </>
              ) : (
                <>
                  <span style={{ ...serif, fontWeight: 700 }}>{sorted.length}</span>{" "}
                  item{sorted.length === 1 ? "" : "s"} in the catalog
                </>
              )}
              {(selectedTags.size > 0 || selectedAuthors.size > 0 || selectedSubjects.size > 0) && (
                <span style={{ color: libcat.inkSoft }}>
                  {" "}· filtered
                </span>
              )}
            </p>

            <label className="flex items-center gap-1.5 text-xs" style={{ color: libcat.inkSoft }}>
              Sort by
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as SortKey);
                  setPage(1);
                }}
                className="px-2 py-1"
                style={{
                  background: libcat.card,
                  border: `1px solid ${libcat.border}`,
                  color: libcat.ink,
                  ...sans,
                }}
              >
                <option value="relevance">Relevance</option>
                <option value="title">Title (A→Z)</option>
                <option value="author">Author (A→Z)</option>
                <option value="year">Year (newest)</option>
                <option value="added">Date added</option>
                <option value="rating">Rating</option>
              </select>
            </label>
          </div>

          {/* Active facet chips */}
          {(selectedTags.size + selectedAuthors.size + selectedSubjects.size > 0) && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[...selectedTags].map((t) => (
                <ActiveChip key={`t-${t}`} label={`Tag: ${t}`} onRemove={() => toggle(selectedTags, t, setSelectedTags)} />
              ))}
              {[...selectedAuthors].map((a) => (
                <ActiveChip key={`a-${a}`} label={`Author: ${a}`} onRemove={() => toggle(selectedAuthors, a, setSelectedAuthors)} />
              ))}
              {[...selectedSubjects].map((s) => (
                <ActiveChip key={`s-${s}`} label={`Subject: ${s}`} onRemove={() => toggle(selectedSubjects, s, setSelectedSubjects)} />
              ))}
            </div>
          )}

          {/* Result list */}
          {!loading && pageBooks.length === 0 && (
            <div
              className="p-8 text-center"
              style={{ background: libcat.card, border: `1px solid ${libcat.border}` }}
            >
              <p style={{ ...serif, fontSize: "1.1rem", color: libcat.inkSoft }}>
                Nothing matches your query.
              </p>
              <p className="text-sm mt-2" style={{ color: libcat.inkSoft }}>
                Try removing a filter, broadening your search, or clearing all.
              </p>
            </div>
          )}

          <ol
            style={{
              background: libcat.card,
              border: `1px solid ${libcat.border}`,
            }}
          >
            {pageBooks.map((b, i) => (
              <BookRow
                key={b.id}
                book={b}
                index={pageStart + i + 1}
                onTagClick={(t) => {
                  setSelectedTags(new Set([t]));
                  setPage(1);
                }}
                onAuthorClick={(a) => {
                  setSelectedAuthors(new Set([a]));
                  setPage(1);
                }}
              />
            ))}
          </ol>

          {/* Pagination */}
          {sorted.length > pageSize && (
            <nav
              className="mt-4 flex items-center justify-between gap-3 text-sm"
              style={mono}
            >
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 disabled:opacity-30"
                style={{
                  background: libcat.card,
                  border: `1px solid ${libcat.border}`,
                  color: libcat.link,
                }}
              >
                ← Prev
              </button>
              <p style={{ color: libcat.inkSoft }}>
                Page {page} of {totalPages} · Showing {pageStart + 1}–
                {Math.min(pageStart + pageSize, sorted.length)} of {sorted.length}
              </p>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 disabled:opacity-30"
                style={{
                  background: libcat.card,
                  border: `1px solid ${libcat.border}`,
                  color: libcat.link,
                }}
              >
                Next →
              </button>
            </nav>
          )}
        </main>
      </div>
    </LibcatShell>
  );
}

// ----------------------------------------------------------------------------

function FacetPanel({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3
        className="flex items-baseline justify-between mb-1.5 pb-1"
        style={{
          ...serif,
          fontSize: "0.95rem",
          fontWeight: 700,
          color: libcat.ink,
          borderBottom: `1px solid ${libcat.border}`,
        }}
      >
        <span>{title}</span>
        {badge && (
          <span className="text-[10px]" style={{ ...mono, color: libcat.inkSoft }}>
            {badge}
          </span>
        )}
      </h3>
      {children}
    </section>
  );
}

function FacetCheckList({
  items,
  selected,
  onToggle,
  onSelectExclusive,
  limit,
}: {
  items: [string, number][];
  selected: Set<string>;
  onToggle: (v: string) => void;
  onSelectExclusive?: (v: string) => void;
  limit: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, limit);

  if (items.length === 0) {
    return (
      <p className="text-xs italic" style={{ color: libcat.inkSoft }}>
        None in current results.
      </p>
    );
  }

  return (
    <div>
      <div className="space-y-0.5">
        {visible.map(([name, count]) => {
          const isSelected = selected.has(name);
          return (
            <div
              key={name}
              className="flex items-center gap-1.5 text-sm leading-snug"
              style={{ color: isSelected ? libcat.accent : libcat.ink }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(name)}
                className="accent-amber-700 flex-shrink-0"
              />
              <button
                onClick={() => onSelectExclusive?.(name) ?? onToggle(name)}
                className="flex-1 text-left hover:underline truncate"
                style={{
                  color: isSelected ? libcat.accent : libcat.link,
                  fontWeight: isSelected ? 600 : 400,
                }}
                title={name}
              >
                {name}
              </button>
              <span className="text-xs" style={{ ...mono, color: libcat.inkSoft }}>
                ({count})
              </span>
            </div>
          );
        })}
      </div>
      {items.length > limit && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs hover:underline mt-1.5"
          style={{ color: libcat.link }}
        >
          {expanded ? "← show less" : `+ ${items.length - limit} more`}
        </button>
      )}
    </div>
  );
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs"
      style={{
        background: libcat.accent + "1A",
        color: libcat.accent,
        border: `1px solid ${libcat.accent}55`,
        ...sans,
      }}
    >
      <span>{label}</span>
      <button onClick={onRemove} className="opacity-70 hover:opacity-100" aria-label="Remove">
        ×
      </button>
    </span>
  );
}

function BookRow({
  book,
  index,
  onTagClick,
  onAuthorClick,
}: {
  book: CatalogBook;
  index: number;
  onTagClick: (t: string) => void;
  onAuthorClick: (a: string) => void;
}) {
  const cover = coverFor(book);
  const subj = lccSubject(book.lcc);
  const isArticle = book.item_type === "article";

  return (
    <li
      className="grid grid-cols-[40px_60px_1fr_auto] gap-3 px-3 py-3 hover:bg-amber-50/40"
      style={{ borderBottom: `1px solid ${libcat.rule}` }}
    >
      {/* Row index */}
      <span
        className="text-sm tabular-nums self-center text-right"
        style={{ ...mono, color: libcat.inkFaint }}
      >
        {index}.
      </span>

      {/* Cover */}
      <div>
        {cover ? (
          <img
            src={cover}
            alt=""
            className="w-12 h-[68px] object-cover"
            style={{ border: `1px solid ${libcat.border}` }}
          />
        ) : (
          <div
            className="w-12 h-[68px] flex items-center justify-center text-center p-1"
            style={{
              background: libcat.paperDeep,
              border: `1px solid ${libcat.border}`,
              color: libcat.inkSoft,
            }}
          >
            <span className="text-[9px] leading-tight" style={serif}>
              {book.title.slice(0, 24)}
            </span>
          </div>
        )}
      </div>

      {/* Metadata column */}
      <div className="min-w-0 self-center">
        <p className="text-sm sm:text-base leading-snug">
          <Link
            href={`/mockups/4/book?id=${encodeURIComponent(book.id)}`}
            className="hover:underline"
            style={{ ...serif, color: libcat.link, fontWeight: 600 }}
          >
            {book.title}
          </Link>
          {isArticle && (
            <span
              className="ml-2 px-1.5 py-0.5 text-[9px] tracking-wider align-middle"
              style={{
                background: libcat.accent,
                color: libcat.paperLight,
                ...mono,
              }}
            >
              ARTICLE
            </span>
          )}
        </p>

        <p className="text-xs sm:text-sm mt-0.5" style={{ color: libcat.inkSoft }}>
          by{" "}
          {book.authors.map((a, i) => (
            <span key={a}>
              <button
                onClick={() => onAuthorClick(a)}
                className="hover:underline"
                style={{ color: libcat.link }}
              >
                {a}
              </button>
              {i < book.authors.length - 1 && ", "}
            </span>
          ))}
          {book.publication_year && <span> · {book.publication_year}</span>}
          {book.pages && <span> · {book.pages} pp.</span>}
          {book.isbn && <span className="hidden sm:inline" style={mono}> · ISBN {book.isbn}</span>}
        </p>

        {book.topics.length > 0 && (
          <p className="text-xs mt-1 leading-snug">
            <span style={{ color: libcat.inkSoft }}>tagged: </span>
            {book.topics.slice(0, 8).map((t, i) => (
              <span key={t}>
                <button
                  onClick={() => onTagClick(t)}
                  className="hover:underline"
                  style={{ color: libcat.link }}
                >
                  {t}
                </button>
                {i < Math.min(8, book.topics.length) - 1 && ", "}
              </span>
            ))}
            {book.topics.length > 8 && (
              <span style={{ color: libcat.inkSoft }}> +{book.topics.length - 8} more</span>
            )}
          </p>
        )}

        {book.description && (
          <p
            className="text-xs mt-1.5 line-clamp-2 italic"
            style={{ color: libcat.inkSoft }}
          >
            {book.description}
          </p>
        )}
      </div>

      {/* Right metadata column */}
      <div className="self-center text-right space-y-1">
        {/* Rating */}
        {book.rating ? (
          <p className="text-base leading-none" style={{ color: libcat.brass }}>
            {"★".repeat(book.rating)}
            <span style={{ color: libcat.border }}>{"★".repeat(5 - book.rating)}</span>
          </p>
        ) : null}

        {/* Status */}
        <p
          className="text-[10px] tracking-widest uppercase"
          style={{
            ...mono,
            color:
              book.status === "read"
                ? libcat.green
                : book.status === "reading"
                ? libcat.accent
                : libcat.inkSoft,
          }}
        >
          {book.status === "read" ? "On shelf" : book.status === "reading" ? "Out" : "Queued"}
        </p>

        {/* Call number */}
        {book.lcc && (
          <p
            className="text-[11px] whitespace-nowrap"
            style={{ ...mono, color: libcat.inkSoft }}
          >
            {book.lcc}
          </p>
        )}
        {subj && (
          <p
            className="text-[10px] italic hidden sm:block"
            style={{ ...serif, color: libcat.inkFaint }}
          >
            {subj}
          </p>
        )}
      </div>
    </li>
  );
}
