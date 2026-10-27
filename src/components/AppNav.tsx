"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The one navigation menu, used by every page.
 *
 * It did not used to be. The home page carried its own hand-written copy of
 * this list, which stopped being updated — so What next, Finish and Articles
 * existed but were unreachable from the shelf you land on, and /wrapped had no
 * way out at all. Two lists meant one of them was always wrong.
 *
 * Theme lives here for the same reason: it was home-page state, so the control
 * only existed on one page. Page-specific controls go in `extras`.
 */

const linkCls = "block px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-2 rounded-lg transition-colors";
const activeCls = "block px-3 py-2 text-sm font-medium bg-surface-2 text-foreground rounded-lg";

type Theme = "system" | "light" | "dark";

export function AppNav({ extras }: { extras?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>("system");

  // Read once on mount. The <head> script in layout.tsx has already applied
  // the saved theme by now; this only syncs the control to it.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("library-theme") as Theme | null;
      if (saved === "light" || saved === "dark" || saved === "system") setTheme(saved);
    } catch { /* private window, or storage blocked */ }
  }, []);

  const applyTheme = (t: Theme) => {
    setTheme(t);
    const root = document.documentElement;
    if (t === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", t);
    try { localStorage.setItem("library-theme", t); } catch { /* ignore */ }
  };

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
          {item("/articles", "Articles")}

          <div className="border-t border-border-custom my-1.5" />
          <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-2 font-semibold">Tracking</p>
          {item("/next", "What next")}
          {item("/finish", "Finish")}
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
          {item("/recommendations/manage", "Manage recs")}

          <div className="border-t border-border-custom my-1.5" />
          <div className="px-3 py-2 space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-2 font-semibold mb-2">Theme</p>
              <div className="flex gap-1 bg-surface-2 rounded-lg p-0.5">
                {([["system", "Auto"], ["light", "Light"], ["dark", "Dark"]] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => applyTheme(val)}
                    className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                      theme === val ? "bg-background text-foreground shadow-sm" : "text-muted-2 hover:text-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {/* Whatever this particular page wants to offer — the shelf puts its
                book-size control here. */}
            {extras}
          </div>
        </div>
      )}
    </div>
  );
}
