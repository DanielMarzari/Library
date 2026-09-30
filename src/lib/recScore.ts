/**
 * How much would Dan actually want this book?
 *
 * 1,840 recommendations is not a reading list, it's a haystack — and 1,527 of
 * them come from one source, so "who recommended it" barely discriminates. The
 * score has to come from evidence about THIS reader: what he finished, what he
 * rated, what he put down, and what he said he's trying to learn.
 *
 * Two design rules everything else follows from:
 *
 * 1. Every point is explainable. The score ships with the reasons that produced
 *    it, in words, so a ranking can be argued with. A number nobody can
 *    interrogate is a number nobody should trust — especially one ordering a
 *    shelf you spend money from.
 *
 * 2. Evidence of FINISHING outweighs evidence of owning. He owns 978 books and
 *    has read 247 of them; 101 more he started and set down. Buying a book is a
 *    hope, finishing it is a fact, and abandoning it is also a fact. All three
 *    count, with the right signs.
 *
 * Price is deliberately NOT part of this. What a book is worth to you and what
 * it costs are different questions, and mixing them makes both unreadable —
 * that's what the price filter is for.
 */

export interface ScoreSignal {
  /** Human-readable, shown in the UI. */
  label: string;
  points: number;
}

export interface ScoredRec {
  id: string;
  score: number;
  signals: ScoreSignal[];
}

/** A book as the scorer needs it. */
export interface LibBook {
  id: string;
  title: string;
  author: string | null;
  status: string | null;
  rating: number | null;
  favorite: number | null;
  topics: string[];
}

export interface RecInput {
  id: string;
  title: string;
  author: string | null;
  topic: string | null;
  starred: number | null;
  goalIds: string[];
}

/** Goal sizes, so a goal you've barely stocked can pull harder than a full one. */
export interface GoalInfo {
  id: string;
  name: string;
  bookCount: number;
}

// ---------------------------------------------------------------- normalising

const EDITORIAL = /\b(editor|editors|eds?|translator|trans|compiler|foreword|introduction|general)\b/gi;

/**
 * Authors arrive spelled several ways — "N. T. Wright", "N.T. Wright",
 * "Richard Bauckham Editor". Compare on surname plus first initial, which
 * collapses the punctuation variants without merging different people who
 * happen to share a surname.
 */
export function authorKey(raw: string | null | undefined): string {
  const cleaned = String(raw || '')
    .replace(EDITORIAL, ' ')
    .replace(/[^A-Za-z\s,]/g, ' ')
    .trim();
  if (!cleaned) return '';
  // Multi-author strings: the first name listed is the one that carries.
  const first = cleaned.split(',')[0].trim();
  const parts = first.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const surname = parts[parts.length - 1].toLowerCase();
  const initial = parts.length > 1 ? parts[0][0].toLowerCase() : '';
  return `${surname}|${initial}`;
}

const STOP = new Set([
  'the', 'and', 'for', 'with', 'from', 'its', 'his', 'her', 'their', 'new', 'old',
  'introduction', 'commentary', 'study', 'studies', 'vol', 'volume', 'series',
  'book', 'books', 'edition', 'second', 'third', 'revised',
]);

export function topicKey(raw: string): string {
  return String(raw || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Content words of a title, for topic-ish overlap when tags are missing. */
export function titleTokens(raw: string | null | undefined): Set<string> {
  return new Set(
    String(raw || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOP.has(w))
  );
}

// ------------------------------------------------------------------- affinity

export interface Affinity {
  /** author key -> how this reader has actually treated that author */
  authors: Map<string, { read: number; paused: number; ratingSum: number; ratingN: number; favorite: number; owned: number }>;
  /** topic -> weight, positive from finished/liked books, negative from abandoned ones */
  topics: Map<string, number>;
  /** title tokens of books already owned, to spot near-duplicates */
  ownedTitles: Set<string>;
  /** IDF below this means the token is on >5% of the shelf: a corpus stopword. */
  stopwordIdf: number;
  /**
   * How rare each topic is across the shelf being ranked.
   *
   * Without this the score is dominated by words that describe almost
   * everything here: "bible" appears in 12% of these 1,840 titles and
   * "testament" in 18%. Liking books about the Bible is not a preference in a
   * theology library, it's the room. Rarity is what carries information, so a
   * token's weight is scaled by log(N / documents containing it) — "Ezekiel"
   * counts, "biblical" barely does.
   */
  idf: Map<string, number>;
}

/**
 * Build the reader's profile from the library.
 *
 * Ratings are centred at 3, not 0. A 3/5 is "fine" and should move nothing;
 * without centring, every rated book would look like an endorsement and a 1-star
 * would still add weight.
 */
export function buildAffinity(books: LibBook[], corpus: Array<{ title: string; topic?: string | null }> = []): Affinity {
  const authors: Affinity['authors'] = new Map();
  const topics = new Map<string, number>();
  const ownedTitles = new Set<string>();

  // Document frequency over whatever we're ranking (falling back to the
  // library itself when no corpus is supplied, e.g. in tests).
  const docs = corpus.length ? corpus : books.map(b => ({ title: b.title, topic: null }));
  const df = new Map<string, number>();
  for (const d of docs) {
    const seen = new Set<string>(titleTokens(d.title));
    if (d.topic) seen.add(topicKey(d.topic));
    for (const t of seen) if (t) df.set(t, (df.get(t) || 0) + 1);
  }
  const N = Math.max(docs.length, 1);
  const idf = new Map<string, number>();
  for (const [t, n] of df) idf.set(t, Math.log(N / n));
  const stopwordIdf = Math.log(1 / CORPUS_STOPWORD_DF);

  for (const b of books) {
    const ak = authorKey(b.author);
    if (ak) {
      const a = authors.get(ak) || { read: 0, paused: 0, ratingSum: 0, ratingN: 0, favorite: 0, owned: 0 };
      a.owned++;
      if (b.status === 'read') a.read++;
      if (b.status === 'paused') a.paused++;
      if (b.rating && b.rating > 0) { a.ratingSum += b.rating; a.ratingN++; }
      if (b.favorite) a.favorite++;
      authors.set(ak, a);
    }

    for (const t of b.title ? [b.title] : []) ownedTitles.add(t.toLowerCase().trim());

    // A topic's weight is the sum of what this reader's behaviour says about
    // the books carrying it. Finishing is worth more than owning; abandoning
    // counts against; a rating pushes either way from the neutral 3.
    let w = 0;
    if (b.status === 'read') w += 2;
    else if (b.status === 'paused') w -= 1.5;
    else if (b.status === 'reading') w += 0.5;
    if (b.rating && b.rating > 0) w += (b.rating - 3) * 1.5;
    if (b.favorite) w += 3;
    if (w === 0) continue;

    for (const raw of b.topics) {
      const k = topicKey(raw);
      if (!k) continue;
      topics.set(k, (topics.get(k) || 0) + w);
    }
  }

  return { authors, topics, ownedTitles, idf, stopwordIdf };
}

/**
 * A token this common describes the room, not the book.
 *
 * Anything on more than 5% of the shelf is a stopword *for this corpus* and
 * contributes nothing. In a theology library that silently retires "bible"
 * (12% of titles), "testament" (18%), "biblical", "theology", "christian" and
 * "jesus" — all of which were adding a flat ~15 points to hundreds of books and
 * telling you nothing about which one to buy. Scaling them down wasn't enough:
 * the affinity weights behind them are so large they saturated the cap anyway.
 */
const CORPUS_STOPWORD_DF = 0.05;

/**
 * Rarity multiplier for the tokens that survive, normalised so a middling-rare
 * one scores about 1 and a very rare one roughly doubles.
 */
const rarity = (aff: Affinity, token: string) => {
  const v = aff.idf.get(token);
  if (v === undefined) return 1;            // unseen in the corpus — treat as neutral
  if (v < aff.stopwordIdf) return 0;        // describes the room
  return Math.max(0.3, Math.min(2, v / 4));
};

// --------------------------------------------------------------------- weights
//
// Deliberately coarse and few. Precise-looking weights on signals this sparse
// (10 favourites, 50 books with a reading log) would be false precision, and
// every one of these has to be defensible in a sentence.

const W = {
  STARRED: 30,
  GOAL: 14,
  GOAL_EMPTY_BONUS: 8,     // a goal you set but have barely stocked
  GOAL_EXTRA: 4,           // each additional goal, capped
  GOAL_EXTRA_CAP: 8,
  AUTHOR_LOVED: 22,        // finished and rated 4+
  AUTHOR_READ: 12,         // finished at least one
  AUTHOR_FAVORITE: 10,
  AUTHOR_OWNED: 5,         // owns some, hasn't read them yet
  AUTHOR_ABANDONED: -14,   // started and put down
  AUTHOR_DISLIKED: -18,    // read and rated low
  TOPIC_SCALE: 2.2,        // multiplies normalised topic affinity
  TOPIC_CAP: 18,
  TOPIC_NEGATIVE_CAP: -12,
  MAYBE_OWNED: -25,        // title looks like something already on the shelf
} as const;

/** Squash an unbounded tally into 0..1 so one prolific author can't run away with it. */
const saturate = (x: number, half: number) => x / (x + half);

export function scoreRec(
  rec: RecInput,
  aff: Affinity,
  goals: Map<string, GoalInfo>
): ScoredRec {
  const signals: ScoreSignal[] = [];
  const add = (label: string, points: number) => {
    if (points !== 0) signals.push({ label, points: Math.round(points * 10) / 10 });
  };

  // --- explicit intent -----------------------------------------------------
  if (rec.starred) add('You starred it', W.STARRED);

  if (rec.goalIds.length > 0) {
    const named = rec.goalIds.map(id => goals.get(id)).filter(Boolean) as GoalInfo[];
    if (named.length > 0) {
      const primary = named[0];
      add(`Serves your goal “${primary.name}”`, W.GOAL);
      // A goal with almost nothing in it is where a book does the most good.
      if (primary.bookCount <= 2) {
        add(
          primary.bookCount === 0
            ? 'You have no books for that goal yet'
            : `That goal has only ${primary.bookCount} book${primary.bookCount === 1 ? '' : 's'} so far`,
          W.GOAL_EMPTY_BONUS
        );
      }
      if (named.length > 1) {
        add(`Also serves ${named.length - 1} other goal${named.length > 2 ? 's' : ''}`,
            Math.min((named.length - 1) * W.GOAL_EXTRA, W.GOAL_EXTRA_CAP));
      }
    }
  }

  // --- author, judged by what you did with their books ---------------------
  const ak = authorKey(rec.author);
  const a = ak ? aff.authors.get(ak) : undefined;
  if (a) {
    const avg = a.ratingN > 0 ? a.ratingSum / a.ratingN : null;
    const name = (rec.author || '').split(',')[0].trim();

    // One rating is an opinion about a book; three are an opinion about an
    // author. Weight accordingly — otherwise a single 1-star condemns everything
    // someone ever wrote, which is how C. S. Lewis ended up at the very bottom
    // of this shelf on the strength of one disliked title.
    const conf = 0.55 + 0.45 * Math.min(1, Math.max(0, (a.ratingN - 1) / 2));
    const books = (n: number) => `${n} book${n === 1 ? '' : 's'}`;

    if (avg != null && avg >= 4 && a.read > 0) {
      add(`You read ${books(a.ratingN)} by ${name} and rated them ${avg.toFixed(1)}`, W.AUTHOR_LOVED * conf);
    } else if (avg != null && avg <= 2 && a.read > 0) {
      add(`You read ${books(a.ratingN)} by ${name} and rated them ${avg.toFixed(1)}`, W.AUTHOR_DISLIKED * conf);
    } else if (a.read > 0) {
      add(`You've finished ${a.read} book${a.read === 1 ? '' : 's'} by ${name}`, W.AUTHOR_READ);
    } else if (a.owned > 0 && a.paused === 0) {
      add(`You own ${a.owned} by ${name} but haven't read ${a.owned === 1 ? 'it' : 'them'} yet`, W.AUTHOR_OWNED);
    }

    if (a.favorite > 0) add(`${name} is among your favourites`, W.AUTHOR_FAVORITE);
    // Abandonment is the sharpest negative available and it is not rare:
    // 101 books sit paused. Buying more by the same author is usually a mistake.
    if (a.paused > 0) {
      add(`You set down ${a.paused} book${a.paused === 1 ? '' : 's'} by ${name}`, W.AUTHOR_ABANDONED * Math.min(a.paused, 2) / 2);
    }
  }

  // --- subject matter ------------------------------------------------------
  const recTopics = new Set<string>();
  if (rec.topic) recTopics.add(topicKey(rec.topic));
  for (const t of titleTokens(rec.title)) recTopics.add(t);

  let topicScore = 0;
  const hits: Array<{ t: string; w: number }> = [];
  for (const t of recTopics) {
    const w = aff.topics.get(t);
    if (w) {
      const weighted = w * rarity(aff, t);
      topicScore += weighted;
      hits.push({ t, w: weighted });
    }
  }
  if (hits.length > 0) {
    hits.sort((x, y) => Math.abs(y.w) - Math.abs(x.w));
    const best = hits[0];
    const raw = Math.sign(topicScore) * saturate(Math.abs(topicScore), 12) * W.TOPIC_CAP * (W.TOPIC_SCALE / 2.2);
    const pts = Math.max(W.TOPIC_NEGATIVE_CAP, Math.min(W.TOPIC_CAP, raw));
    if (Math.abs(pts) >= 0.5) {
      add(
        best.w > 0
          ? `Overlaps “${best.t}”, which you've read and liked`
          : `Overlaps “${best.t}”, which you've tended to set down`,
        pts
      );
    }
  }

  // --- do you already have this? -------------------------------------------
  // Exact duplicates were removed long ago; what's left are near-misses, and a
  // recommendation to buy a book off your own shelf is worse than useless.
  const tl = (rec.title || '').toLowerCase().trim();
  if (tl && aff.ownedTitles.has(tl)) add('Looks like one already on your shelf', W.MAYBE_OWNED);

  const score = signals.reduce((n, s) => n + s.points, 0);
  return { id: rec.id, score: Math.round(score * 10) / 10, signals };
}

/** Score the whole shelf. Pure — no I/O, so it's cheap to re-run and easy to test. */
export function scoreAll(
  recs: RecInput[],
  books: LibBook[],
  goals: GoalInfo[]
): ScoredRec[] {
  // IDF comes from the recommendations themselves — the corpus being ranked is
  // the one whose common words fail to discriminate.
  const aff = buildAffinity(books, recs.map(r => ({ title: r.title, topic: r.topic })));
  const goalMap = new Map(goals.map(g => [g.id, g]));
  return recs.map(r => scoreRec(r, aff, goalMap));
}
