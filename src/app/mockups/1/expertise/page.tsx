"use client";

import { BentoShell, bento, display } from "../theme";
import { useBooks } from "../useLibraryData";
import type { MockBook } from "../../data";

const COLORS = [bento.pink, bento.yellow, bento.lilac, bento.blue, bento.green, bento.orange, "#FF6B9D", "#4ECDC4"];

interface Skill {
  topic: string;
  books: MockBook[];
  pages: number;
  level: 1 | 2 | 3 | 4 | 5;
  color: string;
}

const LEVEL_LABEL: Record<number, string> = {
  1: "Dabbling",
  2: "Curious",
  3: "Informed",
  4: "Devoted",
  5: "Expert",
};

function levelFor(books: MockBook[], pages: number): Skill["level"] {
  // Simple heuristic: 1 book = 1, 2 = 2, 3+ + pages > 500 = 3, etc.
  if (books.length >= 5 || pages >= 3000) return 5;
  if (books.length >= 4 || pages >= 2000) return 4;
  if (books.length >= 2 || pages >= 1000) return 3;
  if (books.length >= 1) return 2;
  return 1;
}

export default function BentoExpertise() {
  const { books, loading } = useBooks();

  // Build skill list from book topics
  const topicMap = new Map<string, MockBook[]>();
  books.forEach((b) => {
    b.topics.forEach((t) => {
      const list = topicMap.get(t) || [];
      list.push(b);
      topicMap.set(t, list);
    });
  });

  const skills: Skill[] = Array.from(topicMap.entries())
    .map(([topic, bs], i) => {
      const pages = bs.reduce((s, b) => s + (b.pages || 0), 0);
      return {
        topic,
        books: bs,
        pages,
        level: levelFor(bs, pages),
        color: COLORS[i % COLORS.length],
      };
    })
    .sort((a, b) => b.books.length - a.books.length || b.pages - a.pages);

  const top = skills[0];
  const totalPages = skills.reduce((s, x) => s + x.pages, 0);

  return (
    <BentoShell current="expertise">
      <div className="mt-2 mb-6">
        <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: bento.inkSoft, ...display }}>
          Skills
        </p>
        <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight" style={display}>
          {loading ? "Loading..." : skills.length === 0 ? (
            <>No topics yet — <span style={{ color: bento.blue }}>tag some books.</span></>
          ) : (
            <>Your <span style={{ color: bento.blue }}>topic map.</span></>
          )}
        </h1>
        {skills.length > 0 && (
          <p className="text-sm mt-2" style={{ color: bento.inkSoft }}>
            {skills.length} subjects · depth based on books and pages.
          </p>
        )}
      </div>

      {top && (
        <div className="rounded-3xl p-5 sm:p-6 mb-5 relative overflow-hidden" style={{ background: top.color, color: bento.ink }}>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl grid place-items-center text-3xl flex-shrink-0" style={{ background: "rgba(0,0,0,0.1)" }}>
              📚
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-semibold opacity-80" style={display}>
                Your strongest topic
              </p>
              <p className="text-2xl sm:text-3xl font-bold leading-tight mt-0.5" style={display}>
                {top.topic}
              </p>
              <p className="text-sm mt-1 opacity-80">
                {top.books.length} books · {top.pages.toLocaleString()} pages · {LEVEL_LABEL[top.level]}
              </p>
              <div className="flex gap-1 mt-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-2 flex-1 rounded-full"
                    style={{
                      background: i < top.level ? bento.ink : "rgba(0,0,0,0.15)",
                      maxWidth: "32px",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-7">
        <Mini color={bento.green} label="Subjects" value={String(skills.length)} inkOnLight />
        <Mini color={bento.lilac} label="Total pages" value={totalPages.toLocaleString()} inkOnLight />
        <Mini color={bento.pink} label="Strongest" value={String(skills.filter((s) => s.level >= 4).length)} sub="lvl ≥ devoted" />
      </div>

      <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={display}>
        <span className="w-2 h-2 rounded-full" style={{ background: bento.blue }} />
        All topics
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {skills.map((s) => (
          <SkillCard key={s.topic} s={s} />
        ))}
      </div>
    </BentoShell>
  );
}

function SkillCard({ s }: { s: Skill }) {
  return (
    <article className="rounded-3xl p-4 sm:p-5" style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}>
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-11 h-11 rounded-2xl grid place-items-center text-xl flex-shrink-0"
          style={{ background: s.color + "33" }}
        >
          🏷️
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold leading-tight" style={display}>{s.topic}</p>
          <p className="text-xs mt-0.5" style={{ color: bento.inkSoft }}>
            {s.books.length} {s.books.length === 1 ? "book" : "books"} · {s.pages.toLocaleString()} pp
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{ background: i < s.level ? s.color : bento.ink + "10" }}
          />
        ))}
        <span
          className="ml-1.5 text-[10px] font-semibold whitespace-nowrap"
          style={{ ...display, color: s.color }}
        >
          {LEVEL_LABEL[s.level]}
        </span>
      </div>
      {s.books.length > 0 && (
        <div className="flex items-end mt-3">
          {s.books.slice(0, 4).map((b, i) => (
            <img
              key={b.id}
              src={b.cover}
              alt=""
              className="w-8 aspect-[2/3] object-cover rounded shadow-sm"
              style={{
                transform: `rotate(${(i - 1.5) * 3}deg)`,
                marginLeft: i === 0 ? 0 : "-6px",
                zIndex: 4 - i,
              }}
            />
          ))}
          {s.books.length > 4 && (
            <span className="text-[10px] ml-2 font-semibold" style={{ color: bento.inkSoft, ...display }}>
              +{s.books.length - 4}
            </span>
          )}
        </div>
      )}
    </article>
  );
}

function Mini({
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
      <p className="text-[10px] uppercase tracking-wider font-semibold opacity-90" style={display}>{label}</p>
      <p className="text-2xl sm:text-3xl font-bold mt-1" style={display}>{value}</p>
      {sub && <p className="text-[10px] opacity-80 mt-0.5">{sub}</p>}
    </div>
  );
}
