"use client";

import { BentoShell, bento, display } from "../theme";
import { useBooks, useLending, type LibraryLending } from "../useLibraryData";
import type { MockBook } from "../../data";

const HUES = [bento.pink, bento.green, bento.yellow, bento.lilac, bento.blue, bento.orange];

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysBetween(a: string, b?: string | null): number {
  const start = new Date(a).getTime();
  const end = b ? new Date(b).getTime() : Date.now();
  return Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
}

export default function BentoLending() {
  const { books } = useBooks();
  const { lending, loading } = useLending();
  const byId = new Map(books.map((b) => [b.id, b]));

  const active = lending.filter((l) => !l.returned_date);
  const history = lending.filter((l) => l.returned_date);

  const overdue = active.filter(
    (l) => l.due_date && new Date(l.due_date).getTime() < Date.now()
  );

  return (
    <BentoShell current="lending">
      <div className="mt-2 mb-6 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: bento.inkSoft, ...display }}>
            Lending
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight" style={display}>
            {loading ? (
              "Loading..."
            ) : active.length === 0 ? (
              <>Nobody&apos;s borrowing <span style={{ color: bento.orange }}>right now.</span></>
            ) : (
              <>{active.length} books are <span style={{ color: bento.orange }}>out.</span></>
            )}
          </h1>
        </div>
        <button
          className="px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold text-white whitespace-nowrap"
          style={{ background: bento.pink, ...display }}
        >
          + Lend a book
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Mini color={bento.orange} label="Active" value={active.length} inkOnLight />
        <Mini color={bento.pink} label="Overdue" value={overdue.length} />
        <Mini color={bento.green} label="Returned" value={history.length} sub="all-time" inkOnLight />
      </div>

      {overdue.length > 0 && (
        <div className="rounded-3xl p-4 sm:p-5 mb-5 flex items-center gap-3" style={{ background: bento.pink, color: "#FFF" }}>
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-bold" style={display}>
              {overdue.length} loan{overdue.length === 1 ? " is" : "s are"} overdue
            </p>
          </div>
          <button
            className="px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: "rgba(255,255,255,0.2)", color: "#FFF" }}
          >
            Send reminder
          </button>
        </div>
      )}

      {active.length > 0 && (
        <>
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={display}>
            <span className="w-2 h-2 rounded-full" style={{ background: bento.orange }} />
            Currently out
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
            {active.map((l, i) => (
              <LoanCard key={l.id} l={l} book={byId.get(l.book_id)} hue={HUES[i % HUES.length]} active />
            ))}
          </div>
        </>
      )}

      {history.length > 0 && (
        <>
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={display}>
            <span className="w-2 h-2 rounded-full" style={{ background: bento.green }} />
            Lending history
          </h2>
          <div className="rounded-3xl p-4 sm:p-5" style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}>
            <div className="space-y-2.5">
              {history.map((l, i) => (
                <HistoryRow key={l.id} l={l} book={byId.get(l.book_id)} hue={HUES[i % HUES.length]} />
              ))}
            </div>
          </div>
        </>
      )}

      {active.length === 0 && history.length === 0 && !loading && (
        <div
          className="rounded-3xl p-8 text-center mt-4"
          style={{ background: bento.card, border: `1px dashed ${bento.ink}20`, color: bento.inkSoft }}
        >
          <p className="text-sm italic">
            No lending records yet. Hit &ldquo;Lend a book&rdquo; to add one.
          </p>
        </div>
      )}
    </BentoShell>
  );
}

function LoanCard({
  l,
  book,
  hue,
  active,
}: {
  l: LibraryLending;
  book?: MockBook;
  hue: string;
  active?: boolean;
}) {
  const overdue = !!(l.due_date && new Date(l.due_date).getTime() < Date.now());
  const days = daysBetween(l.lent_date);

  return (
    <article
      className="rounded-3xl p-4 sm:p-5 flex gap-4"
      style={{
        background: overdue ? `${bento.pink}11` : bento.card,
        border: `1px solid ${overdue ? bento.pink + "44" : bento.ink + "10"}`,
      }}
    >
      {book?.cover ? (
        <img
          src={book.cover}
          alt={book.title}
          className="w-16 sm:w-20 aspect-[2/3] object-cover rounded-lg shadow flex-shrink-0"
        />
      ) : (
        <div
          className="w-16 sm:w-20 aspect-[2/3] rounded-lg shadow flex-shrink-0 flex items-center justify-center p-1.5 text-center"
          style={{ background: `linear-gradient(135deg, ${bento.lilac}, ${bento.pink})`, color: "#FFF" }}
        >
          <span className="text-[9px] font-bold" style={display}>
            {book?.title.slice(0, 30) || "Unknown"}
          </span>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2 mb-2">
          <div
            className="w-9 h-9 rounded-full grid place-items-center font-bold text-xs flex-shrink-0"
            style={{ background: hue, color: bento.ink, ...display }}
          >
            {initials(l.borrower_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight" style={display}>
              {l.borrower_name}
            </p>
            <p className="text-xs leading-tight line-clamp-1" style={{ color: bento.inkSoft }}>
              {book?.title || "Unknown book"}
            </p>
          </div>
          {overdue && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: bento.pink, color: "#FFF", ...display }}
            >
              OVERDUE
            </span>
          )}
        </div>

        <div className="flex gap-3 text-xs mb-3">
          <div>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: bento.inkSoft, ...display }}>Lent</p>
            <p className="font-semibold" style={display}>{fmtDate(l.lent_date)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: bento.inkSoft, ...display }}>Due</p>
            <p className="font-semibold" style={{ ...display, color: overdue ? bento.pink : bento.ink }}>
              {fmtDate(l.due_date)}
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: bento.inkSoft, ...display }}>Days out</p>
            <p className="font-semibold" style={{ ...display, color: overdue ? bento.pink : bento.ink }}>
              {days}
            </p>
          </div>
        </div>

        {l.notes && (
          <p className="text-xs italic mb-3 leading-snug" style={{ color: bento.inkSoft }}>
            &ldquo;{l.notes}&rdquo;
          </p>
        )}

        {active && (
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 rounded-full text-xs font-semibold flex-1"
              style={{ background: bento.green, color: bento.ink, ...display }}
            >
              ✓ Returned
            </button>
            <button
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: bento.bg,
                color: bento.inkSoft,
                border: `1px solid ${bento.ink}10`,
                ...display,
              }}
            >
              Edit
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function HistoryRow({
  l,
  book,
  hue,
}: {
  l: LibraryLending;
  book?: MockBook;
  hue: string;
}) {
  const days = l.returned_date ? daysBetween(l.lent_date, l.returned_date) : 0;
  return (
    <div className="flex gap-3 items-center p-2.5 rounded-2xl" style={{ background: bento.bg }}>
      {book?.cover ? (
        <img src={book.cover} alt="" className="w-10 aspect-[2/3] object-cover rounded shadow flex-shrink-0" />
      ) : (
        <div className="w-10 aspect-[2/3] rounded shadow flex-shrink-0" style={{ background: bento.ink + "20" }} />
      )}
      <div
        className="w-8 h-8 rounded-full grid place-items-center font-bold text-[10px] flex-shrink-0"
        style={{ background: hue, color: bento.ink, ...display }}
      >
        {initials(l.borrower_name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-tight line-clamp-1" style={display}>
          {book?.title || "Unknown book"}
        </p>
        <p className="text-[11px] line-clamp-1" style={{ color: bento.inkSoft }}>
          to {l.borrower_name}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[10px] uppercase tracking-wider" style={{ color: bento.inkSoft, ...display }}>
          {days} days
        </p>
        <p className="text-xs font-semibold" style={display}>
          {fmtDate(l.lent_date)} → {fmtDate(l.returned_date)}
        </p>
      </div>
    </div>
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
  value: number;
  sub?: string;
  inkOnLight?: boolean;
}) {
  const text = inkOnLight ? bento.ink : "#FFF";
  return (
    <div className="rounded-3xl p-4" style={{ background: color, color: text }}>
      <p className="text-[10px] uppercase tracking-wider font-semibold opacity-90" style={display}>{label}</p>
      <p className="text-3xl font-bold mt-1" style={display}>{value}</p>
      {sub && <p className="text-[10px] opacity-80 mt-0.5">{sub}</p>}
    </div>
  );
}
