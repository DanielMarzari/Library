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
  progress: number;
}

type TopicSource = 'user' | 'auto' | 'combined';

export default function ExpertisePage() {
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
        .map(([topic, stats]) => ({
          topic,
          totalBooks: stats.total,
          readBooks: stats.read,
          progress: Math.min((stats.read / 20) * 100, 100),
        }))
        .sort((a, b) => b.readBooks - a.readBooks);

      setTopics(processedTopics);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const expertiseAchieved = topics.filter((t) => t.readBooks >= 20);
  const gettingClose = topics.filter((t) => t.readBooks >= 10 && t.readBooks < 20);
  const buildingKnowledge = topics.filter((t) => t.readBooks < 10);

  const TopicCard = ({ topic }: { topic: TopicProgress }) => {
    const isExpert = topic.readBooks >= 20;
    const baseColor =
      topic.readBooks >= 20 ? 'bg-zinc-900' : 'bg-zinc-900 hover:bg-zinc-800';
    const progressColor =
      topic.readBooks >= 20
        ? 'bg-amber-500'
        : topic.readBooks >= 10
          ? 'bg-emerald-500'
          : 'bg-zinc-700';

    return (
      <div className={`${baseColor} rounded-lg p-6 border border-zinc-800 transition`}>
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-100">{topic.topic}</h3>
          {isExpert && (
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-bold">
              EXPERT
            </span>
          )}
        </div>

        <div className="mb-4">
          <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full ${progressColor} transition-all duration-300`}
              style={{ width: `${Math.min(topic.progress, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-baseline justify-between">
          <p className="text-sm text-zinc-400">
            <span className="font-semibold text-zinc-100">{topic.readBooks}</span> / 20 books
            read
          </p>
          <p className="text-xs text-zinc-500">
            {topic.totalBooks} total in collection
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">Becoming an Expert</h1>
            <p className="text-zinc-400 mt-1">
              20 books on any topic makes you an expert
            </p>
          </div>
          <Link
            href="/library"
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
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {source === 'combined'
                    ? 'All Topics'
                    : source === 'user'
                      ? 'Your Tags'
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
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            <p className="text-zinc-400 mt-4">Loading your expertise...</p>
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-400 text-lg">
              No topics found yet. Start reading to build your expertise!
            </p>
          </div>
        ) : (
          <>
            {/* Expertise Achieved */}
            {expertiseAchieved.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-amber-500 mb-6 flex items-center gap-2">
                  🏆 Expertise Achieved
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {expertiseAchieved.map((topic) => (
                    <TopicCard key={topic.topic} topic={topic} />
                  ))}
                </div>
              </section>
            )}

            {/* Getting Close */}
            {gettingClose.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-emerald-500 mb-6 flex items-center gap-2">
                  📈 Getting Close
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gettingClose.map((topic) => (
                    <TopicCard key={topic.topic} topic={topic} />
                  ))}
                </div>
              </section>
            )}

            {/* Building Knowledge */}
            {buildingKnowledge.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-zinc-400 mb-6 flex items-center gap-2">
                  📚 Building Knowledge
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {buildingKnowledge.map((topic) => (
                    <TopicCard key={topic.topic} topic={topic} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
