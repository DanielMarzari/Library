"use client";

// Shared theme + chrome for the Bento Pop mockup pages.

import Link from "next/link";
import { useState } from "react";
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
  orange: "#FF8A3B",
  card: "#FFFFFF",
};

export const bentoFontImport =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap";

export const display: CSSProperties = { fontFamily: "'Space Grotesk', sans-serif" };
export const body: CSSProperties = { fontFamily: "'Inter', sans-serif" };

// Primary mobile bottom tabs (the four most-used screens)
const PRIMARY_TABS = [
  { label: "Home", href: "/mockups/1", icon: HomeIcon, key: "home" },
  { label: "Shelf", href: "/mockups/1/shelf", icon: ShelfIcon, key: "shelf" },
  { label: "Reading", href: "/mockups/1/list", icon: ListIcon, key: "list" },
  { label: "Authors", href: "/mockups/1/authors", icon: PeopleIcon, key: "authors" },
] as const;

// "More" overflow — accessed via top bar (and a 5th mobile-nav button)
const MORE_TABS = [
  { label: "Stats", href: "/mockups/1/stats", key: "stats", color: "#06D6A0" },
  { label: "Lending", href: "/mockups/1/lending", key: "lending", color: "#FF8A3B" },
  { label: "Recommendations", href: "/mockups/1/recommendations", key: "recs", color: "#C8B6FF" },
  { label: "Goals", href: "/mockups/1/goals", key: "goals", color: "#EF476F" },
  { label: "Wrapped", href: "/mockups/1/wrapped", key: "wrapped", color: "#FFD166" },
  { label: "Skills", href: "/mockups/1/expertise", key: "expertise", color: "#118AB2" },
] as const;

export type BentoTab =
  | "home"
  | "shelf"
  | "list"
  | "authors"
  | "book"
  | "stats"
  | "lending"
  | "recs"
  | "goals"
  | "wrapped"
  | "expertise";

export function BentoShell({
  current,
  children,
}: {
  current: BentoTab;
  children: ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

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
        {/* Top bar */}
        <header className="max-w-7xl mx-auto px-4 sm:px-5 pt-5 pb-3 flex items-center justify-between gap-2">
          <Link href="/mockups/1" className="flex items-center gap-2.5 flex-shrink-0">
            <div
              className="w-9 h-9 rounded-full grid place-items-center text-white font-bold text-sm"
              style={{ background: bento.ink, ...display }}
            >
              L
            </div>
            <p className="text-xl font-bold" style={display}>
              library<span style={{ color: bento.pink }}>.</span>
            </p>
          </Link>

          {/* Desktop primary nav */}
          <nav
            className="hidden md:flex items-center gap-1 p-1 rounded-full"
            style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}
          >
            {PRIMARY_TABS.map((t) => {
              const active = current === t.key;
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
            <MoreButton
              activeKey={current}
              open={moreOpen}
              onToggle={() => setMoreOpen((o) => !o)}
            />
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mobile "More" trigger */}
            <button
              className="md:hidden w-9 h-9 rounded-full grid place-items-center"
              style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}
              onClick={() => setMoreOpen((o) => !o)}
              aria-label="More"
            >
              <DotsIcon />
            </button>
            <Link
              href="/mockups"
              className="hidden sm:inline-flex px-3 py-2 rounded-full text-xs font-medium border whitespace-nowrap"
              style={{ borderColor: bento.ink + "20", background: bento.card, ...display }}
            >
              ← Mockups
            </Link>
          </div>
        </header>

        {/* Slide-out "More" sheet — used by both desktop dropdown and mobile button */}
        {moreOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setMoreOpen(false)}
            />
            <div
              className="fixed top-0 right-0 bottom-0 w-72 z-50 p-5 overflow-y-auto"
              style={{
                background: bento.card,
                borderLeft: `1px solid ${bento.ink}10`,
                boxShadow: "-10px 0 30px rgba(0,0,0,0.1)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <p
                  className="text-[10px] uppercase tracking-wider font-semibold"
                  style={{ color: bento.inkSoft, ...display }}
                >
                  All pages
                </p>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="text-xl"
                  style={{ color: bento.inkSoft }}
                >
                  ×
                </button>
              </div>

              <div className="space-y-1">
                <NavGroup label="Primary" />
                {PRIMARY_TABS.map((t) => (
                  <NavLink
                    key={t.key}
                    href={t.href}
                    label={t.label}
                    active={current === t.key}
                    onClick={() => setMoreOpen(false)}
                  />
                ))}

                <NavGroup label="More" />
                {MORE_TABS.map((t) => (
                  <NavLink
                    key={t.key}
                    href={t.href}
                    label={t.label}
                    color={t.color}
                    active={current === t.key}
                    onClick={() => setMoreOpen(false)}
                  />
                ))}

                <NavGroup label="Other" />
                <NavLink
                  href="/mockups"
                  label="Back to all mockups"
                  onClick={() => setMoreOpen(false)}
                />
              </div>
            </div>
          </>
        )}

        {/* Page content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-5 pb-28 md:pb-10">
          {children}
        </main>

        {/* Mobile bottom tab bar */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 z-30"
          style={{ background: `${bento.bg}f0`, backdropFilter: "blur(10px)" }}
        >
          <div
            className="flex items-center justify-around rounded-full px-2 py-2 shadow-lg"
            style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}
          >
            {PRIMARY_TABS.map((t) => {
              const active = current === t.key;
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
                  <span className="text-[10px] mt-0.5 font-semibold" style={display}>
                    {t.label}
                  </span>
                </Link>
              );
            })}
            <button
              onClick={() => setMoreOpen(true)}
              className="flex flex-col items-center justify-center flex-1 py-1.5 rounded-full"
              style={{ color: bento.inkSoft }}
            >
              <DotsIcon />
              <span className="text-[10px] mt-0.5 font-semibold" style={display}>
                More
              </span>
            </button>
          </div>
        </nav>
      </div>
    </>
  );
}

function MoreButton({
  open,
  onToggle,
}: {
  activeKey: BentoTab;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="px-4 py-2 text-sm font-medium rounded-full transition-colors flex items-center gap-1.5"
      style={{
        background: open ? bento.ink : "transparent",
        color: open ? bento.bg : bento.ink,
      }}
    >
      More
      <span style={{ fontSize: "10px" }}>{open ? "▲" : "▼"}</span>
    </button>
  );
}

function NavGroup({ label }: { label: string }) {
  return (
    <p
      className="text-[10px] uppercase tracking-wider font-semibold mt-4 mb-1 px-3"
      style={{ color: bento.inkSoft, ...display }}
    >
      {label}
    </p>
  );
}

function NavLink({
  href,
  label,
  active,
  color,
  onClick,
}: {
  href: string;
  label: string;
  active?: boolean;
  color?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2.5"
      style={{
        background: active ? bento.ink : "transparent",
        color: active ? bento.bg : bento.ink,
      }}
    >
      {color && (
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: color }}
        />
      )}
      <span>{label}</span>
    </Link>
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

function ShelfIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="3" height="14" />
      <rect x="9" y="5" width="3" height="12" />
      <rect x="14" y="3" width="3" height="14" />
      <rect x="19" y="6" width="2" height="11" />
      <line x1="3" y1="18" x2="22" y2="18" />
      <line x1="3" y1="20" x2="22" y2="20" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="6" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="18" cy="12" r="1.8" />
    </svg>
  );
}
