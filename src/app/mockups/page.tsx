export const dynamic = "force-static";

import Link from "next/link";

interface Mockup {
  id: string;
  name: string;
  tagline: string;
  description: string;
  palette: string[];
  font: string;
  vibe: string;
  bg: string;
  text: string;
  sublinks?: { label: string; href: string }[];
}

const MOCKUPS: Mockup[] = [
  {
    id: "1",
    name: "Bento Pop",
    tagline: "Colorful tiles · mobile-first",
    description:
      "Modern bento dashboard with mixed-size tiles, color-coded by status. Big covers, stats, streaks, goal progress. Now with sub-pages: book detail, reading list, and authors — all built mobile-first with a bottom tab bar.",
    palette: ["#FFF9EE", "#0B0B16", "#FFD166", "#06D6A0", "#EF476F", "#C8B6FF"],
    font: "Space Grotesk + Inter",
    vibe: "Playful · Modern · Mobile-first",
    bg: "linear-gradient(135deg, #FFE9B7 0%, #FFB6D8 60%, #B7E4FF 100%)",
    text: "#0B0B16",
    sublinks: [
      { label: "Dashboard", href: "/mockups/1" },
      { label: "Book", href: "/mockups/1/book" },
      { label: "Reading list", href: "/mockups/1/list" },
      { label: "Authors", href: "/mockups/1/authors" },
    ],
  },
  {
    id: "2",
    name: "The Catalog",
    tagline: "Card-catalog · everything on one page",
    description:
      "Academic library aesthetic — sepia paper, ruled rows, classification numbers (LCC), serif type, monospace call numbers. Every book in the collection visible on a single scrolling index, alongside a subject index and a personal circulation slip.",
    palette: ["#F2E8D5", "#1F1A14", "#7A2E1F", "#B08020", "#3F5B36"],
    font: "Libre Bodoni + Libre Caslon + JetBrains Mono",
    vibe: "Scholarly · Dense · Tactile",
    bg: "repeating-linear-gradient(0deg, #F2E8D5 0, #F2E8D5 18px, #E5D7B5 18px, #E5D7B5 19px)",
    text: "#1F1A14",
  },
  {
    id: "3",
    name: "Reel",
    tagline: "Dark · cinematic · diary",
    description:
      "Letterboxd-for-books vibe. Featured book is a full-bleed hero with its own cover as a blurred backdrop. Bebas Neue display, poster-grid for the whole shelf, IMDb-yellow rating chips, and a chronological reading diary feed. Moody and obsessive — for the collector.",
    palette: ["#0A0A0F", "#F5F5F7", "#FF3B5C", "#F5C518", "#3DDBD9", "#A78BFA"],
    font: "Bebas Neue + Inter Tight + DM Mono",
    vibe: "Moody · Bold · Image-driven",
    bg: "radial-gradient(at top, #1F1F2A 0%, #0A0A0F 70%)",
    text: "#F5F5F7",
  },
];

export default function MockupsIndex() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-2 mb-2">
              Design exploration · v2
            </p>
            <h1 className="text-4xl font-bold text-emerald-500">Mockups</h1>
            <p className="text-muted mt-2 max-w-2xl">
              Three directions. Bento Pop now has multiple sub-pages for mobile,
              The Catalog shows every book on one academic page, and Reel is a
              moody cinematic take. Mock data only — nothing here writes.
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-surface hover:bg-surface-2 rounded-lg text-foreground transition-colors text-sm"
          >
            Back to Library
          </Link>
        </div>

        {/* Preview grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MOCKUPS.map((m) => (
            <div
              key={m.id}
              className="block rounded-2xl overflow-hidden border border-border-custom hover:border-emerald-500/60 transition-colors"
            >
              <Link href={`/mockups/${m.id}`} className="block">
                {/* Preview swatch */}
                <div
                  className="aspect-[4/3] flex flex-col items-center justify-center p-6 relative"
                  style={{ background: m.bg, color: m.text }}
                >
                  <p className="text-[10px] uppercase tracking-[0.25em] mb-2 opacity-70">
                    Mockup {m.id}
                  </p>
                  <p className="text-3xl font-semibold text-center leading-tight">
                    {m.name}
                  </p>
                  <p className="text-sm opacity-70 mt-2 text-center">
                    {m.tagline}
                  </p>

                  {/* Palette swatches */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {m.palette.map((c) => (
                      <div
                        key={c}
                        className="w-5 h-5 rounded-full border border-black/10 shadow"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </Link>

              {/* Description */}
              <div className="p-5 bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider text-emerald-500 font-semibold">
                    {m.vibe}
                  </span>
                  <Link
                    href={`/mockups/${m.id}`}
                    className="text-muted-2 text-sm hover:text-foreground transition-colors"
                  >
                    View →
                  </Link>
                </div>
                <p className="text-sm text-muted leading-relaxed mb-3">
                  {m.description}
                </p>
                <p className="text-xs text-muted-2 mb-3">
                  <span className="text-muted">Fonts:</span> {m.font}
                </p>

                {m.sublinks && (
                  <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border-custom">
                    {m.sublinks.map((s) => (
                      <Link
                        key={s.href}
                        href={s.href}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-surface-2 hover:bg-border-custom text-foreground transition-colors"
                      >
                        {s.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Note */}
        <div className="mt-12 p-5 rounded-xl bg-surface border border-border-custom">
          <p className="text-sm text-muted">
            <span className="text-foreground font-medium">How to use these:</span>{" "}
            pick a direction (or steal pieces from each), and I&apos;ll port the
            real Library views into the chosen system.
          </p>
        </div>
      </div>
    </div>
  );
}
