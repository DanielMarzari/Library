"use client";

import Link from "next/link";
import { BentoShell, bento, display } from "../theme";
import { useBooks } from "../useLibraryData";
import type { MockBook } from "../../data";

export default function BentoList() {
  const { books } = useBooks();
  const reading = books.filter((b) => b.status === "reading");
  const queued = books.filter((b) => b.status === "not_read");
  const finished = books.filter((b) => b.status === "read").slice(0, 24);

  return (
    <BentoShell current="list">
      <div className="flex items-end justify-between gap-3 mt-2 mb-5">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: bento.inkSoft, ...display }}>
            Reading list
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight" style={display}>
            What&apos;s on the<br className="hidden sm:block" />{" "}
            <span style={{ color: bento.pink }}>nightstand.</span>
          </h1>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-3xl font-bold leading-none" style={display}>
            {reading.length + queued.length}
          </p>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: bento.inkSoft }}>
            in queue
          </p>
        </div>
      </div>

      <Section title="Currently reading" accent={bento.yellow}>
        {reading.map((b) => (
          <ListRow key={b.id} b={b} status="reading" />
        ))}
        {reading.length === 0 && (
          <EmptyHint label="Nothing in progress yet — start one from the shelf." />
        )}
      </Section>

      <Section title="Up next" accent={bento.lilac}>
        {queued.map((b) => (
          <ListRow key={b.id} b={b} status="queued" />
        ))}
        {queued.length === 0 && (
          <EmptyHint label="Queue is empty — add some recs to your reading list." />
        )}
      </Section>

      <div className="mt-7">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={display}>
          <span className="w-2 h-2 rounded-full" style={{ background: bento.green }} />
          Finished
          <span className="text-sm font-normal" style={{ color: bento.inkSoft }}>
            ({books.filter((b) => b.status === "read").length})
          </span>
        </h2>
        <div className="rounded-3xl p-4 sm:p-5" style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
            {finished.map((b) => (
              <Link
                href={`/mockups/1/book?id=${encodeURIComponent(b.id)}`}
                key={b.id}
                className="group block"
              >
                <div className="relative">
                  {b.cover ? (
                    <img
                      src={b.cover}
                      alt={b.title}
                      className="w-full aspect-[2/3] object-cover rounded-lg shadow group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <Tiny b={b} />
                  )}
                  {b.rating === 5 && (
                    <div
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold shadow"
                      style={{ background: bento.yellow }}
                    >
                      ★
                    </div>
                  )}
                </div>
                <p className="text-[10px] font-semibold mt-1.5 line-clamp-1" style={display}>
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

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 first:mt-0">
      <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={display}>
        <span className="w-2 h-2 rounded-full" style={{ background: accent }} />
        {title}
      </h2>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div
      className="rounded-2xl p-4 text-sm italic"
      style={{ background: bento.card, border: `1px dashed ${bento.ink}20`, color: bento.inkSoft }}
    >
      {label}
    </div>
  );
}

function ListRow({ b, status }: { b: MockBook; status: "reading" | "queued" }) {
  return (
    <Link
      href={`/mockups/1/book?id=${encodeURIComponent(b.id)}`}
      className="flex gap-3 p-3 rounded-2xl items-center group"
      style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}
    >
      {b.cover ? (
        <img
          src={b.cover}
          alt={b.title}
          className="w-12 sm:w-14 aspect-[2/3] object-cover rounded-md shadow flex-shrink-0"
        />
      ) : (
        <Tiny b={b} className="w-12 sm:w-14" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm sm:text-base font-bold leading-tight line-clamp-1" style={display}>
          {b.title}
        </p>
        <p className="text-xs sm:text-sm line-clamp-1 mt-0.5" style={{ color: bento.inkSoft }}>
          {b.author}
          {b.pages > 0 && ` · ${b.pages} pp`}
        </p>
        {status === "reading" && b.progress !== undefined && (
          <div className="mt-2">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: bento.ink + "10" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${b.progress}%`,
                  background: `linear-gradient(90deg, ${bento.yellow}, ${bento.pink})`,
                }}
              />
            </div>
            <p className="text-[10px] mt-1 font-semibold" style={{ color: bento.inkSoft }}>
              {b.progress}% read
            </p>
          </div>
        )}
        {status === "queued" && b.topics.length > 0 && (
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
      <span className="text-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: bento.inkSoft }}>
        →
      </span>
    </Link>
  );
}

function Tiny({ b, className }: { b: MockBook; className?: string }) {
  return (
    <div
      className={`${className || "w-full"} aspect-[2/3] rounded-lg shadow flex items-center justify-center p-1 flex-shrink-0`}
      style={{ background: `linear-gradient(135deg, ${bento.lilac}, ${bento.pink})`, color: "#FFF" }}
    >
      <span className="text-[8px] font-bold leading-tight line-clamp-3 text-center" style={display}>
        {b.title}
      </span>
    </div>
  );
}
