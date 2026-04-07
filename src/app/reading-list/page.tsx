"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api-client";
import { Book } from "@/types/book";
import Link from "next/link";

interface ReadingListItem {
  id: string;
  book_id: string;
  year: number;
  priority: number;
  added_at: string;
  book: Book;
}

interface LearningGoal {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

interface GoalBook {
  id: string;
  goal_id: string;
  book_id: string;
  priority: number;
  added_at: string;
  book: Book;
}

const COLORS = [
  { name: "emerald", bg: "bg-emerald-500/15", text: "text-emerald-500", bar: "bg-emerald-500", border: "border-emerald-500/30" },
  { name: "blue", bg: "bg-blue-500/15", text: "text-blue-500", bar: "bg-blue-500", border: "border-blue-500/30" },
  { name: "purple", bg: "bg-purple-500/15", text: "text-purple-500", bar: "bg-purple-500", border: "border-purple-500/30" },
  { name: "amber", bg: "bg-amber-500/15", text: "text-amber-500", bar: "bg-amber-500", border: "border-amber-500/30" },
  { name: "rose", bg: "bg-rose-500/15", text: "text-rose-500", bar: "bg-rose-500", border: "border-rose-500/30" },
  { name: "cyan", bg: "bg-cyan-500/15", text: "text-cyan-500", bar: "bg-cyan-500", border: "border-cyan-500/30" },
  { name: "orange", bg: "bg-orange-500/15", text: "text-orange-500", bar: "bg-orange-500", border: "border-orange-500/30" },
];

function getColorClasses(colorName: string) {
  return COLORS.find(c => c.name === colorName) || COLORS[0];
}

// Canonical Bible book order for sorting
const BIBLE_BOOK_ORDER: Record<string, number> = {
  "Genesis": 1, "Exodus": 2, "Leviticus": 3, "Numbers": 4, "Deuteronomy": 5,
  "Joshua": 6, "Judges": 7, "Ruth": 8, "1 Samuel": 9, "2 Samuel": 10,
  "1 Kings": 11, "2 Kings": 12, "1 Chronicles": 13, "2 Chronicles": 14,
  "Ezra": 15, "Nehemiah": 16, "Esther": 17, "Job": 18, "Psalms": 19, "Proverbs": 20,
  "Ecclesiastes": 21, "Song of Songs": 22, "Isaiah": 23, "Jeremiah": 24, "Lamentations": 25,
  "Ezekiel": 26, "Daniel": 27, "Hosea": 28, "Joel": 29, "Amos": 30,
  "Obadiah": 31, "Jonah": 32, "Micah": 33, "Nahum": 34, "Habakkuk": 35,
  "Zephaniah": 36, "Haggai": 37, "Zechariah": 38, "Malachi": 39,
  "Matthew": 40, "Mark": 41, "Luke": 42, "John": 43, "Acts": 44,
  "Romans": 45, "1 Corinthians": 46, "2 Corinthians": 47, "Galatians": 48, "Ephesians": 49,
  "Philippians": 50, "Colossians": 51, "1 Thessalonians": 52, "2 Thessalonians": 53,
  "1 Timothy": 54, "2 Timothy": 55, "Titus": 56, "Philemon": 57, "Hebrews": 58,
  "James": 59, "1 Peter": 60, "2 Peter": 61, "1 John": 62, "2 John": 63, "3 John": 64,
  "Jude": 65, "Revelation": 66,
};

export default function ReadingListPage() {
  // Shared state
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"years" | "goals">("goals");

  // Year-based reading list state
  const [items, setItems] = useState<ReadingListItem[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Learning goals state
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [goalBooks, setGoalBooks] = useState<Record<string, GoalBook[]>>({});
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalDesc, setNewGoalDesc] = useState("");
  const [newGoalColor, setNewGoalColor] = useState("emerald");
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [goalSearchQuery, setGoalSearchQuery] = useState("");
  const [addingToGoal, setAddingToGoal] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const currentYear = new Date().getFullYear();

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [booksData, itemsData, goalsData, goalBooksData] = await Promise.all([
          api.books.list(),
          api.readingList.list(selectedYear),
          api.learningGoals.list(),
          api.learningGoalBooks.list(),
        ]);

        setBooks(booksData);

        // Enrich reading list items
        if (itemsData && itemsData.length > 0) {
          const enriched = itemsData
            .filter(item => item.year === selectedYear)
            .map(item => ({
              ...item,
              book: booksData.find(b => b.id === item.book_id) || null,
            }))
            .filter(item => item.book);
          setItems(enriched);
        } else {
          setItems([]);
        }

        // Set goals
        if (goalsData && goalsData.length > 0) {
          setGoals(goalsData as LearningGoal[]);
          // Auto-expand first goal
          if (!expandedGoal) {
            setExpandedGoal(goalsData[0].id);
          }
        } else {
          setGoals([]);
        }

        // Enrich goal books
        if (goalBooksData && goalBooksData.length > 0) {
          const grouped: Record<string, GoalBook[]> = {};
          goalBooksData.forEach(gb => {
            const book = booksData.find(b => b.id === gb.book_id);
            if (book) {
              if (!grouped[gb.goal_id]) grouped[gb.goal_id] = [];
              grouped[gb.goal_id].push({ ...gb, book });
            }
          });
          setGoalBooks(grouped);
        } else {
          setGoalBooks({});
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };

    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  // ===== YEAR-BASED FUNCTIONS =====

  const currentYearItems = items.filter(i => i.year === selectedYear);
  const completedCount = currentYearItems.filter(i => i.book?.status === "read").length;
  const totalCount = currentYearItems.length;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const allYears = useMemo(() => {
    const years = new Set([currentYear]);
    items.forEach(i => years.add(i.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [items, currentYear]);

  const availableBooks = useMemo(() => {
    const onListIds = new Set(items.map(i => i.book_id));
    return books.filter(b => !onListIds.has(b.id) && (b.status === "not_read" || b.status === "reading"))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [items, books]);

  const filteredAvailable = useMemo(() => {
    if (!searchQuery.trim()) return availableBooks;
    const q = searchQuery.toLowerCase();
    return availableBooks.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
  }, [availableBooks, searchQuery]);

  const addBookToList = async (bookId: string) => {
    try {
      const maxPriority = currentYearItems.reduce((max, item) => Math.max(max, item.priority || 0), -1);
      const data = await api.readingList.create({
        book_id: bookId,
        year: selectedYear,
      });
      const book = books.find(b => b.id === bookId);
      if (book) {
        setItems([...items, { id: data.id, book_id: bookId, year: selectedYear, priority: maxPriority + 1, added_at: new Date().toISOString(), book }]);
      }
      setShowAddDropdown(false);
      setSearchQuery("");
    } catch (error) {
      console.error("Error adding book to list:", error);
    }
  };

  const removeBookFromList = async (itemId: string) => {
    try {
      await api.readingList.delete(itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
    } catch (error) {
      console.error("Error removing book from list:", error);
    }
  };

  const movePriority = async (itemId: string, direction: "up" | "down") => {
    try {
      const itemIndex = currentYearItems.findIndex(i => i.id === itemId);
      if (itemIndex === -1) return;
      if (direction === "up" && itemIndex === 0) return;
      if (direction === "down" && itemIndex === currentYearItems.length - 1) return;
      const currentItem = currentYearItems[itemIndex];
      const otherItem = currentYearItems[direction === "up" ? itemIndex - 1 : itemIndex + 1];
      await Promise.all([
        api.readingList.update(itemId, { book_id: itemId, year: selectedYear }),
        api.readingList.update(otherItem.id, { book_id: otherItem.book_id, year: selectedYear }),
      ]);
      setItems(prev => prev.map(i => {
        if (i.id === itemId) return { ...i, priority: otherItem.priority };
        if (i.id === otherItem.id) return { ...i, priority: currentItem.priority };
        return i;
      }));
    } catch (error) {
      console.error("Error moving priority:", error);
    }
  };

  // ===== LEARNING GOALS FUNCTIONS =====

  const createGoal = async () => {
    if (!newGoalName.trim()) return;
    try {
      const data = await api.learningGoals.create({
        name: newGoalName.trim(),
        description: newGoalDesc.trim() || null,
      });
      setGoals(prev => [...prev, data as LearningGoal]);
      setNewGoalName("");
      setNewGoalDesc("");
      setShowNewGoal(false);
      setExpandedGoal(data.id);
    } catch (error) {
      console.error("Error creating goal:", error);
    }
  };

  const updateGoal = async (goalId: string) => {
    try {
      await api.learningGoals.update(goalId, {
        name: editName.trim(),
        description: editDesc.trim() || null,
      });
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, name: editName.trim(), description: editDesc.trim() || null } : g));
      setEditingGoal(null);
    } catch (error) {
      console.error("Error updating goal:", error);
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      await api.learningGoals.delete(goalId);
      setGoals(prev => prev.filter(g => g.id !== goalId));
      const newGoalBooks = { ...goalBooks };
      delete newGoalBooks[goalId];
      setGoalBooks(newGoalBooks);
    } catch (error) {
      console.error("Error deleting goal:", error);
    }
  };

  const addBookToGoal = async (goalId: string, bookId: string) => {
    try {
      const data = await api.learningGoalBooks.create({
        goal_id: goalId,
        book_id: bookId,
      });
      const book = books.find(b => b.id === bookId);
      if (book) {
        setGoalBooks(prev => ({
          ...prev,
          [goalId]: [...(prev[goalId] || []), { ...data, book } as GoalBook],
        }));
      }
      setAddingToGoal(null);
      setGoalSearchQuery("");
    } catch (error) {
      console.error("Error adding book to goal:", error);
    }
  };

  const removeBookFromGoal = async (goalBookId: string, goalId: string) => {
    try {
      await api.learningGoalBooks.delete(goalBookId);
      setGoalBooks(prev => ({
        ...prev,
        [goalId]: (prev[goalId] || []).filter(gb => gb.id !== goalBookId),
      }));
    } catch (error) {
      console.error("Error removing book from goal:", error);
    }
  };

  // Available books for a specific goal (not already in that goal)
  const availableBooksForGoal = useCallback((goalId: string) => {
    const inGoal = new Set((goalBooks[goalId] || []).map(gb => gb.book_id));
    const q = goalSearchQuery.toLowerCase();
    return books
      .filter(b => !inGoal.has(b.id))
      .filter(b => !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [books, goalBooks, goalSearchQuery]);

  const renderGoalCard = (goal: LearningGoal) => {
    const gBooks = goalBooks[goal.id] || [];
    const readCount = gBooks.filter(gb => gb.book.status === "read" || (gb.book.status as string) === "completed").length;
    const readingCount = gBooks.filter(gb => gb.book.status === "reading").length;
    const totalPages = gBooks.reduce((sum, gb) => sum + (gb.book.pages || 0), 0);
    const readPages = gBooks.filter(gb => gb.book.status === "read" || (gb.book.status as string) === "completed").reduce((sum, gb) => sum + (gb.book.pages || 0), 0);
    const pct = gBooks.length > 0 ? Math.round((readCount / gBooks.length) * 100) : 0;
    const isExpanded = expandedGoal === goal.id;
    const cc = getColorClasses(goal.color);

    return (
      <div key={goal.id} className={`bg-surface border ${isExpanded ? cc.border : "border-border-custom"} rounded-xl overflow-hidden transition-colors`}>
        {/* Goal Header */}
        <button
          onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
          className="w-full text-left p-4"
        >
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${cc.bar} flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-sm">{goal.name}</h3>
                <span className="text-[10px] text-muted">
                  {readCount}/{gBooks.length} books
                  {readingCount > 0 && ` · ${readingCount} reading`}
                </span>
              </div>
              {goal.description && (
                <p className="text-xs text-muted mt-0.5 truncate">{goal.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className={`text-lg font-bold ${cc.text}`}>{pct}%</span>
              <svg className={`w-4 h-4 text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-surface-2 rounded-full overflow-hidden">
            <div className={`h-full ${cc.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
          </div>
          {totalPages > 0 && (
            <p className="text-[10px] text-muted mt-1">{readPages.toLocaleString()} / {totalPages.toLocaleString()} pages</p>
          )}
        </button>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-border-custom">
            {/* Book list */}
            {gBooks.length > 0 && (
              <div className="divide-y divide-border-custom">
                {gBooks.map(gb => {
                  const isRead = gb.book.status === "read" || (gb.book.status as string) === "completed";
                  const isReading = gb.book.status === "reading";
                  return (
                    <div key={gb.id} className={`flex items-center gap-3 px-4 py-2.5 group ${isRead ? "opacity-60" : ""}`}>
                      {gb.book.cover_url ? (
                        <img src={gb.book.cover_url} alt="" className="w-8 h-11 object-cover rounded flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-11 bg-surface-2 rounded flex-shrink-0 flex items-center justify-center">
                          <span className="text-[10px] text-muted">📖</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isRead ? "line-through text-muted" : "text-foreground"}`}>{gb.book.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted truncate">{gb.book.author}</span>
                          {gb.book.pages && <span className="text-[10px] text-muted-2">{gb.book.pages}p</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isRead && (
                          <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-500 rounded text-[9px] font-medium">Read</span>
                        )}
                        {isReading && (
                          <span className="px-1.5 py-0.5 bg-blue-500/15 text-blue-500 rounded text-[9px] font-medium">Reading</span>
                        )}
                        {!isRead && !isReading && (
                          <span className="px-1.5 py-0.5 bg-surface-2 text-muted rounded text-[9px] font-medium">To Read</span>
                        )}
                        <button
                          onClick={() => removeBookFromGoal(gb.id, goal.id)}
                          className="p-1 text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add book to goal */}
            <div className="p-3 border-t border-border-custom">
              {addingToGoal === goal.id ? (
                <div>
                  <input
                    type="text"
                    placeholder="Search your library..."
                    value={goalSearchQuery}
                    onChange={(e) => setGoalSearchQuery(e.target.value)}
                    className="w-full bg-surface-2 border border-border-custom rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-1 focus:ring-emerald-600 mb-2"
                    autoFocus
                  />
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-border-custom bg-surface-2">
                    {availableBooksForGoal(goal.id).slice(0, 30).map(book => (
                      <button
                        key={book.id}
                        onClick={() => addBookToGoal(goal.id, book.id)}
                        className="w-full text-left px-3 py-2 hover:bg-border-custom border-b border-border-custom last:border-0 transition-colors"
                      >
                        <p className="text-sm font-medium text-foreground truncate">{book.title}</p>
                        <p className="text-xs text-muted">{book.author}</p>
                      </button>
                    ))}
                    {availableBooksForGoal(goal.id).length === 0 && (
                      <p className="p-3 text-sm text-muted text-center">No matching books</p>
                    )}
                  </div>
                  <button onClick={() => { setAddingToGoal(null); setGoalSearchQuery(""); }} className="mt-2 text-xs text-muted hover:text-foreground">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAddingToGoal(goal.id)}
                    className={`flex-1 text-center py-1.5 rounded-lg text-xs font-medium transition-colors ${cc.bg} ${cc.text} hover:opacity-80`}
                  >
                    + Add Book
                  </button>

                  {/* Edit / Delete */}
                  {editingGoal === goal.id ? (
                    <div className="flex-1 flex gap-1">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 bg-surface-2 border border-border-custom rounded px-2 py-1 text-xs text-foreground"
                      />
                      <button onClick={() => updateGoal(goal.id)} className="px-2 py-1 bg-emerald-600 text-white rounded text-xs">Save</button>
                      <button onClick={() => setEditingGoal(null)} className="px-2 py-1 bg-surface-2 text-muted rounded text-xs">X</button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => { setEditingGoal(goal.id); setEditName(goal.name); setEditDesc(goal.description || ""); }}
                        className="px-2 py-1.5 bg-surface-2 hover:bg-border-custom rounded-lg text-[10px] text-muted hover:text-foreground transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete "${goal.name}" and all its book assignments?`)) deleteGoal(goal.id); }}
                        className="px-2 py-1.5 bg-surface-2 hover:bg-red-500/15 rounded-lg text-[10px] text-muted hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border-custom">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Reading List</h1>
            <Link href="/" className="bg-surface-2 hover:bg-border-custom text-foreground px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
              ← Library
            </Link>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 bg-surface-2 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab("goals")}
              className={`flex-1 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "goals" ? "bg-background text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}
            >
              Learning Goals
            </button>
            <button
              onClick={() => setActiveTab("years")}
              className={`flex-1 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "years" ? "bg-background text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}
            >
              By Year
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-border-custom border-t-emerald-500" />
          </div>
        ) : activeTab === "goals" ? (
          /* ===== LEARNING GOALS TAB ===== */
          <div className="space-y-4">
            {/* New Goal Button / Form */}
            {showNewGoal ? (
              <div className="bg-surface border border-border-custom rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">New Learning Goal</h3>
                <input
                  type="text"
                  placeholder="Goal name (e.g., Joshua, Cognitive Linguistics)"
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                  className="w-full bg-surface-2 border border-border-custom rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newGoalDesc}
                  onChange={(e) => setNewGoalDesc(e.target.value)}
                  className="w-full bg-surface-2 border border-border-custom rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                <div className="flex gap-1.5">
                  {COLORS.map(c => (
                    <button
                      key={c.name}
                      onClick={() => setNewGoalColor(c.name)}
                      className={`w-7 h-7 rounded-full ${c.bar} transition-all ${newGoalColor === c.name ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110" : "opacity-60 hover:opacity-100"}`}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={createGoal} disabled={!newGoalName.trim()} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-border-custom disabled:text-muted text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Create Goal
                  </button>
                  <button onClick={() => setShowNewGoal(false)} className="px-4 py-2 bg-surface-2 hover:bg-border-custom text-foreground rounded-lg text-sm font-medium transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewGoal(true)}
                className="w-full bg-surface border border-dashed border-border-custom rounded-xl p-3 text-sm font-medium text-muted hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                + New Learning Goal
              </button>
            )}

            {/* Goals List */}
            {goals.length === 0 && !showNewGoal && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🎯</p>
                <p className="text-muted text-sm mb-1">No learning goals yet</p>
                <p className="text-muted-2 text-xs">Create goals like &quot;Joshua&quot; or &quot;Cognitive Linguistics&quot; and add your books to track progress</p>
              </div>
            )}

            {/* Custom / Topic Goals */}
            {(() => {
              const customGoals = goals.filter(g => !(g.name in BIBLE_BOOK_ORDER));
              if (customGoals.length === 0) return null;
              return (
                <>
                  <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mt-2">Study Topics</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {customGoals.map(goal => renderGoalCard(goal))}
                  </div>
                </>
              );
            })()}

            {/* Bible Book Goals */}
            {(() => {
              const bibleGoals = goals
                .filter(g => g.name in BIBLE_BOOK_ORDER)
                .sort((a, b) => BIBLE_BOOK_ORDER[a.name] - BIBLE_BOOK_ORDER[b.name]);
              if (bibleGoals.length === 0) return null;

              const otGoals = bibleGoals.filter(g => BIBLE_BOOK_ORDER[g.name] <= 39);
              const ntGoals = bibleGoals.filter(g => BIBLE_BOOK_ORDER[g.name] >= 40);

              return (
                <>
                  {otGoals.length > 0 && (
                    <>
                      <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mt-6">Old Testament</h2>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {otGoals.map(goal => renderGoalCard(goal))}
                      </div>
                    </>
                  )}
                  {ntGoals.length > 0 && (
                    <>
                      <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mt-6">New Testament</h2>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {ntGoals.map(goal => renderGoalCard(goal))}
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        ) : (
          /* ===== BY YEAR TAB ===== */
          <>
            {/* Year selector */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
              {allYears.map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedYear === year ? "bg-emerald-600 text-white" : "bg-surface-2 text-muted hover:text-foreground"
                  }`}
                >
                  {year}{year === currentYear && " (Current)"}
                </button>
              ))}
            </div>

            {/* Progress */}
            <div className="bg-surface border border-border-custom rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs text-muted">Progress</p>
                  <p className="text-lg font-bold text-foreground">{completedCount} of {totalCount}</p>
                </div>
                {totalCount > 0 && (
                  <span className="text-sm font-medium text-emerald-500">{completionPercent}%</span>
                )}
              </div>
              {totalCount > 0 && (
                <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${completionPercent}%` }} />
                </div>
              )}
            </div>

            {/* Add book */}
            <div className="mb-4 relative">
              <button
                onClick={() => setShowAddDropdown(!showAddDropdown)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                + Add Book to {selectedYear}
              </button>
              {showAddDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border-custom rounded-lg shadow-xl z-20">
                  <div className="p-3 border-b border-border-custom">
                    <input
                      type="text"
                      placeholder="Search books..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-surface-2 border border-border-custom rounded px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {filteredAvailable.length === 0 ? (
                      <div className="p-4 text-center text-muted text-sm">No books match your search</div>
                    ) : (
                      filteredAvailable.slice(0, 30).map(book => (
                        <button
                          key={book.id}
                          onClick={() => addBookToList(book.id)}
                          className="w-full px-4 py-2.5 text-left border-b border-border-custom last:border-b-0 hover:bg-surface-2/50 transition-colors"
                        >
                          <p className="font-medium text-foreground text-sm">{book.title}</p>
                          <p className="text-xs text-muted">{book.author}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Books list */}
            {currentYearItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">📚</p>
                <p className="text-muted text-sm">No books on your {selectedYear} reading list</p>
              </div>
            ) : (
              <div className="bg-surface border border-border-custom rounded-xl overflow-hidden divide-y divide-border-custom">
                {currentYearItems.map((item, index) => {
                  const isCompleted = item.book?.status === "read";
                  const isReading = item.book?.status === "reading";
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => setDraggedId(item.id)}
                      onDragEnd={() => setDraggedId(null)}
                      className={`flex items-center gap-3 px-4 py-3 group transition-colors ${draggedId === item.id ? "opacity-50 bg-surface-2" : "hover:bg-surface-2/50"}`}
                    >
                      {item.book?.cover_url && (
                        <img src={item.book.cover_url} alt="" className="w-10 h-14 object-cover rounded flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isCompleted ? "text-muted line-through" : "text-foreground"}`}>{item.book?.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted">{item.book?.author}</span>
                          {item.book?.pages && <span className="text-[10px] text-muted-2">{item.book.pages}p</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isCompleted && <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-500 rounded text-[9px] font-medium">Done</span>}
                        {isReading && <span className="px-1.5 py-0.5 bg-blue-500/15 text-blue-500 rounded text-[9px] font-medium">Reading</span>}
                        {!isCompleted && !isReading && <span className="px-1.5 py-0.5 bg-surface-2 text-muted rounded text-[9px] font-medium">To Read</span>}
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {index > 0 && (
                            <button onClick={() => movePriority(item.id, "up")} className="p-1 hover:bg-surface-2 rounded">
                              <svg className="w-3 h-3 text-muted" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3.5L3.5 8h1.5v3h6v-3h1.5L8 3.5z" /></svg>
                            </button>
                          )}
                          {index < currentYearItems.length - 1 && (
                            <button onClick={() => movePriority(item.id, "down")} className="p-1 hover:bg-surface-2 rounded">
                              <svg className="w-3 h-3 text-muted" viewBox="0 0 16 16" fill="currentColor"><path d="M8 12.5l4.5-4.5h-1.5v-3h-6v3H3.5l4.5 4.5z" /></svg>
                            </button>
                          )}
                          <button onClick={() => removeBookFromList(item.id)} className="p-1 hover:bg-red-500/15 rounded">
                            <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
