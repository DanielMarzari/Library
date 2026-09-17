"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Shared hamburger + dropdown nav. Same shape as the one on the home page,
// so every top-level page (/, /stats, /authors, /reading-list, /goals,
// /lending, /recommendations) gets the same chrome.

const linkCls = "block px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-2 rounded-lg transition-colors";
const activeCls = "block px-3 py-2 text-sm font-medium bg-surface-2 text-foreground rounded-lg";

export function AppNav() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const item = (href: string, label: string) => (
    <Link href={href} className={pathname === href ? activeCls : linkCls} onClick={() => setOpen(false)}>
      {label}
    </Link>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="p-2 rounded-lg bg-surface hover:bg-surface-2 text-muted transition-colors"
        aria-label="Menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-surface border border-border-custom rounded-xl shadow-xl p-2 z-50">
          <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-2 font-semibold">Library</p>
          {item("/", "Home shelf")}

          <div className="border-t border-border-custom my-1.5" />
          <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-2 font-semibold">Tracking</p>
          {item("/stats", "Stats")}
          {item("/goals", "Goals")}
          {item("/reading-list", "Reading List")}
          <Link
            href="/wrapped"
            className="block px-3 py-2 text-sm font-medium bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-300 hover:from-purple-600/30 hover:to-pink-600/30 rounded-lg transition-colors"
            onClick={() => setOpen(false)}
          >
            Wrapped
          </Link>

          <div className="border-t border-border-custom my-1.5" />
          <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-2 font-semibold">Discover</p>
          {item("/authors", "Authors")}
          {item("/skills", "Skills")}
          {item("/recommendations", "Recommendations")}

          <div className="border-t border-border-custom my-1.5" />
          <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-2 font-semibold">Manage</p>
          {item("/lending", "Lending")}
        </div>
      )}
    </div>
  );
}
