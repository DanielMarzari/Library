export const dynamic = "force-static";

import { MOCK_BOOKS } from "../../data";
import { BentoShell, bento, display } from "../theme";

// Mockup 1 — Bento Pop · Book detail (mobile-first)

export default function BentoBookDetail() {
  const b = MOCK_BOOKS.find((x) => x.status === "reading") || MOCK_BOOKS[0];
  const progress = b.progress || 42;
  const pagesIn = Math.round((b.pages * progress) / 100);

  const updates = [
    { date: "Today", note: "Finished part II — the inquisitor chapter still floors me.", pages: 24 },
    { date: "Yesterday", note: "Slow start tonight. Read on the couch with tea.", pages: 12 },
    { date: "May 21", note: "Started part II. Dialogue is intense.", pages: 31 },
    { date: "May 19", note: "Two chapters before bed.", pages: 18 },
  ];

  return (
    <BentoShell current="book">
      {/* Hero band with cover + title */}
      <div
        className="rounded-3xl p-5 sm:p-7 relative overflow-hidden mt-2"
        style={{ background: bento.ink, color: bento.bg }}
      >
        <div
          className="absolute -right-16 -bottom-16 w-72 h-72 rounded-full opacity-30"
          style={{ background: bento.pink, filter: "blur(50px)" }}
        />
        <div
          className="absolute -left-16 -top-16 w-56 h-56 rounded-full opacity-30"
          style={{ background: bento.yellow, filter: "blur(40px)" }}
        />

        <div className="relative flex flex-col sm:flex-row gap-5 sm:gap-7">
          <img
            src={b.cover}
            alt={b.title}
            className="w-32 sm:w-44 aspect-[2/3] object-cover rounded-2xl shadow-2xl mx-auto sm:mx-0"
          />
          <div className="flex-1 min-w-0">
            <p
              className="text-[10px] uppercase tracking-wider opacity-60 mb-2"
              style={display}
            >
              Now reading · since May 19
            </p>
            <h1
              className="text-3xl sm:text-5xl font-bold leading-[1.05]"
              style={display}
            >
              {b.title}
            </h1>
            <p className="text-base sm:text-lg opacity-80 mt-1.5">
              {b.author} · {b.year}
            </p>

            <div className="flex flex-wrap gap-1.5 mt-3">
              {b.topics.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                  style={{ background: "rgba(255,255,255,0.12)" }}
                >
                  {t}
                </span>
              ))}
            </div>

            {/* Progress */}
            <div className="mt-5">
              <div className="flex justify-between text-xs sm:text-sm mb-2">
                <span>Page {pagesIn} of {b.pages}</span>
                <span className="font-bold" style={{ color: bento.yellow }}>
                  {progress}%
                </span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${bento.yellow}, ${bento.pink})`,
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-5">
              <button
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: bento.yellow, color: bento.ink, ...display }}
              >
                Log progress
              </button>
              <button
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.15)", color: "#FFF", ...display }}
              >
                Mark read
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mini-stat strip */}
      <div className="grid grid-cols-3 gap-3 mt-3">
        <Mini color={bento.green} label="Pages today" value="24" inkOnLight />
        <Mini color={bento.lilac} label="Reading days" value="6" inkOnLight />
        <Mini color={bento.yellow} label="ETA" value="2 wks" inkOnLight />
      </div>

      {/* Two-column on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 mt-3">
        {/* Notes / updates */}
        <div
          className="md:col-span-7 rounded-3xl p-5 sm:p-6"
          style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}
        >
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-bold" style={display}>Reading log</h2>
            <button
              className="text-xs font-medium px-3 py-1.5 rounded-full"
              style={{ background: bento.pink, color: "#FFF", ...display }}
            >
              + Add note
            </button>
          </div>

          <ul className="space-y-3">
            {updates.map((u, i) => (
              <li
                key={i}
                className="flex gap-3 p-3 rounded-2xl"
                style={{ background: bento.bg }}
              >
                <div
                  className="w-12 flex-shrink-0 rounded-xl grid place-items-center text-center"
                  style={{
                    background: i === 0 ? bento.pink : bento.ink + "10",
                    color: i === 0 ? "#FFF" : bento.ink,
                  }}
                >
                  <span className="text-lg font-bold leading-none" style={display}>{u.pages}</span>
                  <span className="text-[9px] uppercase opacity-70 mt-0.5">pages</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[10px] uppercase tracking-wider font-semibold"
                    style={{ color: bento.inkSoft, ...display }}
                  >
                    {u.date}
                  </p>
                  <p className="text-sm mt-0.5 leading-snug">{u.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Side info card */}
        <div className="md:col-span-5 space-y-3 sm:space-y-4">
          <div
            className="rounded-3xl p-5"
            style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}
          >
            <p
              className="text-[10px] uppercase tracking-wider font-semibold mb-3"
              style={{ color: bento.inkSoft, ...display }}
            >
              Details
            </p>
            <dl className="space-y-2.5 text-sm">
              <Row label="Pages" value={`${b.pages}`} />
              <Row label="Published" value={String(b.year)} />
              <Row label="Source" value={b.source || "—"} />
              <Row label="Status" value="Reading" pill={bento.yellow} />
              <Row label="Rating" value="not yet" />
            </dl>
          </div>

          <div
            className="rounded-3xl p-5"
            style={{ background: bento.blue, color: "#FFF" }}
          >
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={display}>
              Up next in this series
            </p>
            <div className="flex gap-2.5 items-center">
              <img
                src={MOCK_BOOKS[7].cover}
                alt=""
                className="w-12 aspect-[2/3] object-cover rounded-lg shadow"
              />
              <div>
                <p className="text-sm font-bold leading-tight" style={display}>
                  {MOCK_BOOKS[7].title}
                </p>
                <p className="text-xs opacity-80 mt-0.5">{MOCK_BOOKS[7].author}</p>
              </div>
            </div>
          </div>

          <div
            className="rounded-3xl p-5 flex items-center gap-3"
            style={{ background: bento.green, color: bento.ink }}
          >
            <span className="text-2xl">✨</span>
            <div className="flex-1">
              <p className="text-sm font-bold" style={display}>
                You&apos;re ahead of your goal
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                Reading 1.4 books/month vs target 1.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </BentoShell>
  );
}

function Mini({
  color,
  label,
  value,
  inkOnLight,
}: {
  color: string;
  label: string;
  value: string;
  inkOnLight?: boolean;
}) {
  const text = inkOnLight ? bento.ink : "#FFF";
  return (
    <div
      className="rounded-2xl p-3.5"
      style={{ background: color, color: text }}
    >
      <p className="text-[9px] uppercase tracking-wider font-semibold opacity-90" style={display}>
        {label}
      </p>
      <p className="text-xl sm:text-2xl font-bold mt-1" style={display}>
        {value}
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  pill,
}: {
  label: string;
  value: string;
  pill?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <dt className="text-xs uppercase tracking-wider" style={{ color: bento.inkSoft, ...display }}>
        {label}
      </dt>
      <dd>
        {pill ? (
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-bold"
            style={{ background: pill, color: bento.ink }}
          >
            {value}
          </span>
        ) : (
          <span className="text-sm font-medium">{value}</span>
        )}
      </dd>
    </div>
  );
}
