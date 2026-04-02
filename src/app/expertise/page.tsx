'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Book } from '@/types/book';
import Link from 'next/link';

interface TopicProgress {
  topic: string;
  totalBooks: number;
  readBooks: number;
  tier: TierName;
  progressPercent: number;
  nextTierThreshold: number;
}

type TierName = 'Familiar' | 'Knowledgeable' | 'Expert' | 'Master' | 'Scholar';

interface Tier {
  name: TierName;
  minBooks: number;
  maxBooks: number | null;
  color: string;
  bgColor: string;
  badgeBg: string;
  badgeText: string;
  progressColor: string;
}

const TIERS: Tier[] = [
  {
    name: 'Familiar',
    minBooks: 2,
    maxBooks: 9,
    color: 'zinc',
    bgColor: 'bg-zinc-800',
    badgeBg: 'bg-zinc-700/40',
    badgeText: 'text-zinc-300',
    progressColor: 'bg-zinc-600',
  },
  {
    name: 'Knowledgeable',
    minBooks: 10,
    maxBooks: 19,
    color: 'blue',
    bgColor: 'bg-blue-950',
    badgeBg: 'bg-blue-600/20',
    badgeText: 'text-blue-300',
    progressColor: 'bg-blue-500',
  },
  {
    name: 'Expert',
    minBooks: 20,
    maxBooks: 49,
    color: 'emerald',
    bgColor: 'bg-emerald-950',
    badgeBg: 'bg-emerald-600/20',
    badgeText: 'text-emerald-300',
    progressColor: 'bg-emerald-500',
  },
  {
    name: 'Master',
    minBooks: 50,
    maxBooks: 99,
    color: 'purple',
    bgColor: 'bg-purple-950',
    badgeBg: 'bg-purple-600/20',
    badgeText: 'text-purple-300',
    progressColor: 'bg-purple-500',
  },
  {
    name: 'Scholar',
    minBooks: 100,
    maxBooks: null,
    color: 'amber',
    bgColor: 'bg-amber-950',
    badgeBg: 'bg-amber-600/20',
    badgeText: 'text-amber-300',
    progressColor: 'bg-amber-500',
  },
];

function getTierForBooks(readBooks: number): Tier {
  return TIERS.find((t) => readBooks >= t.minBooks && (t.maxBooks === null || readBooks <= t.maxBooks)) || TIERS[0];
}

function getNextTierThreshold(readBooks: number): number {
  const nextTier = TIERS.find((t) => readBooks < t.minBooks);
  return nextTier ? nextTier.minBooks : 100;
}

type TopicSource = 'user' | 'auto' | 'combined';

export default function SkillsPage() {
  const [topics, setTopics] = useState<TopicProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [topicSource, setTopicSource] = useState<TopicSource>('combined');

  useEffect(() => {
    fetchAndProcessBooks();
  }, [topicSource]);

  const fetchAndProcessBooks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('books').select('*');

      if (error) throw error;

      const books = (data as Book[]) || [];
      const topicMap = new Map<string, { total: number; read: number }>();

      books.forEach((book) => {
        let topicsToProcess: string[] = [];

        if (topicSource === 'user') {
          topicsToProcess = book.topics || [];
        } else if (topicSource === 'auto') {
          topicsToProcess = book.auto_topics || [];
        } else {
          // combined
          const combined = new Set<string>();
          if (book.topics) {
            book.topics.forEach((t) => combined.add(t));
          }
          if (book.auto_topics) {
            book.auto_topics.forEach((t) => combined.add(t));
          }
          topicsToProcess = Array.from(combined);
        }

        topicsToProcess.forEach((topic) => {
          if (!topicMap.has(topic)) {
            topicMap.set(topic, { total: 0, read: 0 });
          }

          const current = topicMap.get(topic)!;
          current.total += 1;

          if (book.status === 'read') {
            current.read += 1;
          }
        });
      });

      const processedTopics: TopicProgress[] = Array.from(topicMap.entries())
        .filter(([, stats]) => stats.total >= 2)
        .map(([topic, stats]) => {
          const tier = getTierForBooks(stats.read);
          const nextTierThreshold = getNextTierThreshold(stats.read);
          const progressPercent = Math.min((stats.read / nextTierThreshold) * 100, 100);

          return {
            topic,
            totalBooks: stats.total,
            readBooks: stats.read,
            tier: tier.name,
            progressPercent,
            nextTierThreshold,
          };
        })
        .sort((a, b) => {
          // Sort by tier (highest first), then by read books (descending)
          const tierOrder = { Scholar: 5, Master: 4, Expert: 3, Knowledgeable: 2, Familiar: 1 };
          const tierDiff = tierOrder[b.tier] - tierOrder[a.tier];
          return tierDiff !== 0 ? tierDiff : b.readBooks - a.readBooks;
        });

      setTopics(processedTopics);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group topics by tier
  const tierOrder = ['Scholar', 'Master', 'Expert', 'Knowledgeable', 'Familiar'] as const;
  const groupedByTier = tierOrder.map((tierName) => ({
    tier: TIERS.find((t) => t.name === tierName)!,
    topics: topics.filter((t) => t.tier === tierName),
  }));

  // Calculate summary stats
  const totalSkills = topics.length;
  const statsByTier = tierOrder.map((tierName) => ({
    tier: tierName,
    count: topics.filter((t) => t.tier === tierName).length,
  }));

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">Skills</h1>
            <p className="text-zinc-400 mt-1">Track your knowledge across topics</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg transition text-sm font-medium"
          >
            ← Back to Library
          </Link>
        </div>
      </div>

      {/* Topic Source Toggle */}
      <div className="bg-zinc-900/50 border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">View topics from:</span>
            <div className="flex gap-2">
              {(['combined', 'user', 'auto'] as const).map((source) => (
                <button
                  key={source}
                  onClick={() => setTopicSource(source)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    topicSource === source
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {source === 'combined'
                    ? 'Combined'
                    : source === 'user'
                      ? 'User Tags'
                      : 'Auto Tags'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-zinc-400 mt-4">Loading your skills...</p>
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-400 text-lg">
              No skills tracked yet. Start reading to build your knowledge!
            </p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="mb-8 bg-zinc-900 rounded-lg border border-zinc-800 p-6">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase mb-4">Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div>
                  <p className="text-2xl font-bold text-zinc-100">{totalSkills}</p>
                  <p className="text-xs text-zinc-500 mt-1">Skills Tracked</p>
                </div>
                {statsByTier.map(({ tier, count }) => (
                  <div key={tier}>
                    <p className="text-2xl font-bold text-zinc-100">{count}</p>
                    <p className="text-xs text-zinc-500 mt-1">{tier}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tier Sections */}
            {groupedByTier.map(({ tier, topics: tierTopics }) => {
              if (tierTopics.length === 0) return null;

              return (
                <section key={tier.name} className="mb-12">
                  <h2 className={`text-2xl font-bold text-${tier.color}-400 mb-6`}>
                    {tier.name}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tierTopics.map((topic) => {
                      const topicTier = getTierForBooks(topic.readBooks);
                      return (
                        <div
                          key={topic.topic}
                          className={`${topicTier.bgColor} rounded-lg p-6 border border-zinc-800 transition hover:border-zinc-700`}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <h3 className="text-lg font-semibold text-zinc-100">
                              {topic.topic}
                            </h3>
                            <span
                              className={`px-3 py-1 ${topicTier.badgeBg} ${topicTier.badgeText} rounded-full text-xs font-bold`}
                            >
                              {topic.tier}
                            </span>
                          </div>

                          <div className="mb-4">
                            <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
                              <div
                                className={`h-full ${topicTier.progressColor} transition-all duration-300`}
                                style={{ width: `${topic.progressPercent}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-baseline justify-between">
                            <p className="text-sm text-zinc-400">
                              <span className="font-semibold text-zinc-100">{topic.readBooks}</span>
                              {topic.tier === 'Scholar'
                                ? ' books read'
                                : ` / ${topic.nextTierThreshold} books`}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {topic.totalBooks} total
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
