// Shared theme + chrome for the Bento Pop mockup pages.

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

export const bento = {
  bg: "#FFF9EE",
  ink: "#0B0B16",
  inkSoft: "#5C5C70",
  yellow: "#FFD166",
  green: "#06D6A0",
  pink: "#EF476F",
  blue: "#118AB2",
  lilac: "#C8B6FF",
  card: "#FFFFFF",
};

export const bentoFontImport =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap";

export const display: CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" };
export const body: CSSProperties = { fontFamily: "'Inter', sans-serif" };

const TABS = [
  { label: "Shelf", href: "/mockups/1", icon: HomeIcon },
  { label: "Reading", href: "/mockups/1/list", icon: ListIcon },
  { label: "Authors", href: "/mockups/1/authors", icon: PeopleIcon },
  { label: "Detail", href: "/mockups/1/book", icon: BookIcon },
];

export function BentoShell({
  current,
  children,
}: {
  current: "shelf" | "list" | "authors" | "book";
  children: ReactNode;
}) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href={bentoFontImport} />
      <div
        style={{
          background: `radial-gradient(at 0% 0%, ${bento.yellow}66 0%, transparent 40%), radial-gradient(at 100% 0%, ${bento.lilac}66 0%, transparent 50%), radial-gradient(at 50% 100%, ${bento.green}33 0%, transparent 50%), ${bento.bg}`,
          minHeight: "100vh",
          color: bento.ink,
          ...body,
        }}
      >
        {/* Top bar (desktop) / compact header (mobile) */}
        <header className="max-w-7xl mx-auto px-4 sm:px-5 pt-5 pb-3 flex items-center justify-between">
          <Link href="/mockups/1" className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-full grid place-items-center text-white font-bold text-sm"
              style={{ background: bento.ink, ...display }}
            >
              L
            </div>
            <p className="text-xl font-bold" style={display}>
              library
              <span style={{ color: bento.pink }}>.</span>
            </p>
          </Link>

          <nav
            className="hidden md:flex items-center gap-1 p-1 rounded-full"
            style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}
          >
            {TABS.map((t) => {
              const active =
                (current === "shelf" && t.label === "Shelf") ||
                (current === "list" && t.label === "Reading") ||
                (current === "authors" && t.label === "Authors") ||
                (current === "book" && t.label === "Detail");
              return (
                <Link
                  key={t.label}
                  href={t.href}
                  className="px-4 py-2 text-sm font-medium rounded-full transition-colors"
                  style={{
                    background: active ? bento.ink : "transparent",
                    color: active ? bento.bg : bento.ink,
                  }}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/mockups"
            className="px-3 py-2 rounded-full text-xs font-medium border"
            style={{
              borderColor: bento.ink + "20",
              background: bento.card,
              ...display,
            }}
          >
            ← Mockups
          </Link>
        </header>

        {/* Page content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-5 pb-28 md:pb-10">
          {children}
        </main>

        {/* Mobile bottom tab bar */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 z-40"
          style={{ background: `${bento.bg}f0`, backdropFilter: "blur(10px)" }}
        >
          <div
            className="flex items-center justify-around rounded-full px-2 py-2 shadow-lg"
            style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}
          >
            {TABS.map((t) => {
              const active =
                (current === "shelf" && t.label === "Shelf") ||
                (current === "list" && t.label === "Reading") ||
                (current === "authors" && t.label === "Authors") ||
                (current === "book" && t.label === "Detail");
              const Icon = t.icon;
              return (
                <Link
                  key={t.label}
                  href={t.href}
                  className="flex flex-col items-center justify-center flex-1 py-1.5 rounded-full"
                  style={{
                    background: active ? bento.ink : "transparent",
                    color: active ? bento.bg : bento.inkSoft,
                  }}
                >
                  <Icon />
                  <span
                    className="text-[10px] mt-0.5 font-semibold"
                    style={display}
                  >
                    {t.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12l9-9 9 9" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="20" y2="12" />
      <line x1="8" y1="18" x2="20" y2="18" />
      <circle cx="4" cy="6" r="1.4" fill="currentColor" />
      <circle cx="4" cy="12" r="1.4" fill="currentColor" />
      <circle cx="4" cy="18" r="1.4" fill="currentColor" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.5 20c.6-3.4 3.4-5.4 6.5-5.4S15 16.6 15.5 20" />
      <circle cx="17" cy="9.5" r="2.6" />
      <path d="M15 14.5c2.2 0 4.6 1.2 5.5 4" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h11a3 3 0 0 1 3 3v14H7a3 3 0 0 1-3-3V4z" />
      <path d="M4 18a3 3 0 0 1 3-3h11" />
    </svg>
  );
}
