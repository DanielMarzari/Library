"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LibcatShell, libcat, serif, sans, mono } from "../theme";
import { coverFor, lccSubject, useCatalog, type CatalogBook } from "../useCatalog";

export default function LibcatBookPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LibcatBookDetail />
    </Suspense>
  );
}

function Loading() {
  return (
    <LibcatShell showSearch={false}>
      <p className="text-sm py-8" style={{ color: libcat.inkSoft }}>
        Loading record...
      </p>
    </LibcatShell>
  );
}

function LibcatBookDetail() {
  const search = useSearchParams();
  const id = search.get("id") || "";
  const { books, loading } = useCatalog();
  const book = books.find((b) => b.id === id) || books[0];

  if (loading || !book) {
    return (
      <LibcatShell showSearch={false}>
        <p className="text-sm py-8" style={{ color: libcat.inkSoft }}>
          Loading record...
        </p>
      </LibcatShell>
    );
  }

  return (
    <LibcatShell showSearch={false}>
      {/* Breadcrumbs */}
      <nav className="text-xs mt-2 mb-4" style={{ color: libcat.inkSoft }}>
        <Link href="/mockups/4" style={{ color: libcat.link }}>
          Catalog
        </Link>
        <span className="mx-1">›</span>
        <span>{book.title.length > 40 ? book.title.slice(0, 40) + "…" : book.title}</span>
      </nav>

      {/* ---- Header (cover + title block) ---- */}
      <header
        className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-6 pb-5 mb-5"
        style={{ borderBottom: `2px solid ${libcat.border}` }}
      >
        {/* Cover */}
        <div>
          <Cover book={book} />
        </div>

        <div>
          {book.item_type === "article" && (
            <span
              className="inline-block mb-2 px-2 py-0.5 text-[10px] tracking-wider"
              style={{ background: libcat.accent, color: libcat.paperLight, ...mono }}
            >
              ARTICLE
            </span>
          )}

          <h1
            className="leading-tight"
            style={{ ...serif, fontWeight: 700, fontSize: "clamp(1.5rem, 3vw, 2.25rem)" }}
          >
            {book.title}
          </h1>
          <p className="text-base sm:text-lg mt-1 italic" style={{ ...serif, color: libcat.inkSoft }}>
            by{" "}
            {book.authors.map((a, i) => (
              <span key={a}>
                <Link
                  href={`/mockups/4?author=${encodeURIComponent(a)}`}
                  className="hover:underline not-italic"
                  style={{ color: libcat.link }}
                >
                  {a}
                </Link>
                {i < book.authors.length - 1 && ", "}
              </span>
            ))}
          </p>

          {/* Rating + status */}
          <div className="flex items-center gap-3 mt-3">
            {book.rating ? (
              <span className="text-xl leading-none" style={{ color: libcat.brass }}>
                {"★".repeat(book.rating)}
                <span style={{ color: libcat.border }}>{"★".repeat(5 - book.rating)}</span>
              </span>
            ) : null}
            <span
              className="px-2 py-0.5 text-[10px] tracking-widest uppercase"
              style={{
                ...mono,
                background:
                  book.status === "read"
                    ? libcat.green
                    : book.status === "reading"
                    ? libcat.accent
                    : libcat.inkSoft,
                color: libcat.paperLight,
              }}
            >
              {book.status === "read"
                ? "On the shelf"
                : book.status === "reading"
                ? "Currently out"
                : "Queued"}
            </span>
            {book.favorite && (
              <span
                className="px-2 py-0.5 text-[10px] tracking-widest uppercase"
                style={{ ...mono, background: libcat.brass, color: libcat.paperLight }}
              >
                ★ Favorite
              </span>
            )}
          </div>

          {/* Tags */}
          {book.topics.length > 0 && (
            <p className="mt-3 text-sm">
              <span style={{ color: libcat.inkSoft }}>Tagged: </span>
              {book.topics.map((t, i) => (
                <span key={t}>
                  <Link
                    href={`/mockups/4?tag=${encodeURIComponent(t)}`}
                    className="hover:underline"
                    style={{ color: libcat.link }}
                  >
                    {t}
                  </Link>
                  {i < book.topics.length - 1 && ", "}
                </span>
              ))}
            </p>
          )}

          {/* Description / abstract */}
          {book.description && (
            <p className="mt-4 leading-relaxed text-sm sm:text-base" style={{ ...serif, color: libcat.ink }}>
              {book.description}
            </p>
          )}
        </div>
      </header>

      {/* ---- Two-column body: bibliographic table + reviews/holdings ---- */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6">
        {/* Left: bibliographic record */}
        <div>
          <Section title="Bibliographic record">
            <BibTable book={book} />
          </Section>

          {book.auto_topics.length > 0 && (
            <Section title="Additional subjects (from Open Library)">
              <div className="flex flex-wrap gap-1.5">
                {book.auto_topics.slice(0, 20).map((t) => (
                  <Link
                    key={t}
                    href={`/mockups/4?tag=${encodeURIComponent(t)}`}
                    className="text-xs px-2 py-0.5 hover:underline"
                    style={{
                      background: libcat.paperDeep,
                      color: libcat.link,
                      border: `1px solid ${libcat.border}`,
                    }}
                  >
                    {t}
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {book.item_type === "article" && (
            <Section title="Article links">
              <ul className="text-sm space-y-1.5">
                {book.doi && (
                  <li>
                    <span style={{ color: libcat.inkSoft }}>DOI: </span>
                    <a
                      href={`https://doi.org/${book.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline font-mono"
                      style={{ color: libcat.link, ...mono }}
                    >
                      {book.doi}
                    </a>
                  </li>
                )}
                {book.url && (
                  <li>
                    <span style={{ color: libcat.inkSoft }}>URL: </span>
                    <a
                      href={book.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline break-all"
                      style={{ color: libcat.link }}
                    >
                      {book.url}
                    </a>
                  </li>
                )}
              </ul>
            </Section>
          )}
        </div>

        {/* Right: holdings + actions */}
        <aside>
          <Section title="Holdings">
            <ul className="text-sm space-y-2">
              <Row label="Library" value="Marzari Personal" />
              <Row label="Status" value={book.status === "read" ? "Available" : book.status === "reading" ? "Checked out" : "On hold"} />
              <Row label="Source" value={book.source || "—"} />
              {book.lcc && <Row label="Call no." value={book.lcc} mono />}
              {book.ddc && <Row label="DDC" value={book.ddc} mono />}
            </ul>
            <Link
              href={`/mockups/4?lcc=${book.lcc ? book.lcc.charAt(0) : ""}`}
              className="text-xs mt-3 inline-block hover:underline"
              style={{ color: libcat.link }}
            >
              Browse adjacent items →
            </Link>
          </Section>

          <Section title="Catalog actions">
            <div className="space-y-1.5 text-sm">
              <ActionLink label="Edit this record" />
              <ActionLink label="Add a review" />
              <ActionLink label="Add to a list" />
              <ActionLink label="Suggest a tag" />
              <ActionLink label="Export MARC / BibTeX" />
            </div>
          </Section>
        </aside>
      </div>

      {/* Back to results */}
      <div className="mt-8 text-sm">
        <Link href="/mockups/4" style={{ color: libcat.link }} className="hover:underline">
          ← Back to catalog
        </Link>
      </div>
    </LibcatShell>
  );
}

// ----------------------------------------------------------------------------

function Cover({ book }: { book: CatalogBook }) {
  const src = coverFor(book);
  if (src) {
    return (
      <img
        src={src}
        alt={book.title}
        className="w-full aspect-[2/3] object-cover"
        style={{ border: `1px solid ${libcat.border}` }}
      />
    );
  }
  return (
    <div
      className="w-full aspect-[2/3] flex items-center justify-center p-3 text-center"
      style={{
        background: libcat.paperDeep,
        border: `1px solid ${libcat.border}`,
        color: libcat.inkSoft,
      }}
    >
      <span style={{ ...serif, fontSize: "0.75rem" }}>{book.title}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2
        className="mb-2 pb-1"
        style={{
          ...serif,
          fontSize: "0.95rem",
          fontWeight: 700,
          color: libcat.ink,
          borderBottom: `1px solid ${libcat.border}`,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function BibTable({ book }: { book: CatalogBook }) {
  const rows: { label: string; value: string | React.ReactNode; isMono?: boolean }[] = [];
  rows.push({ label: "Title", value: book.title });
  rows.push({ label: "Author(s)", value: book.author });
  if (book.publication_year) rows.push({ label: "Published", value: String(book.publication_year) });
  if (book.pages) rows.push({ label: "Pages", value: `${book.pages}` });
  if (book.isbn) rows.push({ label: "ISBN", value: book.isbn, isMono: true });
  if (book.doi) rows.push({ label: "DOI", value: book.doi, isMono: true });
  if (book.journal) rows.push({ label: "Journal", value: book.journal });
  if (book.lcc) {
    const subj = lccSubject(book.lcc);
    rows.push({
      label: "LCC",
      value: subj ? `${book.lcc} — ${subj}` : book.lcc,
      isMono: !subj,
    });
  }
  if (book.ddc) rows.push({ label: "DDC", value: book.ddc, isMono: true });
  rows.push({ label: "Item type", value: book.item_type === "article" ? "Article" : "Book" });
  rows.push({
    label: "Date added",
    value: new Date(book.created_at).toLocaleDateString("en-US", { dateStyle: "long" }),
  });
  rows.push({
    label: "Last updated",
    value: new Date(book.updated_at).toLocaleDateString("en-US", { dateStyle: "long" }),
  });

  return (
    <table className="w-full text-sm" style={sans}>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <th
              className="text-left align-top py-1.5 pr-3 font-normal whitespace-nowrap"
              style={{
                ...serif,
                color: libcat.inkSoft,
                width: "140px",
                borderBottom: `1px solid ${libcat.rule}`,
              }}
            >
              {r.label}
            </th>
            <td
              className="py-1.5"
              style={{
                color: libcat.ink,
                borderBottom: `1px solid ${libcat.rule}`,
                ...(r.isMono ? mono : {}),
              }}
            >
              {r.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Row({ label, value, mono: isMono }: { label: string; value: string; mono?: boolean }) {
  return (
    <li className="flex items-baseline justify-between gap-2">
      <span style={{ color: libcat.inkSoft, ...serif }}>{label}</span>
      <span style={isMono ? mono : sans}>{value}</span>
    </li>
  );
}

function ActionLink({ label }: { label: string }) {
  return (
    <p>
      <a className="hover:underline cursor-pointer" style={{ color: libcat.link }}>
        {label}
      </a>
    </p>
  );
}
