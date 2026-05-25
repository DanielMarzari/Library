export const dynamic = "force-static";

import Link from "next/link";
import { MOCK_BOOKS } from "../../data";
import { BentoShell, bento, display } from "../theme";

// Mockup 1 — Bento Pop · Lending

interface Loan {
  book: typeof MOCK_BOOKS[number];
  borrower: string;
  initials: string;
  hue: string;
  lent: string;
  due?: string;
  returned?: string;
  notes?: string;
  daysOut: number;
  overdue?: boolean;
}

const HUES = [bento.pink, bento.green, bento.yellow, bento.lilac, bento.blue, bento.orange];

const ACTIVE: Loan[] = [
  {
    book: MOCK_BOOKS[1],
    borrower: "Sarah Klein",
    initials: "SK",
    hue: bento.pink,
    lent: "Apr 03",
    due: "Jun 03",
    daysOut: 51,
    notes: "Loves Eco. Said she might re-read it.",
  },
  {
    book: MOCK_BOOKS[9],
    borrower: "Marcus T.",
    initials: "MT",
    hue: bento.green,
    lent: "Feb 14",
    due: "Apr 14",
    daysOut: 99,
    overdue: true,
    notes: "Won't stop calling. Send polite reminder.",
  },
  {
    book: MOCK_BOOKS[6],
    borrower: "Lin Park",
    initials: "LP",
    hue: bento.lilac,
    lent: "May 10",
    due: "Jul 10",
    daysOut: 14,
  },
];

const HISTORY: Loan[] = [
  {
    book: MOCK_BOOKS[2],
    borrower: "Sarah Klein",
    initials: "SK",
    hue: bento.pink,
    lent: "Nov 12",
    returned: "Mar 02",
    daysOut: 110,
  },
  {
    book: MOCK_BOOKS[3],
    borrower: "Dan H.",
    initials: "DH",
    hue: bento.blue,
    lent: "Sep 04",
    returned: "Nov 28",
    daysOut: 85,
  },
  {
    book: MOCK_BOOKS[11],
    borrower: "Mia R.",
    initials: "MR",
    hue: bento.yellow,
    lent: "Jul 20",
    returned: "Aug 12",
    daysOut: 23,
  },
];

export default function BentoLending() {
  const overdueCount = ACTIVE.filter((l) => l.overdue).length;

  return (
    <BentoShell current="lending">
      {/* Header */}
      <div className="mt-2 mb-6 flex items-end justify-between gap-3">
        <div>
          <p
            className="text-[10px] uppercase tracking-wider font-semibold"
            style={{ color: bento.inkSoft, ...display }}
          >
            Lending
          </p>
          <h1
            className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight"
            style={display}
          >
            {ACTIVE.length} books are{" "}
            <span style={{ color: bento.orange }}>out.</span>
          </h1>
        </div>
        <button
          className="px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold text-white whitespace-nowrap"
          style={{ background: bento.pink, ...display }}
        >
          + Lend a book
        </button>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Mini color={bento.orange} label="Active" value={ACTIVE.length} inkOnLight />
        <Mini color={bento.pink} label="Overdue" value={overdueCount} />
        <Mini color={bento.green} label="Returned" value={HISTORY.length} sub="all-time" inkOnLight />
      </div>

      {/* Overdue callout */}
      {overdueCount > 0 && (
        <div
          className="rounded-3xl p-4 sm:p-5 mb-5 flex items-center gap-3"
          style={{ background: bento.pink, color: "#FFF" }}
        >
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-bold" style={display}>
              {overdueCount} loan{overdueCount === 1 ? " is" : "s are"} overdue
            </p>
            <p className="text-xs opacity-90 mt-0.5">
              The longest is out 99 days. Time to nudge?
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

      {/* Currently out */}
      <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={display}>
        <span className="w-2 h-2 rounded-full" style={{ background: bento.orange }} />
        Currently out
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        {ACTIVE.map((l, i) => (
          <LoanCard key={i} loan={l} active />
        ))}
      </div>

      {/* History */}
      <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={display}>
        <span className="w-2 h-2 rounded-full" style={{ background: bento.green }} />
        Lending history
      </h2>
      <div
        className="rounded-3xl p-4 sm:p-5"
        style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}
      >
        <div className="space-y-2.5">
          {HISTORY.map((l, i) => (
            <HistoryRow key={i} loan={l} />
          ))}
        </div>
      </div>
    </BentoShell>
  );
}

function LoanCard({ loan, active }: { loan: Loan; active?: boolean }) {
  return (
    <article
      className="rounded-3xl p-4 sm:p-5 flex gap-4"
      style={{
        background: loan.overdue ? `${bento.pink}11` : bento.card,
        border: `1px solid ${loan.overdue ? bento.pink + "44" : bento.ink + "10"}`,
      }}
    >
      <Link href="/mockups/1/book" className="flex-shrink-0">
        <img
          src={loan.book.cover}
          alt={loan.book.title}
          className="w-16 sm:w-20 aspect-[2/3] object-cover rounded-lg shadow"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2 mb-2">
          <div
            className="w-9 h-9 rounded-full grid place-items-center font-bold text-xs flex-shrink-0"
            style={{ background: loan.hue, color: bento.ink, ...display }}
          >
            {loan.initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight" style={display}>
              {loan.borrower}
            </p>
            <p className="text-xs leading-tight line-clamp-1" style={{ color: bento.inkSoft }}>
              {loan.book.title}
            </p>
          </div>
          {loan.overdue && (
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
            <p className="text-[9px] uppercase tracking-wider" style={{ color: bento.inkSoft, ...display }}>
              Lent
            </p>
            <p className="font-semibold" style={display}>{loan.lent}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: bento.inkSoft, ...display }}>
              Due
            </p>
            <p
              className="font-semibold"
              style={{ ...display, color: loan.overdue ? bento.pink : bento.ink }}
            >
              {loan.due}
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: bento.inkSoft, ...display }}>
              Days out
            </p>
            <p
              className="font-semibold"
              style={{ ...display, color: loan.overdue ? bento.pink : bento.ink }}
            >
              {loan.daysOut}
            </p>
          </div>
        </div>

        {loan.notes && (
          <p className="text-xs italic mb-3 leading-snug" style={{ color: bento.inkSoft }}>
            &ldquo;{loan.notes}&rdquo;
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

function HistoryRow({ loan }: { loan: Loan }) {
  return (
    <div
      className="flex gap-3 items-center p-2.5 rounded-2xl"
      style={{ background: bento.bg }}
    >
      <img
        src={loan.book.cover}
        alt=""
        className="w-10 aspect-[2/3] object-cover rounded shadow flex-shrink-0"
      />
      <div
        className="w-8 h-8 rounded-full grid place-items-center font-bold text-[10px] flex-shrink-0"
        style={{ background: loan.hue, color: bento.ink, ...display }}
      >
        {loan.initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-tight line-clamp-1" style={display}>
          {loan.book.title}
        </p>
        <p className="text-[11px] line-clamp-1" style={{ color: bento.inkSoft }}>
          to {loan.borrower}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[10px] uppercase tracking-wider" style={{ color: bento.inkSoft, ...display }}>
          {loan.daysOut} days
        </p>
        <p className="text-xs font-semibold" style={display}>
          {loan.lent} → {loan.returned}
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
      <p className="text-[10px] uppercase tracking-wider font-semibold opacity-90" style={display}>
        {label}
      </p>
      <p className="text-3xl font-bold mt-1" style={display}>
        {value}
      </p>
      {sub && <p className="text-[10px] opacity-80 mt-0.5">{sub}</p>}
    </div>
  );
}
