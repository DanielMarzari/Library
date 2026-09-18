"use client";

import { useEffect, useMemo, useState } from "react";
import { api, LearningGoal, LearningGoalBook } from "@/lib/api-client";

/**
 * Add/remove a book or recommendation to learning goals, inline.
 *
 * Goal membership was previously write-only from /reading-list: 76 goals and 747
 * memberships existed, but nothing that showed a given book's goals or let you
 * change them where you were already looking at the book. This is that control,
 * shared by BookDetail and the recommendation modal so the two stay consistent.
 *
 * Exactly one of bookId / recId is set — the API enforces the same rule.
 */
export function GoalChips({
  bookId,
  recId,
  className = "",
}: {
  bookId?: string;
  recId?: string;
  className?: string;
}) {
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [memberships, setMemberships] = useState<LearningGoalBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyGoalId, setBusyGoalId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [filter, setFilter] = useState("");

  const load = async () => {
    try {
      const [g, m] = await Promise.all([
        api.learningGoals.list(),
        api.learningGoalBooks.list(),
      ]);
      setGoals(g || []);
      setMemberships(m || []);
    } catch (error) {
      console.error("Error loading goals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [bookId, recId]);

  // Memberships for THIS item only.
  const mine = useMemo(() => {
    return memberships.filter(m =>
      bookId ? (m as any).book_id === bookId : (m as any).rec_id === recId
    );
  }, [memberships, bookId, recId]);

  const myGoalIds = useMemo(() => new Set(mine.map(m => m.goal_id)), [mine]);
  const myGoals = useMemo(
    () => goals.filter(g => myGoalIds.has(g.id)),
    [goals, myGoalIds]
  );

  const available = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return goals
      .filter(g => !myGoalIds.has(g.id))
      .filter(g => !q || g.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [goals, myGoalIds, filter]);

  const addTo = async (goalId: string) => {
    setBusyGoalId(goalId);
    try {
      const payload: any = { goal_id: goalId };
      if (bookId) payload.book_id = bookId; else payload.rec_id = recId;
      const created = await api.learningGoalBooks.create(payload);
      setMemberships(prev => [...prev, created]);
      setFilter("");
      setPicking(false);
    } catch (error) {
      console.error("Error adding to goal:", error);
      alert("Could not add to that goal.");
    } finally {
      setBusyGoalId(null);
    }
  };

  const removeFrom = async (goalId: string) => {
    const membership = mine.find(m => m.goal_id === goalId);
    if (!membership) return;
    setBusyGoalId(goalId);
    try {
      await api.learningGoalBooks.delete(membership.id);
      setMemberships(prev => prev.filter(m => m.id !== membership.id));
    } catch (error) {
      console.error("Error removing from goal:", error);
      alert("Could not remove from that goal.");
    } finally {
      setBusyGoalId(null);
    }
  };

  if (loading) return null;

  return (
    <div className={className}>
      <label className="block text-xs text-muted mb-2">Learning goals</label>
      <div className="flex flex-wrap gap-1.5 items-center">
        {myGoals.map(g => (
          <button
            key={g.id}
            onClick={() => removeFrom(g.id)}
            disabled={busyGoalId === g.id}
            className="group px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300 hover:bg-red-500/20 hover:text-red-300 transition-colors disabled:opacity-50"
            title="Remove from this goal"
          >
            {g.name}
            <span className="ml-1 opacity-0 group-hover:opacity-100">×</span>
          </button>
        ))}

        {picking ? (
          <div className="relative">
            <input
              autoFocus
              value={filter}
              onChange={e => setFilter(e.target.value)}
              onBlur={() => setTimeout(() => setPicking(false), 150)}
              placeholder="Find a goal…"
              className="bg-surface-2 border border-border-custom rounded-full px-3 py-1 text-xs w-40 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
            {available.length > 0 && (
              <div className="absolute z-30 mt-1 left-0 w-56 max-h-52 overflow-y-auto bg-surface border border-border-custom rounded-lg shadow-xl">
                {available.slice(0, 40).map(g => (
                  <button
                    key={g.id}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => addTo(g.id)}
                    disabled={busyGoalId === g.id}
                    className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-surface-2 disabled:opacity-50"
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setPicking(true)}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface-2 text-muted hover:text-foreground transition-colors"
          >
            + Goal
          </button>
        )}
      </div>
    </div>
  );
}
