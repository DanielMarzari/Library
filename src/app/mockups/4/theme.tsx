"use client";

// Shared theme + chrome for the LibraryCat-style mockup (mockup #4).
// Classic OPAC (Online Public Access Catalog) look: cream paper background,
// blue catalog links, dense rows, serif headings, oxblood accents.

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

export const libcat = {
  paper: "#F4ECDA",      // cream paper background
  paperLight: "#FBF6E9",
  paperDeep: "#E8DEC4",
  card: "#FFFFFF",
  ink: "#2A2722",        // body text — deep brown-gray
  inkSoft: "#6B5F4F",
  inkFaint: "#A8997F",
  link: "#1652A1",       // classic catalog link blue
  linkVisited: "#6B428C",
  accent: "#8B3A2F",     // oxblood for badges / selected facets
  brass: "#B08020",
  green: "#3F5B36",
  rule: "#D8CFB8",
  border: "#C9BEA5",
};

export const libcatFontImport =
  "https://fonts.googleapis.com/css2?family=Bitter:wght@400;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap";

export const serif: CSSProperties = { fontFamily: "'Bitter', Georgia, serif" };
export const sans: CSSProperties = { fontFamily: "'Inter', system-ui, sans-serif" };
export const mono: CSSProperties = { fontFamily: "'JetBrains Mono', 'Courier New', monospace" };

export function LibcatShell({
  children,
  query = "",
  onQueryChange,
  onSubmit,
  showSearch = true,
}: {
  children: ReactNode;
  query?: string;
  onQueryChange?: (v: string) => void;
  onSubmit?: () => void;
  showSearch?: boolean;
}) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href={libcatFontImport} />
      <div
        style={{
          background: libcat.paper,
          color: libcat.ink,
          minHeight: "100vh",
          ...sans,
        }}
      >
        {/* Library brand bar */}
        <div
          style={{
            background: libcat.ink,
            color: libcat.paperLight,
            borderBottom: `2px solid ${libcat.brass}`,
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <Link href="/mockups/4" className="flex items-center gap-3 group">
              <CrestSmall />
              <div>
                <p
                  className="text-[10px] uppercase tracking-[0.25em] opacity-70"
                  style={mono}
                >
                  A Personal Library
                </p>
                <p
                  className="text-xl leading-none"
                  style={{ ...serif, fontWeight: 700 }}
                >
                  Marzari Catalog
                </p>
              </div>
            </Link>
            <div className="hidden sm:flex items-center gap-4 text-xs" style={mono}>
              <span className="opacity-70">{new Date().toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
              <span className="opacity-40">·</span>
              <Link href="/mockups" className="hover:underline" style={{ color: libcat.brass }}>
                back to mockups
              </Link>
            </div>
          </div>
        </div>

        {/* Tab nav */}
        <div
          style={{
            background: libcat.paperLight,
            borderBottom: `1px solid ${libcat.border}`,
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto">
            {[
              { label: "Catalog", href: "/mockups/4" },
              { label: "Tags", href: "/mockups/4?facet=tag" },
              { label: "Authors", href: "/mockups/4?facet=author" },
              { label: "Recently Added", href: "/mockups/4?sort=recent" },
              { label: "About", href: "#" },
            ].map((t, i) => (
              <Link
                key={t.label}
                href={t.href}
                className="px-3 py-2 text-sm whitespace-nowrap hover:underline"
                style={{
                  ...serif,
                  color: i === 0 ? libcat.ink : libcat.link,
                  fontWeight: i === 0 ? 700 : 400,
                  borderBottom: i === 0 ? `2px solid ${libcat.accent}` : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Search row */}
        {showSearch && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSubmit?.();
              }}
              className="flex items-stretch gap-0 max-w-2xl"
            >
              <input
                type="search"
                placeholder="Search the catalog by title, author, ISBN, or DOI..."
                value={query}
                onChange={(e) => onQueryChange?.(e.target.value)}
                className="flex-1 px-3 py-2 text-sm"
                style={{
                  background: libcat.card,
                  border: `1px solid ${libcat.border}`,
                  borderRight: "none",
                  color: libcat.ink,
                  outline: "none",
                  ...sans,
                }}
              />
              <button
                type="submit"
                className="px-5 py-2 text-sm hover:brightness-95"
                style={{
                  background: libcat.accent,
                  color: libcat.paperLight,
                  border: `1px solid ${libcat.accent}`,
                  fontWeight: 600,
                  ...sans,
                }}
              >
                Search
              </button>
            </form>
          </div>
        )}

        {/* Page content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">{children}</div>

        {/* Footer */}
        <footer
          className="mt-12 py-6"
          style={{ background: libcat.paperDeep, borderTop: `1px solid ${libcat.border}` }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 text-xs" style={{ color: libcat.inkSoft }}>
            <p style={mono}>Catalog last indexed {new Date().toLocaleDateString()}</p>
            <p style={{ ...serif, fontStyle: "italic" }}>
              &ldquo;A room without books is like a body without a soul.&rdquo;
            </p>
            <p style={mono}>Mockup #04 · LibraryCat</p>
          </div>
        </footer>
      </div>
    </>
  );
}

function CrestSmall() {
  return (
    <svg width="38" height="38" viewBox="0 0 40 40" fill="none" aria-hidden>
      <circle cx="20" cy="20" r="18" stroke={libcat.brass} strokeWidth="1.4" />
      <circle cx="20" cy="20" r="13" stroke={libcat.brass} strokeWidth="0.6" />
      <path d="M14 14 L26 14 L26 28 L14 28 Z" fill={libcat.brass} opacity="0.2" />
      <path d="M14 14 L26 14 L26 28 L14 28 Z" stroke={libcat.brass} strokeWidth="0.8" fill="none" />
      <path d="M17 18 L23 18 M17 21 L23 21 M17 24 L21 24" stroke={libcat.brass} strokeWidth="0.8" />
    </svg>
  );
}
