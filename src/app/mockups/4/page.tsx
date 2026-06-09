"use client";

// Mockup #4 — LibraryCat (TinyCat) catalog search page.
// Layout matched to www.librarycat.org/lib/BibleProject/search/text/jonah:
//
// - Bootstrap 3 grid (.row / col-md-X)
// - System font stack — no Google Fonts
// - Sticky white navbar with search left + library name+logo right
// - Sort/breadcrumb bar at top: "X items" · pagination · "relevancy ▾"
// - Results: each .minipac_result row has col-md-1 cover + col-md-6 text
// - Text column: <h2>Title</h2> · "by Author" · "Paperback, 1968"
//   followed by Tags / Collections / Series / Call number labeled rows
// - Right rail (col-md-3): faceted refinements — Tags, Collections, Series,
//   Call number (DDC). On the real site this is AJAX-loaded into #facetsdiv.

import Link from "next/link";
import { useMemo, useState } from "react";
import { LibcatShell, libcat, heading, sans } from "./theme";
import { coverFor, useCatalog, type CatalogBook } from "./useCatalog";

type SortKey =
  | "relevancy"
  | "acquisition"
  | "title"
  | "date"
  | "author"
  | "popularity"
  | "series";

const SORT_LABELS: Record<SortKey, string> = {
  relevancy: "relevancy",
  acquisition: "acquisition",
  title: "title",
  date: "date",
  author: "author",
  popularity: "popularity",
  series: "series",
};

export default function LibcatCatalog() {
  const { books, loading } = useCatalog();

  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortKey>("relevancy");
  const pageSize = 20;

  // Facet selections — Tags, Collections (derived from `source`), Series
  // (derived from series-tagged topics), DDC subject letter.
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [showAllTags, setShowAllTags] = useState(false);
  const [showAllCollections, setShowAllCollections] = useState(false);

  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  // ---- search match ----
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

  const filtered = useMemo(() => {
    return books
      .filter((b) => matches(b, appliedQuery))
      .filter((b) => {
        if (selectedTags.size === 0) return true;
        return b.topics.some((t) => selectedTags.has(t));
      })
      .filter((b) => {
        if (selectedCollections.size === 0) return true;
        return b.source ? selectedCollections.has(b.source) : false;
      });
  }, [books, appliedQuery, selectedTags, selectedCollections]);

  const sorted = useMemo(() => {
    const out = [...filtered];
    switch (sort) {
      case "title":
        out.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "author":
        out.sort((a, b) => a.author.localeCompare(b.author));
        break;
      case "date":
        out.sort((a, b) => (b.publication_year || 0) - (a.publication_year || 0));
        break;
      case "acquisition":
        out.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
        break;
      case "popularity":
        out.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "series":
        // Group by series-ish (we'll use first topic as a stand-in)
        out.sort((a, b) => (a.topics[0] || "z").localeCompare(b.topics[0] || "z"));
        break;
      case "relevancy":
      default:
        if (appliedQuery) {
          const q = appliedQuery.toLowerCase();
          const score = (b: CatalogBook) => {
            let s = 0;
            if (b.title.toLowerCase() === q) s += 100;
            if (b.title.toLowerCase().startsWith(q)) s += 30;
            if (b.title.toLowerCase().includes(q)) s += 10;
            if (b.author.toLowerCase().includes(q)) s += 5;
            if (b.topics.some((t) => t.toLowerCase().includes(q))) s += 8;
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

  // Facet counts derived from current search results
  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    books
      .filter((b) => matches(b, appliedQuery))
      .forEach((b) => b.topics.forEach((t) => m.set(t, (m.get(t) || 0) + 1)));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [books, appliedQuery]);

  const collectionCounts = useMemo(() => {
    const m = new Map<string, number>();
    books
      .filter((b) => matches(b, appliedQuery))
      .forEach((b) => {
        if (b.source) m.set(b.source, (m.get(b.source) || 0) + 1);
      });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [books, appliedQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageBooks = sorted.slice(pageStart, pageStart + pageSize);

  const toggleSet = <T,>(set: Set<T>, value: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
    setPage(1);
  };

  const applySearch = () => {
    setAppliedQuery(query.trim());
    setPage(1);
  };

  // Result count text — matches "31 items" pattern
  const resultCount = sorted.length;

  return (
    <LibcatShell
      query={query}
      onQueryChange={setQuery}
      onSubmit={applySearch}
    >
      {/* ---- Sortbar / breadcrumb (matches .col-md-12.minipac_sortbar) ---- */}
      <div
        style={{
          background: libcat.breadcrumbBg,
          padding: "8px 15px",
          marginBottom: 20,
          borderRadius: 4,
        }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap" style={{ fontSize: 14 }}>
          {/* Left — count */}
          <div style={{ minWidth: 100 }}>
            <strong>{resultCount}</strong> item{resultCount === 1 ? "" : "s"}
          </div>

          {/* Center — pagination */}
          <div className="text-center flex-1">
            {totalPages > 1 && (
              <ul className="inline-flex" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                <PageLink
                  label="«"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                />
                {Array.from({ length: totalPages }).map((_, i) => (
                  <PageLink
                    key={i}
                    label={String(i + 1)}
                    active={i + 1 === page}
                    onClick={() => setPage(i + 1)}
                  />
                ))}
                <PageLink
                  label="»"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                />
              </ul>
            )}
          </div>

          {/* Right — sort dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setSortMenuOpen(!sortMenuOpen)}
              onBlur={() => setTimeout(() => setSortMenuOpen(false), 150)}
              className="flex items-center gap-1.5"
              style={{
                background: libcat.btnBg,
                border: `1px solid ${libcat.btnBorder}`,
                color: libcat.text,
                padding: "5px 10px",
                fontSize: 12,
                lineHeight: 1.5,
                borderRadius: 3,
                cursor: "pointer",
                ...sans,
              }}
              aria-expanded={sortMenuOpen}
              aria-haspopup="true"
            >
              {SORT_LABELS[sort]}
              <SortIcon />
              <Caret />
            </button>
            {sortMenuOpen && (
              <ul
                className="absolute right-0 mt-1 z-20"
                style={{
                  background: "#FFF",
                  border: `1px solid rgba(0,0,0,0.15)`,
                  borderRadius: 4,
                  boxShadow: "0 6px 12px rgba(0,0,0,0.175)",
                  padding: "5px 0",
                  minWidth: 160,
                  listStyle: "none",
                  fontSize: 14,
                  margin: 0,
                }}
              >
                <li style={{ padding: "3px 20px", color: libcat.textMuted, fontSize: 12, textTransform: "uppercase" }}>
                  Sort
                </li>
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => {
                  const active = key === sort;
                  return (
                    <li key={key}>
                      <button
                        onClick={() => {
                          setSort(key);
                          setSortMenuOpen(false);
                          setPage(1);
                        }}
                        className="block w-full text-left hover:bg-gray-100"
                        style={{
                          padding: "3px 20px",
                          color: active ? libcat.text : libcat.link,
                          fontWeight: active ? 700 : 400,
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          ...sans,
                        }}
                      >
                        {SORT_LABELS[key]}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ---- 2-column layout: results + right-side facets ---- */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Results column — col-md-9 (we use 9/12 with facets at 3/12) */}
        <div className="md:col-span-9">
          {loading && (
            <div style={{ padding: 30, textAlign: "center", color: libcat.textMuted }}>
              Loading catalog…
            </div>
          )}

          {!loading && pageBooks.length === 0 && (
            <div style={{ padding: 30, textAlign: "center", color: libcat.textMuted }}>
              No items match this search.
            </div>
          )}

          <div id="resultsbox">
            {pageBooks.map((b, i) => (
              <ResultRow
                key={b.id}
                book={b}
                first={pageStart === 0 && i === 0}
                onTagClick={(t) => {
                  setSelectedTags(new Set([t]));
                  setPage(1);
                }}
                onSourceClick={(s) => {
                  setSelectedCollections(new Set([s]));
                  setPage(1);
                }}
              />
            ))}
          </div>
        </div>

        {/* Facet sidebar — col-md-3.
            Real TinyCat uses col-md-2 + display:none until ajax loads; we keep
            it visible and a touch wider for readability. Hidden on mobile.   */}
        <aside className="hidden md:block md:col-span-3">
          <div
            className="sticky top-20"
            style={{
              background: "#FFF",
              border: `1px solid ${libcat.borderLight}`,
              borderRadius: 4,
              padding: 12,
              fontSize: 13,
            }}
          >
            <h3
              style={{
                ...heading,
                fontSize: 16,
                color: libcat.textMuted,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                margin: "0 0 8px 0",
                paddingBottom: 6,
                borderBottom: `1px solid ${libcat.borderLight}`,
              }}
            >
              Refine
            </h3>

            <FacetGroup
              label="Tags"
              entries={tagCounts}
              selected={selectedTags}
              onToggle={(v) => toggleSet(selectedTags, v, setSelectedTags)}
              expanded={showAllTags}
              setExpanded={setShowAllTags}
            />

            {collectionCounts.length > 0 && (
              <FacetGroup
                label="Collections"
                entries={collectionCounts}
                selected={selectedCollections}
                onToggle={(v) => toggleSet(selectedCollections, v, setSelectedCollections)}
                expanded={showAllCollections}
                setExpanded={setShowAllCollections}
              />
            )}

            {(selectedTags.size > 0 || selectedCollections.size > 0) && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${libcat.borderLight}` }}>
                <button
                  onClick={() => {
                    setSelectedTags(new Set());
                    setSelectedCollections(new Set());
                    setPage(1);
                  }}
                  style={{
                    color: libcat.link,
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    fontSize: 12,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </LibcatShell>
  );
}

// ---- Components -------------------------------------------------------------

function ResultRow({
  book,
  first,
  onTagClick,
  onSourceClick,
}: {
  book: CatalogBook;
  first: boolean;
  onTagClick: (t: string) => void;
  onSourceClick: (s: string) => void;
}) {
  const cover = coverFor(book);
  // Format line — matches the real "Paperback, 1968" / "Hardcover, 1986" /
  // "Book, 2008". We pick "Article" for item_type='article', else fall back.
  const formatLine = (() => {
    if (book.item_type === "article") {
      return book.publication_year
        ? `Article, ${book.publication_year}`
        : "Article";
    }
    const fmt = "Book";
    const year = book.publication_year;
    return year ? `${fmt}, ${year}` : fmt;
  })();

  return (
    <article
      className="minipac_result"
      style={{
        padding: first ? "20px 0" : "20px 0",
        borderTop: first ? "none" : `1px solid ${libcat.borderLight}`,
      }}
    >
      <div className="grid grid-cols-12 gap-3">
        {/* Cover — col-md-1 in real markup; we give it a touch more breathing
            room (col-span-2 on mobile, 1 on desktop) */}
        <div className="col-span-3 sm:col-span-2 md:col-span-1">
          <Link href={`/mockups/4/book?id=${encodeURIComponent(book.id)}`}>
            {cover ? (
              <img
                src={cover}
                alt={book.title}
                style={{
                  width: "100%",
                  maxWidth: 90,
                  height: "auto",
                  border: `1px solid ${libcat.borderLight}`,
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  maxWidth: 90,
                  aspectRatio: "2 / 3",
                  background: "#F0F0F0",
                  border: `1px solid ${libcat.borderLight}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  color: libcat.textMuted,
                  padding: 4,
                  textAlign: "center",
                }}
              >
                no cover
              </div>
            )}
          </Link>
        </div>

        {/* Text column — col-md-6 in real markup; we use 9/12 here so the
            (otherwise empty) right margin doesn't waste space. */}
        <div className="col-span-9 sm:col-span-10 md:col-span-11">
          {/* Title — h2 + "by Author" + format line */}
          <div className="minipac_tad">
            <div className="minipac_tad_item minipac_tad_t">
              <h2
                style={{
                  ...heading,
                  fontSize: 22,
                  margin: 0,
                  marginBottom: 4,
                }}
              >
                <Link
                  href={`/mockups/4/book?id=${encodeURIComponent(book.id)}`}
                  style={{ color: libcat.link, textDecoration: "none" }}
                  className="hover:underline"
                >
                  {book.title}
                </Link>
              </h2>
            </div>
            <div className="minipac_tad_item minipac_tad_a">
              <span className="minipac_tad_as" style={{ fontSize: 14, color: libcat.text }}>
                by{" "}
                {book.authors.map((a, i) => (
                  <span key={a}>
                    <Link
                      href={`/mockups/4?author=${encodeURIComponent(a)}`}
                      style={{ color: libcat.link, textDecoration: "none" }}
                      className="hover:underline"
                    >
                      {a}
                    </Link>
                    {i < book.authors.length - 1 && ", "}
                  </span>
                ))}
              </span>
            </div>
            <span
              className="minipac_search_fmt"
              style={{ fontSize: 13, color: libcat.textMuted }}
            >
              {formatLine}
            </span>
          </div>

          {/* Tags row */}
          {book.topics.length > 0 && (
            <BibSection label={book.topics.length === 1 ? "Tag" : "Tags"}>
              {book.topics.map((t, i) => (
                <span key={t}>
                  <button
                    onClick={() => onTagClick(t)}
                    style={{
                      color: libcat.link,
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      fontSize: 14,
                      cursor: "pointer",
                      ...sans,
                    }}
                    className="hover:underline"
                  >
                    {t}
                  </button>
                  {i < book.topics.length - 1 && ", "}
                </span>
              ))}
            </BibSection>
          )}

          {/* Collections (we use `source` as the "collection" — e.g. "Strand",
              "Library", "Tim's Library") */}
          {book.source && (
            <BibSection
              label={book.source.includes(",") ? "Collections" : "Collection"}
            >
              {book.source.split(",").map((s, i, arr) => {
                const v = s.trim();
                return (
                  <span key={v}>
                    <button
                      onClick={() => onSourceClick(v)}
                      style={{
                        color: libcat.link,
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        fontSize: 14,
                        cursor: "pointer",
                        ...sans,
                      }}
                      className="hover:underline"
                    >
                      {v}
                    </button>
                    {i < arr.length - 1 && ", "}
                  </span>
                );
              })}
            </BibSection>
          )}

          {/* Call number — real markup shows DDC like "224.92077" */}
          {(book.ddc || book.lcc) && (
            <BibSection label="Call number">
              <span
                className="callnumber ddc_num_bare"
                style={{ fontSize: 14, color: libcat.text }}
              >
                {book.ddc || book.lcc}
              </span>
            </BibSection>
          )}
        </div>
      </div>
    </article>
  );
}

// ".minipac_searchresults_section.row" structure: label col-md-2 + data col-md-10
function BibSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="grid grid-cols-12 gap-2 items-baseline"
      style={{ marginTop: 6, fontSize: 14 }}
    >
      <div
        className="col-span-3 sm:col-span-2"
        style={{ color: libcat.textMuted }}
      >
        {label}
      </div>
      <div className="col-span-9 sm:col-span-10">{children}</div>
    </div>
  );
}

function FacetGroup({
  label,
  entries,
  selected,
  onToggle,
  expanded,
  setExpanded,
}: {
  label: string;
  entries: [string, number][];
  selected: Set<string>;
  onToggle: (v: string) => void;
  expanded: boolean;
  setExpanded: (b: boolean) => void;
}) {
  const limit = 6;
  const visible = expanded ? entries : entries.slice(0, limit);

  return (
    <div style={{ marginBottom: 14 }}>
      <h4
        style={{
          ...heading,
          fontSize: 13,
          color: libcat.text,
          margin: "0 0 4px 0",
          fontWeight: 700,
        }}
      >
        {label}
      </h4>
      {entries.length === 0 ? (
        <p style={{ fontSize: 12, color: libcat.textMuted, fontStyle: "italic" }}>
          (none)
        </p>
      ) : (
        <>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {visible.map(([name, count]) => {
              const isSelected = selected.has(name);
              return (
                <li
                  key={name}
                  style={{
                    fontSize: 13,
                    lineHeight: 1.5,
                    padding: "1px 0",
                  }}
                >
                  <button
                    onClick={() => onToggle(name)}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      color: isSelected ? libcat.text : libcat.link,
                      fontWeight: isSelected ? 700 : 400,
                      cursor: "pointer",
                      ...sans,
                    }}
                    className="hover:underline text-left"
                    title={name}
                  >
                    {name}
                  </button>{" "}
                  <span style={{ color: libcat.textMuted, fontSize: 12 }}>
                    ({count})
                  </span>
                </li>
              );
            })}
          </ul>
          {entries.length > limit && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                color: libcat.link,
                background: "transparent",
                border: "none",
                padding: 0,
                fontSize: 12,
                cursor: "pointer",
                marginTop: 4,
              }}
              className="hover:underline"
            >
              {expanded ? "show fewer" : `more (${entries.length - limit})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function PageLink({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <li style={{ display: "inline-block" }}>
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        style={{
          background: active ? "#EEE" : libcat.btnBg,
          color: active ? libcat.text : disabled ? libcat.textSubtle : libcat.link,
          border: `1px solid ${libcat.btnBorder}`,
          borderRight: "none",
          padding: "5px 10px",
          fontSize: 13,
          cursor: disabled ? "not-allowed" : "pointer",
          fontWeight: active ? 600 : 400,
          ...sans,
        }}
      >
        {label}
      </button>
    </li>
  );
}

// "Sort amount down" — Font Awesome 6 `fa-sort-amount-down`
function SortIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 512 512"
      fill="currentColor"
      aria-hidden
    >
      <path d="M240 96h64v32h-64zM240 192h128v32H240zM240 288h192v32H240zM240 384h256v32H240zM104 96l-72 80h48v272h48V176h48z" />
    </svg>
  );
}

function Caret() {
  return <span style={{ fontSize: 7, marginLeft: 2 }}>▾</span>;
}
