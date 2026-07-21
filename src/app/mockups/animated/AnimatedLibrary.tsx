"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  Library,
  Menu,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useBooks } from "../1/useLibraryData";
import type { MockBook } from "../data";
import styles from "./animated.module.css";

type Concept = 5 | 6 | 7 | 8 | 9;

const concepts: Record<Concept, { name: string; marker: string }> = {
  5: { name: "Kinetic Field", marker: "01 / Responsive archive" },
  6: { name: "Orbiting Canon", marker: "02 / Relational library" },
  7: { name: "Reading River", marker: "03 / A library in time" },
  8: { name: "Knowledge Constellation", marker: "04 / Ideas connected" },
  9: { name: "Living Stack", marker: "05 / Tactile discovery" },
};

function cover(book: MockBook) {
  return book.cover || book.cover_url || "";
}

function Cover({ book, className = "" }: { book: MockBook; className?: string }) {
  return cover(book) ? (
    <img className={className} src={cover(book)} alt={`Cover of ${book.title}`} />
  ) : (
    <div className={`${className} ${styles.coverFallback}`} aria-label={`${book.title}, no cover`}>
      <BookOpen aria-hidden="true" />
      <span>{book.title}</span>
    </div>
  );
}

function Topbar({ concept, onSearch }: { concept: Concept; onSearch: () => void }) {
  return (
    <header className={styles.topbar}>
      <Link href="/mockups" className={styles.brand} aria-label="Back to mockups">
        <Library size={19} aria-hidden="true" />
        <span>Daniel&apos;s Library</span>
      </Link>
      <div className={styles.conceptName}>{concepts[concept].name}</div>
      <nav className={styles.topActions} aria-label="Mockup controls">
        <button type="button" onClick={onSearch} aria-label="Search library" title="Search library">
          <Search size={19} />
        </button>
        <Link href="/mockups/1" aria-label="Add a book" title="Add a book">
          <Plus size={19} />
        </Link>
        <Link href="/mockups" aria-label="All mockups" title="All mockups">
          <Menu size={20} />
        </Link>
      </nav>
    </header>
  );
}

function ConceptRail({ active }: { active: Concept }) {
  return (
    <nav className={styles.conceptRail} aria-label="Animated concepts">
      {([5, 6, 7, 8, 9] as Concept[]).map((id) => (
        <Link key={id} href={`/mockups/${id}`} aria-current={id === active ? "page" : undefined}>
          <span>{String(id - 4).padStart(2, "0")}</span>
          <b>{concepts[id].name}</b>
        </Link>
      ))}
    </nav>
  );
}

function SearchOverlay({ books, open, onClose }: { books: MockBook[]; open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const reduced = useReducedMotion();
  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (term ? books.filter((book) => `${book.title} ${book.author} ${book.topics.join(" ")}`.toLowerCase().includes(term)) : books).slice(0, 8);
  }, [books, query]);

  function closeSearch() {
    setQuery("");
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className={styles.searchOverlay} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && closeSearch()}>
          <motion.section initial={reduced ? false : { y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -16, opacity: 0 }} role="dialog" aria-modal="true" aria-label="Search library">
            <div className={styles.searchInput}>
              <Search size={22} aria-hidden="true" />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, author, or idea" />
              <button type="button" onClick={closeSearch} aria-label="Close search"><X size={20} /></button>
            </div>
            <div className={styles.searchResults}>
              {results.map((book) => (
                <Link key={book.id} href={`/mockups/1/book?id=${book.id}`}>
                  <Cover book={book} />
                  <span><b>{book.title}</b><small>{book.author}</small></span>
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function KineticField({ books }: { books: MockBook[] }) {
  const field = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const visible = books.slice(0, 24);

  useEffect(() => {
    if (!field.current || reduced) return;
    const nodes = field.current.querySelectorAll(`.${styles.kineticBook}`);
    const animation = animate(nodes, {
      opacity: [0, 1],
      scale: [0.58, 1],
      rotate: () => `${Math.random() * 12 - 6}deg`,
      delay: stagger(42, { grid: [6, 4], from: "center" }),
      duration: 900,
      ease: "outExpo",
    });
    return () => animation.cancel();
  }, [reduced]);

  function ripple(event: React.PointerEvent<HTMLDivElement>) {
    if (reduced || !field.current) return;
    const rect = field.current.getBoundingClientRect();
    const nodes = Array.from(field.current.querySelectorAll(`.${styles.kineticBook}`));
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const sorted = nodes.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return Math.hypot(ar.left + ar.width / 2 - rect.left - x, ar.top + ar.height / 2 - rect.top - y) - Math.hypot(br.left + br.width / 2 - rect.left - x, br.top + br.height / 2 - rect.top - y);
    });
    animate(sorted, { translateY: [0, -14, 0], scale: [1, 1.04, 1], delay: stagger(14), duration: 520, ease: "inOutQuad" });
  }

  return (
    <main className={styles.kinetic}>
      <div className={styles.kineticCopy}>
        <span>{concepts[5].marker}</span>
        <h1>Your library,<br />alive to the touch.</h1>
        <p>Move through the field. Every cover is a door; every cluster is a new reading path.</p>
        <a href="#field">Enter the archive <ChevronDown size={16} /></a>
      </div>
      <div id="field" ref={field} className={styles.kineticField} onPointerMove={ripple}>
        {visible.map((book, index) => (
          <Link href={`/mockups/1/book?id=${book.id}`} key={book.id} className={styles.kineticBook} style={{ "--i": index } as React.CSSProperties} title={`${book.title} — ${book.author}`}>
            <Cover book={book} />
          </Link>
        ))}
      </div>
      <div className={styles.kineticStat}><b>{books.length}</b><span>volumes in motion</span></div>
    </main>
  );
}

function OrbitingCanon({ books }: { books: MockBook[] }) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const visible = books.slice(0, 10);
  const current = visible[active] || books[0];
  return (
    <main className={styles.orbit}>
      <div className={styles.orbitCopy}>
        <span>{concepts[6].marker}</span>
        <h1>Ideas have gravity.</h1>
        <p>Select a book to redraw the relationships around it.</p>
      </div>
      <div className={styles.orbitScene}>
        <div className={styles.orbitLines} aria-hidden="true"><i /><i /><i /></div>
        <AnimatePresence mode="wait">
          {current && (
            <motion.div key={current.id} className={styles.orbitCore} initial={reduced ? false : { scale: .7, opacity: 0, rotateY: -20 }} animate={{ scale: 1, opacity: 1, rotateY: 0 }} exit={{ scale: .8, opacity: 0 }}>
              <Cover book={current} />
              <div><small>Current gravity</small><h2>{current.title}</h2><p>{current.author}</p></div>
            </motion.div>
          )}
        </AnimatePresence>
        {visible.map((book, index) => {
          const angle = (index / visible.length) * Math.PI * 2;
          return (
            <motion.button key={book.id} type="button" className={styles.orbitNode} style={{ "--x": `${Math.cos(angle) * 41}%`, "--y": `${Math.sin(angle) * 40}%` } as React.CSSProperties} animate={reduced ? undefined : { y: [0, index % 2 ? 7 : -7, 0] }} transition={{ duration: 4 + index * .17, repeat: Infinity, ease: "easeInOut" }} onClick={() => setActive(index)} aria-label={`Focus ${book.title}`} aria-pressed={index === active}>
              <Cover book={book} />
              <span>{book.author.split(" ").at(-1)}</span>
            </motion.button>
          );
        })}
      </div>
      <div className={styles.orbitTopics}>{(current?.topics || []).map((topic) => <span key={topic}>{topic}</span>)}</div>
    </main>
  );
}

function ReadingRiver({ books }: { books: MockBook[] }) {
  const track = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const visible = [...books].sort((a, b) => (b.complete_date || b.start_date || "").localeCompare(a.complete_date || a.start_date || "")).slice(0, 18);

  function move(direction: number) {
    track.current?.scrollBy({ left: direction * Math.min(window.innerWidth * .72, 720), behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <main className={styles.river}>
      <div className={styles.riverHeader}>
        <span>{concepts[7].marker}</span>
        <h1>Every book leaves a wake.</h1>
        <p>Your reading life, moving from first page to lasting memory.</p>
      </div>
      <div className={styles.riverControls}>
        <button onClick={() => move(-1)} aria-label="Earlier books"><ArrowLeft /></button>
        <button onClick={() => move(1)} aria-label="Later books"><ArrowRight /></button>
      </div>
      <div ref={track} className={styles.riverTrack}>
        {visible.map((book, index) => (
          <motion.article key={book.id} className={styles.riverBook} initial={reduced ? false : { opacity: 0, y: index % 2 ? 44 : -44 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .35 }} transition={{ duration: .55 }}>
            <span className={styles.riverYear}>{book.complete_date?.slice(0, 4) || book.start_date?.slice(0, 4) || "Undated"}</span>
            <Link href={`/mockups/1/book?id=${book.id}`}><Cover book={book} /></Link>
            <div><small>{String(index + 1).padStart(2, "0")}</small><h2>{book.title}</h2><p>{book.author}</p><b>{book.status === "reading" ? `${book.progress || 0}% read` : book.rating ? `${book.rating} / 5` : "In the archive"}</b></div>
          </motion.article>
        ))}
      </div>
      <div className={styles.riverLine} aria-hidden="true" />
    </main>
  );
}

function KnowledgeConstellation({ books }: { books: MockBook[] }) {
  const [topic, setTopic] = useState<string | null>(null);
  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    books.forEach((book) => book.topics.forEach((item) => counts.set(item, (counts.get(item) || 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [books]);
  const focused = topic ? books.filter((book) => book.topics.includes(topic)).slice(0, 8) : books.slice(0, 8);
  return (
    <main className={styles.constellation}>
      <div className={styles.starNoise} aria-hidden="true" />
      <div className={styles.constellationCopy}>
        <span>{concepts[8].marker}</span>
        <h1>Find the idea<br />behind the shelf.</h1>
        <p>Topics are not categories here. They are paths between books.</p>
      </div>
      <div className={styles.topicRing}>
        {topics.map(([name, count], index) => {
          const angle = (index / Math.max(topics.length, 1)) * Math.PI * 2 - Math.PI / 2;
          return <button key={name} type="button" style={{ "--x": `${50 + Math.cos(angle) * 43}%`, "--y": `${50 + Math.sin(angle) * 42}%` } as React.CSSProperties} onClick={() => setTopic(topic === name ? null : name)} aria-pressed={topic === name}><span>{name}</span><small>{count}</small></button>;
        })}
        <div className={styles.topicCore}><Sparkles /><span>{topic || "All ideas"}</span><small>{focused.length} nearby books</small></div>
      </div>
      <div className={styles.constellationBooks}>
        <AnimatePresence mode="popLayout">
          {focused.map((book) => <motion.div layout key={book.id} initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .8 }}><Link href={`/mockups/1/book?id=${book.id}`}><Cover book={book} /><span>{book.title}</span></Link></motion.div>)}
        </AnimatePresence>
      </div>
    </main>
  );
}

function LivingStack({ books }: { books: MockBook[] }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const visible = books.slice(0, 12);
  const current = visible[index] || books[0];
  const advance = (amount: number) => setIndex((value) => (value + amount + visible.length) % visible.length);
  return (
    <main className={styles.stack}>
      <div className={styles.stackCopy}>
        <span>{concepts[9].marker}</span>
        <h1>Pull a thread.<br />Find your next book.</h1>
        <p>Drag the top volume away or use the arrows. The shelf keeps offering another direction.</p>
        <div className={styles.stackButtons}><button onClick={() => advance(-1)} aria-label="Previous book"><ArrowLeft /></button><button onClick={() => advance(1)} aria-label="Next book"><ArrowRight /></button></div>
      </div>
      <div className={styles.stackScene}>
        {visible.slice(0, 6).reverse().map((book, reverseIndex) => {
          const actual = (index + (5 - reverseIndex)) % visible.length;
          const shown = visible[actual];
          const depth = 5 - reverseIndex;
          const top = depth === 0;
          return <motion.div key={`${shown.id}-${actual}`} className={styles.stackBook} style={{ zIndex: 20 - depth }} animate={{ x: depth * 15, y: depth * -12, rotate: depth * 2.2 - 4, scale: 1 - depth * .035 }} drag={top && !reduced ? "x" : false} dragConstraints={{ left: 0, right: 0 }} onDragEnd={(_, info) => Math.abs(info.offset.x) > 80 && advance(info.offset.x < 0 ? 1 : -1)} whileDrag={{ rotate: 8, scale: 1.04 }}><Cover book={shown} /></motion.div>;
        })}
        <div className={styles.stackShadow} aria-hidden="true" />
      </div>
      {current && <motion.div key={current.id} className={styles.stackMeta} initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}><small>{String(index + 1).padStart(2, "0")} / {String(visible.length).padStart(2, "0")}</small><h2>{current.title}</h2><p>{current.author}</p><Link href={`/mockups/1/book?id=${current.id}`}>Open book <ArrowRight size={16} /></Link></motion.div>}
    </main>
  );
}

export default function AnimatedLibrary({ concept }: { concept: Concept }) {
  const { books, loading } = useBooks();
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <div className={`${styles.shell} ${styles[`concept${concept}`]}`}>
      <Topbar concept={concept} onSearch={() => setSearchOpen(true)} />
      {loading ? <div className={styles.loading}>Opening the archive…</div> : (
        <>
          {concept === 5 && <KineticField books={books} />}
          {concept === 6 && <OrbitingCanon books={books} />}
          {concept === 7 && <ReadingRiver books={books} />}
          {concept === 8 && <KnowledgeConstellation books={books} />}
          {concept === 9 && <LivingStack books={books} />}
        </>
      )}
      <ConceptRail active={concept} />
      <SearchOverlay books={books} open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
