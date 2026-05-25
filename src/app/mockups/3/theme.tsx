// Shared theme + chrome for the Reel mockup pages.

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

export const reel = {
  bg: "#0A0A0F",
  surface: "#15151D",
  surfaceHi: "#1F1F2A",
  surfaceTop: "#262633",
  ink: "#F5F5F7",
  inkSoft: "#8E8E9A",
  inkFaint: "#4A4A55",
  hot: "#FF3B5C",
  amber: "#F5C518",
  cyan: "#3DDBD9",
  violet: "#A78BFA",
};

export const reelFontImport =
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter+Tight:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap";

export const display: CSSProperties = {
  fontFamily: "'Bebas Neue', 'Inter Tight', sans-serif",
  letterSpacing: "0.01em",
};
export const body: CSSProperties = { fontFamily: "'Inter Tight', sans-serif" };
export const mono: CSSProperties = { fontFamily: "'DM Mono', monospace" };

const TABS = [
  { key: "diary", label: "DIARY", href: "/mockups/3/diary" },
  { key: "shelf", label: "SHELF", href: "/mockups/3" },
  { key: "book", label: "BOOK", href: "/mockups/3/book" },
] as const;

export type ReelTab = "diary" | "shelf" | "book";

export function ReelShell({
  current,
  children,
  showHeaderBg = true,
}: {
  current: ReelTab;
  children: ReactNode;
  showHeaderBg?: boolean;
}) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href={reelFontImport} />
      <div
        style={{
          background: reel.bg,
          color: reel.ink,
          minHeight: "100vh",
          ...body,
        }}
      >
        <header
          className="sticky top-0 z-30 backdrop-blur-xl"
          style={{
            background: showHeaderBg ? `${reel.bg}cc` : "transparent",
            borderBottom: showHeaderBg ? `1px solid ${reel.surfaceHi}` : "none",
          }}
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-8 py-3 flex items-center justify-between">
            <Link href="/mockups/3" className="flex items-center gap-2.5">
              <ReelLogo />
              <p className="text-2xl tracking-[0.08em]" style={display}>
                REEL
              </p>
            </Link>
            <nav
              className="hidden md:flex items-center gap-7 text-sm"
              style={mono}
            >
              {TABS.map((t) => {
                const active = current === t.key;
                return (
                  <Link
                    key={t.label}
                    href={t.href}
                    className="hover:opacity-100 transition-opacity"
                    style={{
                      color: active ? reel.hot : reel.inkSoft,
                      opacity: active ? 1 : 0.8,
                    }}
                  >
                    {t.label}
                  </Link>
                );
              })}
              <span style={{ color: reel.inkFaint }}>·</span>
              <a style={{ color: reel.inkSoft, opacity: 0.8 }}>LISTS</a>
              <a style={{ color: reel.inkSoft, opacity: 0.8 }}>PROFILE</a>
            </nav>
            <Link
              href="/mockups"
              className="text-xs px-3 py-1.5 border"
              style={{
                ...mono,
                borderColor: reel.surfaceHi,
                color: reel.inkSoft,
              }}
            >
              ← mockups
            </Link>
          </div>
        </header>

        <main>{children}</main>

        {/* Mobile bottom nav */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 z-40"
          style={{
            background: `${reel.bg}f0`,
            backdropFilter: "blur(10px)",
            borderTop: `1px solid ${reel.surfaceHi}`,
            paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
            paddingTop: "8px",
          }}
        >
          <div className="flex items-center justify-around px-2">
            {TABS.map((t) => {
              const active = current === t.key;
              return (
                <Link
                  key={t.label}
                  href={t.href}
                  className="flex-1 py-2 text-center"
                  style={{ color: active ? reel.hot : reel.inkSoft, ...mono }}
                >
                  <p className="text-[10px] tracking-[0.25em]">{t.label}</p>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}

function ReelLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <circle cx="14" cy="14" r="12" stroke="#FF3B5C" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="3" fill="#FF3B5C" />
      <circle cx="14" cy="5" r="1.2" fill="#FF3B5C" />
      <circle cx="14" cy="23" r="1.2" fill="#FF3B5C" />
      <circle cx="5" cy="14" r="1.2" fill="#FF3B5C" />
      <circle cx="23" cy="14" r="1.2" fill="#FF3B5C" />
    </svg>
  );
}
