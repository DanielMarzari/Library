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
}

const MOCKUPS: Mockup[] = [
  {
    id: "1",
    name: "Warm Stacks",
    tagline: "Old library, parchment & walnut",
    description:
      "Cream paper background with walnut shelves, burgundy accents, and serif type. Books sit on rendered shelves with subtle wood grain. Designed to feel like a private study.",
    palette: ["#F4EBDC", "#3A2418", "#7B2C2C", "#C9A86A"],
    font: "Cormorant Garamond + Crimson Pro",
    vibe: "Cozy · Scholarly · Tactile",
    bg: "linear-gradient(135deg, #F4EBDC 0%, #E8D9BD 100%)",
    text: "#3A2418",
  },
  {
    id: "2",
    name: "Editorial",
    tagline: "Black, ivory, and oversized serif",
    description:
      "High-contrast magazine layout. Huge Playfair Display titles, narrow columns, generous whitespace, and a single restrained accent. Reads like a hand-set quarterly journal.",
    palette: ["#FAF7F2", "#0A0A0A", "#D74E7D", "#9E9E9E"],
    font: "Playfair Display + Source Serif 4",
    vibe: "Minimal · Typographic · Calm",
    bg: "linear-gradient(135deg, #FAF7F2 0%, #EDE7DC 100%)",
    text: "#0A0A0A",
  },
  {
    id: "3",
    name: "Bento Pop",
    tagline: "Bright tiles, big covers, color-coded",
    description:
      "Bento-grid dashboard with playful color blocks per status. Covers float in mixed-size tiles next to stats and currently-reading widgets. Inter + Space Grotesk for a modern, snappy feel.",
    palette: ["#FFFFFF", "#0B0B16", "#FFD166", "#06D6A0", "#EF476F"],
    font: "Space Grotesk + Inter",
    vibe: "Playful · Colorful · Modern",
    bg: "linear-gradient(135deg, #FFE9B7 0%, #FFB6D8 60%, #B7E4FF 100%)",
    text: "#0B0B16",
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
              Design exploration
            </p>
            <h1 className="text-4xl font-bold text-emerald-500">Mockups</h1>
            <p className="text-muted mt-2 max-w-2xl">
              Three alternative directions for the Library look & feel. Click any tile
              to walk through a full mockup. Mock data only — nothing here writes.
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
            <Link
              key={m.id}
              href={`/mockups/${m.id}`}
              className="group block rounded-2xl overflow-hidden border border-border-custom hover:border-emerald-500/60 transition-colors"
            >
              {/* Preview swatch */}
              <div
                className="aspect-[4/3] flex flex-col items-center justify-center p-6 relative"
                style={{ background: m.bg, color: m.text }}
              >
                <p
                  className="text-[10px] uppercase tracking-[0.25em] mb-2 opacity-70"
                >
                  Mockup {m.id}
                </p>
                <p className="text-3xl font-semibold text-center leading-tight">
                  {m.name}
                </p>
                <p className="text-sm opacity-70 mt-2 text-center">{m.tagline}</p>

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

              {/* Description */}
              <div className="p-5 bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider text-emerald-500 font-semibold">
                    {m.vibe}
                  </span>
                  <span className="text-muted-2 text-sm group-hover:text-foreground transition-colors">
                    View →
                  </span>
                </div>
                <p className="text-sm text-muted leading-relaxed mb-3">
                  {m.description}
                </p>
                <p className="text-xs text-muted-2">
                  <span className="text-muted">Fonts:</span> {m.font}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Note */}
        <div className="mt-12 p-5 rounded-xl bg-surface border border-border-custom">
          <p className="text-sm text-muted">
            <span className="text-foreground font-medium">How to use these:</span>{" "}
            pick a direction (or steal pieces from each), and I&apos;ll port the
            real Library views into the chosen system — palette, type, card design,
            and shelf layout.
          </p>
        </div>
      </div>
    </div>
  );
}
