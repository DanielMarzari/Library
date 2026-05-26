"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { BentoShell, bento, display } from "../theme";
import { useRecommendations, type LibraryRecommendation } from "../useLibraryData";
import { AddRecommendationModal } from "../modals";

// Source classifier (heuristic) — maps free-text "recommended_by" to a chip.
function classify(by?: string): { kind: string; color: string; icon: string } {
  if (!by) return { kind: "Other", color: bento.inkSoft, icon: "📌" };
  const lower = by.toLowerCase();
  if (lower.includes("podcast")) return { kind: "Podcast", color: bento.lilac, icon: "🎙️" };
  if (lower.includes("newsletter") || lower.includes("substack")) return { kind: "Newsletter", color: bento.green, icon: "📨" };
  if (lower.includes("article") || lower.includes(".com")) return { kind: "Article", color: bento.blue, icon: "📰" };
  if (lower.includes("book") || lower.includes("via")) return { kind: "Book", color: bento.orange, icon: "📚" };
  return { kind: "Friend", color: bento.pink, icon: "👤" };
}

function safeCover(url?: string) {
  if (!url) return "";
  return url.startsWith("http://") ? url.replace("http://", "https://") : url;
}

export default function BentoRecommendations() {
  const { recs, loading, refetch } = useRecommendations();
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const addToLibrary = async (r: LibraryRecommendation) => {
    if (busyId) return;
    setBusyId(r.id);
    try {
      const isArticle = r.item_type === "article";
      await api.books.create({
        title: r.title,
        author: r.author || "Unknown Author",
        isbn: !isArticle ? r.isbn || undefined : undefined,
        cover_url: r.cover_url || undefined,
        source: r.recommended_by ? `rec from ${r.recommended_by}` : "recommendation",
        status: "not_read",
        item_type: isArticle ? "article" : "book",
        doi: isArticle ? r.doi || undefined : undefined,
        journal: isArticle ? r.journal || undefined : undefined,
        url: isArticle ? r.url || undefined : undefined,
        publication_year: isArticle && r.year ? r.year : undefined,
      });
      await api.recommendations.delete(r.id);
      refetch();
    } finally {
      setBusyId(null);
    }
  };

  const dismissRec = async (r: LibraryRecommendation) => {
    if (!confirm(`Dismiss "${r.title}"?`)) return;
    setBusyId(r.id);
    try {
      await api.recommendations.delete(r.id);
      refetch();
    } finally {
      setBusyId(null);
    }
  };

  // Sort by created_at desc
  const sorted = [...recs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const counts = sorted.reduce<Record<string, number>>((m, r) => {
    const k = classify(r.recommended_by).kind;
    m[k] = (m[k] || 0) + 1;
    return m;
  }, {});

  const featured = sorted.slice(0, 2);
  const rest = sorted.slice(2);

  return (
    <BentoShell current="recs">
      <div className="mt-2 mb-6">
        <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: bento.inkSoft, ...display }}>
          Recommendations
        </p>
        <h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight" style={display}>
          {loading ? "Loading..." : sorted.length === 0 ? (
            <>No recs yet —{" "}
              <span style={{ color: bento.lilac }}>add one?</span>
            </>
          ) : (
            <>{sorted.length} books people{" "}
              <span style={{ color: bento.lilac }}>swore by.</span>
            </>
          )}
        </h1>
      </div>

      {sorted.length > 0 && (
        <div className="flex gap-2 mb-5 overflow-x-auto -mx-4 px-4 pb-1">
          <button
            className="px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5"
            style={{ background: bento.ink, color: bento.bg, ...display }}
          >
            All
            <span className="px-1.5 rounded-full text-[10px]" style={{ background: "rgba(255,255,255,0.2)" }}>
              {sorted.length}
            </span>
          </button>
          {Object.entries(counts).map(([k, n]) => {
            const meta = classify(k);
            return (
              <button
                key={k}
                className="px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5"
                style={{ background: bento.card, color: bento.ink, border: `1px solid ${bento.ink}10`, ...display }}
              >
                <span>{meta.icon}</span>
                {k}
                <span
                  className="px-1.5 rounded-full text-[10px]"
                  style={{ background: meta.color + "33", color: bento.ink }}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {featured.length > 0 && (
        <>
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={display}>
            <span className="w-2 h-2 rounded-full" style={{ background: bento.pink }} />
            Latest
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
            {featured.map((r) => (
              <RecCard
              key={r.id}
              r={r}
              featured
              busy={busyId === r.id}
              onAddToLibrary={() => addToLibrary(r)}
              onDismiss={() => dismissRec(r)}
            />
            ))}
          </div>
        </>
      )}

      {rest.length > 0 && (
        <>
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={display}>
            <span className="w-2 h-2 rounded-full" style={{ background: bento.inkSoft }} />
            Earlier
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rest.map((r) => (
              <RecCard
              key={r.id}
              r={r}
              busy={busyId === r.id}
              onAddToLibrary={() => addToLibrary(r)}
              onDismiss={() => dismissRec(r)}
            />
            ))}
          </div>
        </>
      )}

      <div
        className="mt-8 rounded-3xl p-5 flex items-center gap-3"
        style={{ background: bento.bg, border: `2px dashed ${bento.ink}20` }}
      >
        <div className="w-10 h-10 rounded-full grid place-items-center text-xl" style={{ background: bento.card }}>
          ＋
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold" style={display}>Got a new one to add?</p>
          <p className="text-xs" style={{ color: bento.inkSoft }}>
            Paste a title or DOI, or import from your reading log.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 rounded-full text-xs font-semibold text-white"
          style={{ background: bento.pink, ...display }}
        >
          Add rec
        </button>
      </div>

      {showAdd && (
        <AddRecommendationModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => refetch()}
        />
      )}
    </BentoShell>
  );
}

function RecCard({
  r,
  featured,
  busy,
  onAddToLibrary,
  onDismiss,
}: {
  r: LibraryRecommendation;
  featured?: boolean;
  busy?: boolean;
  onAddToLibrary?: () => void;
  onDismiss?: () => void;
}) {
  const meta = classify(r.recommended_by);
  const cover = safeCover(r.cover_url);
  return (
    <article
      className="rounded-3xl p-4 sm:p-5 flex gap-4"
      style={{ background: bento.card, border: `1px solid ${bento.ink}10` }}
    >
      {cover ? (
        <img
          src={cover}
          alt={r.title}
          className="w-16 sm:w-20 aspect-[2/3] object-cover rounded-lg shadow flex-shrink-0"
        />
      ) : (
        <div
          className="w-16 sm:w-20 aspect-[2/3] rounded-lg shadow flex items-center justify-center p-2 text-center"
          style={{ background: `linear-gradient(135deg, ${bento.lilac}, ${bento.pink})`, color: "#FFF" }}
        >
          <span className="text-[10px] font-bold leading-tight" style={display}>
            {r.title.slice(0, 24)}
          </span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-base sm:text-lg font-bold leading-tight" style={display}>{r.title}</p>
          <div className="flex gap-1 flex-shrink-0">
            {r.item_type === "article" && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{ background: bento.blue, color: "#FFF", ...display }}
              >
                📄 Article
              </span>
            )}
            {featured && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{ background: bento.pink, color: "#FFF", ...display }}
              >
                ♥ NEW
              </span>
            )}
          </div>
        </div>
        {r.author && (
          <p className="text-sm" style={{ color: bento.inkSoft }}>{r.author}</p>
        )}
        {r.item_type === "article" && (r.journal || r.year || r.doi) && (
          <p className="text-[11px] mt-1" style={{ color: bento.inkSoft }}>
            {r.journal && <span>{r.journal}</span>}
            {r.journal && r.year && <span> · </span>}
            {r.year && <span>{r.year}</span>}
            {(r.journal || r.year) && r.doi && <span> · </span>}
            {r.doi && <span className="font-mono">{r.doi}</span>}
          </p>
        )}

        {r.recommended_by && (
          <div className="flex items-center gap-1.5 mt-2">
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
              style={{ background: meta.color + "20", color: bento.ink, ...display }}
            >
              <span>{meta.icon}</span>
              {r.recommended_by}
            </span>
            {r.topic && (
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: bento.bg, color: bento.inkSoft }}
              >
                {r.topic}
              </span>
            )}
          </div>
        )}

        {r.notes && (
          <p className="text-xs italic mt-2.5 leading-snug" style={{ color: bento.inkSoft }}>
            &ldquo;{r.notes}&rdquo;
          </p>
        )}

        <div className="flex gap-2 mt-3">
          <button
            onClick={onAddToLibrary}
            disabled={busy}
            className="px-3 py-1.5 rounded-full text-xs font-semibold flex-1 disabled:opacity-50"
            style={{ background: bento.pink, color: "#FFF", ...display }}
          >
            {busy ? "..." : r.item_type === "article" ? "+ Add article" : "+ Add to library"}
          </button>
          <button
            onClick={onDismiss}
            disabled={busy}
            className="px-3 py-1.5 rounded-full text-xs font-semibold disabled:opacity-50"
            style={{
              background: bento.bg,
              color: bento.inkSoft,
              border: `1px solid ${bento.ink}10`,
              ...display,
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </article>
  );
}
