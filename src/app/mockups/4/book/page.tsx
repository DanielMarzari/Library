"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LibcatShell, libcat, heading, sans } from "../theme";
import { coverFor, useCatalog, type CatalogBook } from "../useCatalog";

export default function LibcatBookPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LibcatBookDetail />
    </Suspense>
  );
}

function Loading() {
  return (
    <LibcatShell>
      <p style={{ padding: 30, color: libcat.textMuted }}>Loading record…</p>
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
      <LibcatShell>
        <p style={{ padding: 30, color: libcat.textMuted }}>Loading record…</p>
      </LibcatShell>
    );
  }

  return (
    <LibcatShell>
      {/* Breadcrumbs — Bootstrap 3 style: light gray bg, › separators */}
      <ol
        className="breadcrumb"
        style={{
          background: libcat.breadcrumbBg,
          padding: "8px 15px",
          borderRadius: 4,
          marginBottom: 20,
          listStyle: "none",
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          fontSize: 13,
        }}
      >
        <li>
          <Link href="/mockups/4" style={{ color: libcat.link }}>
            Catalog
          </Link>
        </li>
        <li style={{ color: libcat.textMuted }}>
          ›{" "}
          <span style={{ color: libcat.text }}>
            {book.title.length > 60 ? book.title.slice(0, 60) + "…" : book.title}
          </span>
        </li>
      </ol>

      {/* Main work area — col-md-9 main + col-md-3 sidebar, matching the
          TinyCat result/sidebar split */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* MAIN */}
        <div className="md:col-span-9">
          {/* Header: cover + bibliographic info */}
          <header
            className="grid grid-cols-12 gap-4 pb-4 mb-4"
            style={{ borderBottom: `1px solid ${libcat.borderLight}` }}
          >
            <div className="col-span-4 sm:col-span-3 md:col-span-3">
              <Cover book={book} />
            </div>
            <div className="col-span-8 sm:col-span-9 md:col-span-9">
              <h1
                style={{
                  ...heading,
                  fontSize: 26,
                  margin: 0,
                  marginBottom: 6,
                  color: libcat.text,
                }}
              >
                {book.title}
              </h1>
              <p style={{ fontSize: 16, margin: 0, marginBottom: 4 }}>
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
              </p>
              <p style={{ fontSize: 13, color: libcat.textMuted, marginBottom: 16 }}>
                {book.item_type === "article" ? "Article" : "Book"}
                {book.publication_year ? `, ${book.publication_year}` : ""}
                {book.pages ? ` · ${book.pages} pages` : ""}
              </p>

              {/* Bibliographic table — matches the labeled rows on search */}
              {book.topics.length > 0 && (
                <BibRow label={book.topics.length === 1 ? "Tag" : "Tags"}>
                  {book.topics.map((t, i) => (
                    <span key={t}>
                      <Link
                        href={`/mockups/4?tag=${encodeURIComponent(t)}`}
                        style={{ color: libcat.link, textDecoration: "none" }}
                        className="hover:underline"
                      >
                        {t}
                      </Link>
                      {i < book.topics.length - 1 && ", "}
                    </span>
                  ))}
                </BibRow>
              )}

              {book.source && (
                <BibRow
                  label={book.source.includes(",") ? "Collections" : "Collection"}
                >
                  {book.source.split(",").map((s, i, arr) => {
                    const v = s.trim();
                    return (
                      <span key={v}>
                        <Link
                          href={`/mockups/4?source=${encodeURIComponent(v)}`}
                          style={{ color: libcat.link, textDecoration: "none" }}
                          className="hover:underline"
                        >
                          {v}
                        </Link>
                        {i < arr.length - 1 && ", "}
                      </span>
                    );
                  })}
                </BibRow>
              )}

              {book.isbn && (
                <BibRow label="ISBN">
                  <span style={{ fontFamily: "Menlo, monospace", fontSize: 13 }}>
                    {book.isbn}
                  </span>
                </BibRow>
              )}

              {book.doi && (
                <BibRow label="DOI">
                  <a
                    href={`https://doi.org/${book.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: libcat.link,
                      fontFamily: "Menlo, monospace",
                      fontSize: 13,
                      textDecoration: "none",
                    }}
                    className="hover:underline"
                  >
                    {book.doi}
                  </a>
                </BibRow>
              )}

              {book.journal && (
                <BibRow label="Journal">
                  <em>{book.journal}</em>
                </BibRow>
              )}

              {(book.ddc || book.lcc) && (
                <BibRow label="Call number">
                  <span
                    className="callnumber ddc_num_bare"
                    style={{ fontFamily: "Menlo, monospace", fontSize: 13 }}
                  >
                    {book.ddc || book.lcc}
                  </span>
                </BibRow>
              )}

              <BibRow label="Date added">
                {new Date(book.created_at).toLocaleDateString("en-US", {
                  dateStyle: "medium",
                })}
              </BibRow>
            </div>
          </header>

          {/* Description / abstract */}
          {book.description && (
            <section style={{ marginBottom: 24 }}>
              <h2
                style={{
                  ...heading,
                  fontSize: 18,
                  marginTop: 0,
                  marginBottom: 8,
                  color: libcat.text,
                  paddingBottom: 4,
                  borderBottom: `1px solid ${libcat.borderLight}`,
                }}
              >
                Description
              </h2>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: libcat.text }}>
                {book.description}
              </p>
            </section>
          )}

          {/* Open Library auto-topics */}
          {book.auto_topics.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h2
                style={{
                  ...heading,
                  fontSize: 18,
                  marginTop: 0,
                  marginBottom: 8,
                  color: libcat.text,
                  paddingBottom: 4,
                  borderBottom: `1px solid ${libcat.borderLight}`,
                }}
              >
                Subjects (from Open Library)
              </h2>
              <p style={{ fontSize: 14, color: libcat.text }}>
                {book.auto_topics.slice(0, 25).map((t, i, arr) => (
                  <span key={t}>
                    <Link
                      href={`/mockups/4?tag=${encodeURIComponent(t)}`}
                      style={{ color: libcat.link, textDecoration: "none" }}
                      className="hover:underline"
                    >
                      {t}
                    </Link>
                    {i < arr.length - 1 && " · "}
                  </span>
                ))}
              </p>
            </section>
          )}

          {/* Back link */}
          <p style={{ fontSize: 13, marginTop: 30 }}>
            <Link
              href="/mockups/4"
              style={{ color: libcat.link, textDecoration: "none" }}
              className="hover:underline"
            >
              ← Back to catalog
            </Link>
          </p>
        </div>

        {/* SIDEBAR — actions / holdings */}
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
                fontSize: 12,
                color: libcat.textMuted,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                margin: "0 0 8px 0",
                paddingBottom: 6,
                borderBottom: `1px solid ${libcat.borderLight}`,
              }}
            >
              Status
            </h3>
            <p style={{ margin: "0 0 12px 0", fontSize: 14 }}>
              {book.status === "read"
                ? "On the shelf"
                : book.status === "reading"
                ? "Currently checked out"
                : "Not yet read"}
            </p>

            <h3
              style={{
                ...heading,
                fontSize: 12,
                color: libcat.textMuted,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                margin: "0 0 8px 0",
                paddingBottom: 6,
                borderBottom: `1px solid ${libcat.borderLight}`,
              }}
            >
              This item
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {[
                "Edit this record",
                "Add a review",
                "Email to me",
                "Add to a list",
                "Print",
              ].map((label) => (
                <li key={label} style={{ marginBottom: 4 }}>
                  <a
                    style={{
                      color: libcat.link,
                      textDecoration: "none",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                    className="hover:underline"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </LibcatShell>
  );
}

function Cover({ book }: { book: CatalogBook }) {
  const src = coverFor(book);
  if (src) {
    return (
      <img
        src={src}
        alt={book.title}
        style={{
          width: "100%",
          height: "auto",
          border: `1px solid ${libcat.border}`,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "2 / 3",
        background: "#F0F0F0",
        border: `1px solid ${libcat.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 8,
        textAlign: "center",
        color: libcat.textMuted,
        fontSize: 12,
        ...sans,
      }}
    >
      no cover
    </div>
  );
}

function BibRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="grid grid-cols-12 gap-2 items-baseline"
      style={{ marginTop: 4, fontSize: 14 }}
    >
      <div
        className="col-span-4 sm:col-span-3"
        style={{ color: libcat.textMuted }}
      >
        {label}
      </div>
      <div className="col-span-8 sm:col-span-9" style={{ color: libcat.text }}>
        {children}
      </div>
    </div>
  );
}
