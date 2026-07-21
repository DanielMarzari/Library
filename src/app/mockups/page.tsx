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
    tagline: "Full preview — every page in this style",
    description:
      "Complete Bento-styled preview of the app: dashboard, shelf, book detail, reading list, authors, stats, lending, recommendations, goals, year-in-review, and skills. Built mobile-first with a bottom tab bar and a slide-out 'More' menu. Real site untouched.",
    palette: ["#FFF9EE", "#0B0B16", "#FFD166", "#06D6A0", "#EF476F", "#C8B6FF"],
    font: "Space Grotesk + Inter",
    vibe: "Playful · Modern · Mobile-first",
    bg: "linear-gradient(135deg, #FFE9B7 0%, #FFB6D8 60%, #B7E4FF 100%)",
    text: "#0B0B16",
    sublinks: [
      { label: "Home", href: "/mockups/1" },
      { label: "Shelf", href: "/mockups/1/shelf" },
      { label: "Reading", href: "/mockups/1/list" },
      { label: "Authors", href: "/mockups/1/authors" },
      { label: "Book", href: "/mockups/1/book" },
      { label: "Stats", href: "/mockups/1/stats" },
      { label: "Lending", href: "/mockups/1/lending" },
      { label: "Recs", href: "/mockups/1/recommendations" },
      { label: "Goals", href: "/mockups/1/goals" },
      { label: "Wrapped", href: "/mockups/1/wrapped" },
      { label: "Skills", href: "/mockups/1/expertise" },
    ],
  },
  {
    id: "2",
    name: "Field Notes",
    tagline: "Naturalist journal · books as specimens",
    description:
      "An explorer's field journal applied to your library. Forest green + cream + ochre, faint topographic line pattern, hand-drawn compass rose. Books organized by region (author's nationality), each a specimen card with classification, observation notes, and a status stamp.",
    palette: ["#F1EAD8", "#1F3A2C", "#C2823C", "#8B3A2F", "#1A1814"],
    font: "Fraunces + Inter + JetBrains Mono",
    vibe: "Naturalist · Curious · Earthy",
    bg: "linear-gradient(135deg, #F1EAD8 0%, #E5DBC1 100%)",
    text: "#1F3A2C",
  },
  {
    id: "3",
    name: "Reel",
    tagline: "Dark · cinematic · multi-page",
    description:
      "Letterboxd-for-books. Shelf with cover-as-backdrop hero, full book detail page with star ratings + read history, and a chronological diary page with month-grouped entries and a stats rail. Bebas Neue, IMDb-yellow ratings, hot-pink status tape.",
    palette: ["#0A0A0F", "#F5F5F7", "#FF3B5C", "#F5C518", "#3DDBD9", "#A78BFA"],
    font: "Bebas Neue + Inter Tight + DM Mono",
    vibe: "Moody · Bold · Image-driven",
    bg: "radial-gradient(at top, #1F1F2A 0%, #0A0A0F 70%)",
    text: "#F5F5F7",
    sublinks: [
      { label: "Shelf", href: "/mockups/3" },
      { label: "Book", href: "/mockups/3/book" },
      { label: "Diary", href: "/mockups/3/diary" },
    ],
  },
  {
    id: "4",
    name: "LibraryCat",
    tagline: "TinyCat OPAC · rebuilt from the real HTML",
    description:
      "Catalog search styled to actually match librarycat.org/lib/.../search. White page on Bootstrap 3 grid, system Helvetica/Arial (no Google Fonts), classic catalog-blue links (#337AB7), light gray breadcrumb sort bar, sticky white navbar with TinyCat orange-cat logo. Result rows use the real .minipac classes: col-md-1 cover + col-md-6 text, h2 title, \"by Author\", \"Paperback, 1968\" format line, labeled Tags / Collections / Series / Call number rows. Right-side facets (Tags + Collections) instead of left. Sort dropdown reads \"relevancy\" with the same options as the real site.",
    palette: ["#FFFFFF", "#333333", "#337AB7", "#F5F5F5", "#F2A330", "#777777"],
    font: "System UI · Helvetica/Arial (no webfonts)",
    vibe: "Classic OPAC · Bootstrap 3 · Dense",
    bg: "linear-gradient(135deg, #FFFFFF 0%, #F5F5F5 100%)",
    text: "#333333",
    sublinks: [
      { label: "Catalog", href: "/mockups/4" },
      { label: "Book", href: "/mockups/4/book" },
    ],
  },
  {
    id: "5",
    name: "Kinetic Field",
    tagline: "A cover archive that responds in waves",
    description: "A high-energy Anime.js cover field with center-out entrance choreography and pointer-driven local ripples. The collection itself becomes the hero while every cover remains directly browsable.",
    palette: ["#EDFF55", "#0D0C12", "#FF5438", "#FFFFFF"],
    font: "Arial Black + Arial",
    vibe: "Kinetic · Graphic · Responsive",
    bg: "linear-gradient(135deg, #EDFF55 0%, #FF5438 100%)",
    text: "#0D0C12",
  },
  {
    id: "6",
    name: "Orbiting Canon",
    tagline: "Books and ideas arranged by gravity",
    description: "A spatial relationship browser built around an orbiting canon. Selecting a cover redraws the center of gravity and surfaces the ideas attached to it.",
    palette: ["#060D19", "#163C50", "#FFB703", "#F5F0E8"],
    font: "Georgia + Arial",
    vibe: "Spatial · Quiet · Relational",
    bg: "radial-gradient(circle at 70% 40%, #163C50, #060D19 70%)",
    text: "#F5F0E8",
  },
  {
    id: "7",
    name: "Reading River",
    tagline: "A library experienced through time",
    description: "A horizontally flowing reading history with strong chronology, alternating rhythm, and scroll-snap navigation. The motion follows your actual reading path rather than presenting a generic shelf.",
    palette: ["#F1E9DC", "#202827", "#0C7C78", "#FFFFFF"],
    font: "Georgia + Arial",
    vibe: "Temporal · Reflective · Fluid",
    bg: "linear-gradient(135deg, #F1E9DC, #B9D9D2)",
    text: "#202827",
  },
  {
    id: "8",
    name: "Knowledge Constellation",
    tagline: "Browse the ideas behind the shelf",
    description: "An interactive topic constellation that filters the surrounding book cluster. It turns subject metadata into a visual discovery tool while retaining direct search and book access.",
    palette: ["#050509", "#241339", "#CF9FFF", "#F4F0FF"],
    font: "Georgia + Arial",
    vibe: "Celestial · Connected · Exploratory",
    bg: "radial-gradient(circle at 65% 45%, #40245F, #050509 70%)",
    text: "#F4F0FF",
  },
  {
    id: "9",
    name: "Living Stack",
    tagline: "Tactile, one-book-at-a-time discovery",
    description: "A draggable stack that makes browsing feel physical. Pull the top volume away or use accessible controls to reveal the next recommendation without losing the book details.",
    palette: ["#FF6847", "#15110F", "#B8F4DC", "#FFFFFF"],
    font: "Arial Black + Arial",
    vibe: "Tactile · Bold · Serendipitous",
    bg: "linear-gradient(135deg, #FF6847, #B8F4DC)",
    text: "#15110F",
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
              Nine visual systems, including five immersive animation studies.
              The new concepts read your real collection but do not write to it.
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
