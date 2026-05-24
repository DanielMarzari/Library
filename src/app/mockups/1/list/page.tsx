export const dynamic = "force-static";

import Link from "next/link";
import { MOCK_BOOKS } from "../../data";
import { BentoShell, bento, display } from "../theme";

// Mockup 1 — Bento Pop · Reading list (mobile-first)

export default function BentoList() {
  const reading = MOCK_BOOKS.filter((b) => b.status === "reading");
  const queued = MOCK_BOOKS.filter((b) => b.status === "not_read");
  const finished = MOCK_BOOKS.filter((b) => b.status === "read");

  return (
    <BentoShell current="list">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 mt-2 mb-5">
        <div>
          <p
            className="text-[10px] uppercase tracking-wider font-semibold"
            style={{ color: bento.inkSoft, ...display }}
          >
            Reading list
          </p>
          <h1
            className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight"
            style={display}
          >
            What&apos;s on the
            <br className="hidden sm:block" />{" "}
            <span style={{ color: bento.pink }}>nightstand.</span>
          </h1>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p
            className="text-3xl font-bold leading-none"
            style={display}
          >
            {reading.length + queued.length}
          </p>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: bento.inkSoft }}>
            in queue
          </p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-5 overflow-x-auto -mx-4 px-4 pb-1">
        {[
          { label: "All", count: MOCK_BOOKS.length, active: true, color: bento.ink },
          { label: "Reading", count: reading.length, color: bento.yellow },
          { label: "Queued", count: queued.length, color: bento.lilac },
          { label: "Finished", count: finished.length, color: bento.green },
          { label: "Owned", count: 9, color: bento.pink },
        ].map((c) => (
          <button
            key={c.label}
            className="px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5"
            style={{
              background: c.active ? c.color : bento.card,
              color: c.active ? bento.bg : bento.ink,
              border: c.active ? "none" : `1px solid ${bento.ink}10`,
              ...display,
            }}
          >
            {c.label}
            <span
              className="px-1.5 rounded-full text-[10px]"
              style={{
                background: c.active ? "rgba(255,255,255,0.2)" : c.color + "33",
                color: c.active ? bento.bg : bento.ink,
              }}
            >
              {c.count}
            </span>
          </button>
        ))}
      </div>

      {/* Currently reading section */}
      <Section title="Currently reading" accent={bento.yellow}>
        {reading.map((b) => (
          <ListRow key={b.id} b={b} status="reading" />
        ))}
      </Section>

      {/* Up next */}
      <Section title="Up next" accent={bento.lilac}>
        {queued.map((b) => (
          <ListRow key={b.id} b={b} status="queued" />
        ))}
      </Section>

      {/* Finished — compact strip */}
      <div className="mt-7">
        <h2
          className="text-xl font-bold mb-3 flex items-center gap-2"
          style={display}
        >
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: bento.green }}
          />
          Finished
          <span className="text-sm font-normal" style={{ color: bento.inkSoft }}>
            ({finished.length})
          </span>
        </h2>
        <div
          className="rounded-3xl p-4 sm:p-5"
          style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}
        >
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
            {finished.map((b) => (
              <Link
                href="/mockups/1/book"
                key={b.id}
                className="group block"
              >
                <div className="relative">
                  <img
                    src={b.cover}
                    alt={b.title}
                    className="w-full aspect-[2/3] object-cover rounded-lg shadow group-hover:scale-105 transition-transform"
                  />
                  {b.rating === 5 && (
                    <div
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold shadow"
                      style={{ background: bento.yellow }}
                    >
                      ★
                    </div>
                  )}
                </div>
                <p
                  className="text-[10px] font-semibold mt-1.5 line-clamp-1"
                  style={display}
                >
                  {b.title}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </BentoShell>
  );
}

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 first:mt-0">
      <h2
        className="text-xl font-bold mb-3 flex items-center gap-2"
        style={display}
      >
        <span
          className="w-2 h-2 rounded-full inline-block"
          style={{ background: accent }}
        />
        {title}
      </h2>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function ListRow({
  b,
  status,
}: {
  b: (typeof MOCK_BOOKS)[number];
  status: "reading" | "queued";
}) {
  return (
    <Link
      href="/mockups/1/book"
      className="flex gap-3 p-3 rounded-2xl items-center group"
      style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}
    >
      <img
        src={b.cover}
        alt={b.title}
        className="w-12 sm:w-14 aspect-[2/3] object-cover rounded-md shadow flex-shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p
          className="text-sm sm:text-base font-bold leading-tight line-clamp-1"
          style={display}
        >
          {b.title}
        </p>
        <p
          className="text-xs sm:text-sm line-clamp-1 mt-0.5"
          style={{ color: bento.inkSoft }}
        >
          {b.author} · {b.pages} pp
        </p>
        {status === "reading" && b.progress && (
          <div className="mt-2">
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: bento.ink + "10" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${b.progress}%`,
                  background: `linear-gradient(90deg, ${bento.yellow}, ${bento.pink})`,
                }}
              />
            </div>
            <p
              className="text-[10px] mt-1 font-semibold"
              style={{ color: bento.inkSoft }}
            >
              {b.progress}% · about 2 weeks left
            </p>
          </div>
        )}
        {status === "queued" && (
          <div className="flex gap-1.5 mt-1.5">
            {b.topics.slice(0, 2).map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{ background: bento.bg, color: bento.inkSoft }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      <span
        className="text-lg opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: bento.inkSoft }}
      >
        →
      </span>
    </Link>
  );
}
