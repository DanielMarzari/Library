"use client";

// LibraryCat (TinyCat) mockup theme — matched to the real markup at
// www.librarycat.org. The site is Bootstrap 3.3.4, uses a system Helvetica/
// Arial font stack (no Google Fonts), and is mostly white with Bootstrap's
// default blue links and gray UI chrome.

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

export const libcat = {
  // Page chrome
  page: "#FFFFFF",          // body background
  navbarBg: "#FFFFFF",      // top navbar
  navbarBorder: "#E7E7E7",  // navbar bottom border
  breadcrumbBg: "#F5F5F5",  // .breadcrumb default
  text: "#333333",          // body text
  textMuted: "#777777",     // muted
  textSubtle: "#999999",
  link: "#337AB7",          // Bootstrap 3 link blue
  linkHover: "#23527C",
  border: "#DDDDDD",        // default border
  borderLight: "#EEEEEE",
  btnBg: "#FFFFFF",         // .btn-default background
  btnBorder: "#CCCCCC",
  btnHover: "#E6E6E6",
  // Light section bg for label cells
  labelMuted: "#777777",
  // TinyCat logo / wordmark accents — orange/teal
  brandOrange: "#F2A330",
  brandTeal: "#1B7895",
};

// The real site loads NO Google Fonts. Match the body{} stack from
// Cloudflare's challenge HTML (which is a sensible default that any
// Bootstrap 3 site falls back to):
//   system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,
//   "Helvetica Neue",Arial,"Noto Sans",sans-serif
export const sans: CSSProperties = {
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
};

// Heading style for h2 — Bootstrap 3 default is the same font, just larger
// and 500 weight.
export const heading: CSSProperties = {
  ...sans,
  fontWeight: 500,
  lineHeight: 1.1,
};

export function LibcatShell({
  children,
  query = "",
  onQueryChange,
  onSubmit,
  libraryName = "BibleProject Resource Hub",
}: {
  children: ReactNode;
  query?: string;
  onQueryChange?: (v: string) => void;
  onSubmit?: () => void;
  libraryName?: string;
}) {
  return (
    <div
      style={{
        background: libcat.page,
        color: libcat.text,
        minHeight: "100vh",
        ...sans,
      }}
    >
      {/* ---- Sticky navbar (matches .navbar.navbar-default.navbar-fixed-top.minipac_navbar) ---- */}
      <nav
        className="sticky top-0 z-30"
        style={{
          background: libcat.navbarBg,
          borderBottom: `1px solid ${libcat.navbarBorder}`,
        }}
      >
        <div
          className="mx-auto"
          style={{
            padding: "8px 15px",
            maxWidth: "100%",
          }}
        >
          {/* The real markup is a 3-cell table: search | (user) | logo+name */}
          <div className="flex items-center gap-3" style={{ minHeight: 56 }}>
            {/* Search form */}
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                onSubmit?.();
              }}
              className="flex-1 min-w-0"
              style={{ maxWidth: 600 }}
            >
              <div
                className="input-group flex items-stretch"
                style={{ border: `1px solid ${libcat.btnBorder}`, borderRadius: 4, overflow: "hidden" }}
              >
                <input
                  type="search"
                  value={query}
                  onChange={(e) => onQueryChange?.(e.target.value)}
                  placeholder="Search for..."
                  autoComplete="off"
                  className="flex-1 px-3"
                  style={{
                    border: "none",
                    outline: "none",
                    fontSize: 14,
                    lineHeight: 1.42857,
                    background: "#FFF",
                    color: libcat.text,
                    ...sans,
                  }}
                />
                <button
                  type="submit"
                  aria-label="Search"
                  className="px-3"
                  style={{
                    background: libcat.btnBg,
                    border: "none",
                    borderLeft: `1px solid ${libcat.btnBorder}`,
                    color: libcat.text,
                    cursor: "pointer",
                  }}
                >
                  {/* Magnifying glass (Font Awesome fa-search) */}
                  <SearchIcon />
                </button>
                <button
                  type="button"
                  aria-label="More search options"
                  className="px-2"
                  style={{
                    background: libcat.btnBg,
                    border: "none",
                    borderLeft: `1px solid ${libcat.btnBorder}`,
                    color: libcat.text,
                    cursor: "pointer",
                  }}
                  title="Advanced Search"
                >
                  <span style={{ fontSize: 8 }}>▼</span>
                </button>
              </div>
            </form>

            {/* Logo + library name (right) */}
            <Link
              href="/mockups/4"
              className="flex items-center gap-2 flex-shrink-0"
              style={{ textDecoration: "none", color: libcat.text }}
            >
              <span className="hidden sm:inline" style={{ fontSize: 18, fontWeight: 600 }}>
                {libraryName}
              </span>
              <TinyCatLogo />
            </Link>
          </div>
        </div>
      </nav>

      {/* ---- Page body ---- */}
      <main style={{ padding: "15px" }}>{children}</main>
    </div>
  );
}

// TinyCat logo (orange cat silhouette on white) — recreated as inline SVG so
// we don't need to pull the LibraryThing CDN asset.
function TinyCatLogo() {
  return (
    <svg width="45" height="45" viewBox="0 0 45 45" aria-hidden>
      <rect width="45" height="45" fill="#FFFFFF" />
      {/* Cat ears */}
      <path d="M11 12 L15 5 L19 14 Z" fill={libcat.brandOrange} />
      <path d="M34 12 L30 5 L26 14 Z" fill={libcat.brandOrange} />
      {/* Head */}
      <ellipse cx="22.5" cy="22" rx="13" ry="11" fill={libcat.brandOrange} />
      {/* Eyes */}
      <circle cx="17" cy="20" r="1.6" fill="#FFFFFF" />
      <circle cx="28" cy="20" r="1.6" fill="#FFFFFF" />
      <circle cx="17" cy="20" r="0.8" fill="#222" />
      <circle cx="28" cy="20" r="0.8" fill="#222" />
      {/* Nose */}
      <path d="M21 25 L24 25 L22.5 27 Z" fill="#FFFFFF" />
      {/* Whiskers */}
      <line x1="13" y1="24" x2="18" y2="25" stroke="#FFFFFF" strokeWidth="0.5" />
      <line x1="13" y1="26" x2="18" y2="26" stroke="#FFFFFF" strokeWidth="0.5" />
      <line x1="32" y1="24" x2="27" y2="25" stroke="#FFFFFF" strokeWidth="0.5" />
      <line x1="32" y1="26" x2="27" y2="26" stroke="#FFFFFF" strokeWidth="0.5" />
      {/* TinyCat word */}
      <text x="22.5" y="42" textAnchor="middle" fontSize="6" fill={libcat.text} fontFamily="Helvetica, Arial">
        TinyCat
      </text>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M11.5 10.5h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 5 1.49-1.49zM6.5 11A4.5 4.5 0 1 1 11 6.5 4.5 4.5 0 0 1 6.5 11z" />
    </svg>
  );
}
