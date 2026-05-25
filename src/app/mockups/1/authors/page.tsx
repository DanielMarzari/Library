"use client";

import { BentoShell, bento, display } from "../theme";
import { useAuthors, useBooks, type LibraryAuthor } from "../useLibraryData";
import type { MockBook } from "../../data";

interface AuthorCard {
  name: string;
  count: number;
  read: number;
  meta?: LibraryAuthor;
  cover: string;
  topics: string[];
  initials: string;
  hue: string;
}

const HUES = [bento.pink, bento.green, bento.yellow, bento.lilac, bento.blue, bento.orange];

function buildAuthors(books: MockBook[], meta: LibraryAuthor[]): AuthorCard[] {
  const metaByName = new Map(meta.map((m) => [m.name, m]));
  const map = new Map<string, AuthorCard>();
  books.forEach((b, i) => {
    // Authors can be comma-separated.
    const names = b.author.split(",").map((n) => n.trim()).filter(Boolean);
    names.forEach((name) => {
      const existing = map.get(name);
      if (existing) {
        existing.count += 1;
        if (b.status === "read") existing.read += 1;
      } else {
        const initials = name
          .split(" ")
          .slice(0, 2)
          .map((w) => w[0])
          .join("")
          .toUpperCase();
        map.set(name, {
          name,
          count: 1,
          read: b.status === "read" ? 1 : 0,
          meta: metaByName.get(name),
          cover: b.cover,
          topics: b.topics,
          initials,
          hue: HUES[i % HUES.length],
        });
      }
    });
  });
  // Primary sort: most READ (the user's actual reading depth).
  // Tie-breaker: most OWNED, so authors with the same read count are ordered
  // by collection size.
  return Array.from(map.values()).sort(
    (a, b) => b.read - a.read || b.count - a.count
  );
}

export default function BentoAuthors() {
  const { books, loading } = useBooks();
  const { authors: meta } = useAuthors();

  const authors = buildAuthors(books, meta);
  const featured = authors[0];
  const nationalities = new Set(
    authors.map((a) => a.meta?.nationality).filter(Boolean)
  );
  const women = authors.filter((a) => a.meta?.gender === "Female").length;
  const ethnicities = new Set(
    authors.map((a) => a.meta?.ethnicity).filter(Boolean)
  );

  return (
    <BentoShell current="authors">
      <div className="mt-2 mb-6">
        <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: bento.inkSoft, ...display }}>
          Authors
        </p>
        <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight" style={display}>
          {loading ? "Loading..." : <>{authors.length} voices on<br className="hidden sm:block" /> your shelf.</>}
        </h1>
      </div>

      {featured && (
        <div
          className="rounded-3xl p-5 sm:p-6 mb-5 relative overflow-hidden"
          style={{ background: bento.ink, color: bento.bg }}
        >
          <div className="absolute -right-12 -bottom-12 w-56 h-56 rounded-full opacity-30" style={{ background: featured.hue, filter: "blur(40px)" }} />
          <div className="relative flex items-center gap-5">
            {featured.meta?.image_url ? (
              <img
                src={featured.meta.image_url}
                alt={featured.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full grid place-items-center text-2xl sm:text-3xl font-bold flex-shrink-0"
                style={{ background: featured.hue, color: bento.ink, ...display }}
              >
                {featured.initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider opacity-60" style={display}>
                Most read author
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold leading-tight mt-1" style={display}>
                {featured.name}
              </h2>
              <p className="text-sm sm:text-base opacity-80 mt-1">
                {featured.meta?.nationality ? `${featured.meta.nationality} · ` : ""}
                {featured.count} books · {featured.read} read
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {authors.map((a) => (
          <AuthorTile key={a.name} a={a} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 mt-6">
        <FootStat color={bento.green} label="Nationalities" value={String(nationalities.size || "—")} inkOnLight />
        <FootStat color={bento.lilac} label="Women" value={String(women)} sub={`of ${authors.length}`} inkOnLight />
        <FootStat color={bento.pink} label="Ethnic. tagged" value={String(ethnicities.size || "—")} />
      </div>
    </BentoShell>
  );
}

function AuthorTile({ a }: { a: AuthorCard }) {
  return (
    <div
      className="rounded-3xl p-4 flex flex-col gap-3"
      style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}
    >
      <div className="flex items-center gap-3">
        {a.meta?.image_url ? (
          <img
            src={a.meta.image_url}
            alt={a.name}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full grid place-items-center font-bold text-sm flex-shrink-0"
            style={{ background: a.hue, color: bento.ink, ...display }}
          >
            {a.initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight line-clamp-2" style={display}>
            {a.name}
          </p>
          {a.meta?.nationality && (
            <p className="text-[10px] mt-0.5" style={{ color: bento.inkSoft }}>
              {a.meta.nationality}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="px-2 py-0.5 rounded-full font-bold" style={{ background: bento.ink, color: bento.bg }}>
          {a.count}
        </span>
        <span style={{ color: bento.inkSoft }}>
          {a.count === 1 ? "book" : "books"} · {a.read} read
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {a.topics.slice(0, 2).map((t) => (
          <span
            key={t}
            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ background: bento.bg, color: bento.inkSoft }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function FootStat({
  color,
  label,
  value,
  sub,
  inkOnLight,
}: {
  color: string;
  label: string;
  value: string;
  sub?: string;
  inkOnLight?: boolean;
}) {
  const text = inkOnLight ? bento.ink : "#FFF";
  return (
    <div className="rounded-3xl p-4" style={{ background: color, color: text }}>
      <p className="text-[9px] uppercase tracking-wider font-semibold opacity-90" style={display}>
        {label}
      </p>
      <p className="text-2xl sm:text-3xl font-bold leading-none mt-1" style={display}>
        {value}
      </p>
      {sub && <p className="text-[10px] mt-1 opacity-80">{sub}</p>}
    </div>
  );
}
