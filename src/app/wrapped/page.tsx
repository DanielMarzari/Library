'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { Book } from '@/types/book';

export const dynamic = 'force-dynamic';

interface AuthorInfo {
  name: string;
  image_url?: string;
  book_count: number;
}

interface WrappedStats {
  totalBooks: number;
  totalPages: number;
  topTopic: string | null;
  fastestRead: Book | null;
  longestBook: Book | null;
  topRatedBooks: Book[];
  favoriteAuthor: AuthorInfo | null;
  avgDaysPerBook: number;
  booksPerMonth: number;
  previousYearBooks: number;
}

export default function WrappedPage() {
  const [stats, setStats] = useState<WrappedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);

  const currentYear = new Date().getFullYear();
  const reviewYear = currentYear - 1;

  useEffect(() => {
    const fetchWrappedData = async () => {
      try {
        // Fetch all books
        const allBooks = await api.books.list();
        if (!allBooks || allBooks.length === 0) {
          setHasData(false);
          setLoading(false);
          return;
        }

        // Filter books completed in the review year
        const reviewYearBooks = allBooks.filter((book: Book) => {
          if (!book.complete_date) return false;
          const completedYear = new Date(book.complete_date).getFullYear();
          return completedYear === reviewYear && book.status === 'read';
        });

        if (reviewYearBooks.length === 0) {
          setHasData(false);
          setLoading(false);
          return;
        }

        // Calculate stats
        const totalBooks = reviewYearBooks.length;
        const totalPages = reviewYearBooks.reduce((sum, book: Book) => sum + (book.pages || 0), 0);

        // Get previous year count
        const previousYearBooks = allBooks.filter((book: Book) => {
          if (!book.complete_date) return false;
          const completedYear = new Date(book.complete_date).getFullYear();
          return completedYear === reviewYear - 1 && book.status === 'read';
        }).length;

        // Find top topic
        const topicMap: Record<string, number> = {};
        reviewYearBooks.forEach((book: Book) => {
          [...(book.topics || []), ...(book.auto_topics || [])].forEach((topic: string) => {
            topicMap[topic] = (topicMap[topic] || 0) + 1;
          });
        });

        const topTopic = Object.entries(topicMap).length > 0
          ? Object.entries(topicMap).sort(([, a], [, b]) => b - a)[0][0]
          : null;

        // Find fastest read
        let fastestRead: Book | null = null;
        let minDays = Infinity;

        reviewYearBooks.forEach((book: Book) => {
          if (book.start_date && book.complete_date) {
            const start = new Date(book.start_date).getTime();
            const end = new Date(book.complete_date).getTime();
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            if (days > 0 && days < minDays) {
              minDays = days;
              fastestRead = book;
            }
          }
        });

        // Find longest book
        const longestBook = reviewYearBooks.reduce((max: Book, book: Book) =>
          (book.pages || 0) > (max.pages || 0) ? book : max
        );

        // Find top rated books
        const maxRating = Math.max(...reviewYearBooks.map((b: Book) => b.rating || 0));
        const topRatedBooks = reviewYearBooks.filter((b: Book) => b.rating === maxRating).slice(0, 3);

        // Find favorite author
        const authorMap: Record<string, { count: number; image_url?: string }> = {};
        reviewYearBooks.forEach((book: Book) => {
          const author = book.author || 'Unknown';
          authorMap[author] = { count: (authorMap[author]?.count || 0) + 1 };
        });

        let favoriteAuthor: AuthorInfo | null = null;
        if (Object.keys(authorMap).length > 0) {
          const topAuthorName = Object.entries(authorMap).sort(([, a], [, b]) => b.count - a.count)[0][0];
          const topAuthorCount = authorMap[topAuthorName].count;

          // Fetch author image from authors table
          try {
            const authorData = await api.authors.list();
            const author = authorData.find((a: any) => a.name === topAuthorName);
            favoriteAuthor = {
              name: topAuthorName,
              image_url: author?.image_url,
              book_count: topAuthorCount,
            };
          } catch {
            favoriteAuthor = {
              name: topAuthorName,
              book_count: topAuthorCount,
            };
          }
        }

        // Calculate reading pace
        const daysInYear = 365;
        let totalDays = 0;
        let dayCount = 0;

        reviewYearBooks.forEach((book: Book) => {
          if (book.start_date && book.complete_date) {
            const start = new Date(book.start_date).getTime();
            const end = new Date(book.complete_date).getTime();
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            if (days > 0) {
              totalDays += days;
              dayCount++;
            }
          }
        });

        const avgDaysPerBook = dayCount > 0 ? Math.round(totalDays / dayCount) : 0;
        const booksPerMonth = Math.round((totalBooks / 12) * 10) / 10;

        setStats({
          totalBooks,
          totalPages,
          topTopic,
          fastestRead,
          longestBook,
          topRatedBooks,
          favoriteAuthor,
          avgDaysPerBook,
          booksPerMonth,
          previousYearBooks,
        });
      } catch (error) {
        console.error('Error fetching wrapped data:', error);
        setHasData(false);
      } finally {
        setLoading(false);
      }
    };

    fetchWrappedData();
  }, [reviewYear]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-emerald-500 text-6xl font-bold mb-4">📚</div>
          <p className="text-white text-xl">Loading your reading wrapped...</p>
        </div>
      </div>
    );
  }

  if (!hasData || !stats) {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Not quite yet
          </div>
          <p className="text-white text-2xl mb-8">
            Not enough data for {reviewYear} yet. Keep reading!
          </p>
          <Link href="/" className="px-8 py-3 bg-emerald-500 text-zinc-950 font-bold rounded-lg hover:bg-emerald-400 transition-colors">
            Back to Library
          </Link>
        </div>
      </div>
    );
  }

  const getMilestoneEmoji = (count: number): string => {
    if (count >= 52) return '🎯';
    if (count >= 48) return '📘';
    if (count >= 36) return '📗';
    if (count >= 24) return '📕';
    if (count >= 12) return '📄';
    return '📖';
  };

  const getMilestoneText = (count: number): string => {
    if (count >= 52) return '1 book per week';
    if (count >= 48) return '4 books per month';
    if (count >= 36) return '3 books per month';
    if (count >= 24) return '2 books per month';
    if (count >= 12) return '1 book per month';
    return 'Getting started';
  };

  const pagesToFeet = (pages: number): number => Math.round(pages * 0.01 * 10) / 10;
  const pagesAroundFootball = (pages: number): number => Math.round((pages * 0.01 * 10) / (100 * 3) * 10) / 10;

  const slides = [
    // Intro Slide
    {
      id: 'intro',
      gradient: 'from-emerald-600 via-emerald-500 to-teal-500',
      content: (
        <div className="flex flex-col items-center justify-center h-screen w-full px-8 text-center">
          <div className="text-8xl font-black mb-8 text-white drop-shadow-lg">📚</div>
          <h1 className="text-7xl font-black text-white mb-4 drop-shadow-lg">
            Your {reviewYear}
          </h1>
          <p className="text-5xl font-bold text-white drop-shadow-lg">Reading Wrapped</p>
        </div>
      ),
    },
    // Total Books Slide
    {
      id: 'totalBooks',
      gradient: 'from-purple-600 via-purple-500 to-pink-500',
      content: (
        <div className="flex flex-col items-center justify-center h-screen w-full px-8 text-center">
          <p className="text-6xl font-bold text-white mb-4 opacity-80">you read</p>
          <h2 className="text-8xl font-black text-white mb-6 drop-shadow-lg">{stats.totalBooks}</h2>
          <p className="text-5xl font-bold text-white drop-shadow-lg">books</p>
          {stats.previousYearBooks > 0 && (
            <p className="text-2xl text-white mt-12 opacity-90">
              {stats.totalBooks > stats.previousYearBooks
                ? `+${stats.totalBooks - stats.previousYearBooks} more than last year`
                : stats.totalBooks < stats.previousYearBooks
                  ? `${stats.previousYearBooks - stats.totalBooks} fewer than last year`
                  : 'same as last year'}
            </p>
          )}
        </div>
      ),
    },
    // Total Pages Slide
    {
      id: 'totalPages',
      gradient: 'from-blue-600 via-blue-500 to-cyan-500',
      content: (
        <div className="flex flex-col items-center justify-center h-screen w-full px-8 text-center">
          <p className="text-6xl font-bold text-white mb-4 opacity-80">that's</p>
          <h2 className="text-8xl font-black text-white mb-8 drop-shadow-lg">{stats.totalPages.toLocaleString()}</h2>
          <p className="text-4xl font-bold text-white mb-12 drop-shadow-lg">pages</p>
          <div className="text-xl text-white space-y-4 opacity-90">
            <p>📏 Stacked {pagesToFeet(stats.totalPages).toLocaleString()} feet high</p>
            <p>🏈 Around a football field {pagesAroundFootball(stats.totalPages).toLocaleString()} times</p>
          </div>
        </div>
      ),
    },
    // Top Topic Slide
    {
      id: 'topTopic',
      gradient: 'from-amber-600 via-amber-500 to-orange-500',
      content: (
        <div className="flex flex-col items-center justify-center h-screen w-full px-8 text-center">
          <p className="text-6xl font-bold text-white mb-4 opacity-80">your top topic was</p>
          <h2 className="text-7xl font-black text-white drop-shadow-lg">{stats.topTopic || 'unknown'}</h2>
        </div>
      ),
    },
    // Fastest Read Slide
    {
      id: 'fastestRead',
      gradient: 'from-rose-600 via-rose-500 to-pink-500',
      content: (
        <div className="flex flex-col items-center justify-center h-screen w-full px-8 text-center">
          <p className="text-6xl font-bold text-white mb-4 opacity-80">fastest read</p>
          <h2 className="text-6xl font-black text-white mb-4 drop-shadow-lg">
            {stats.fastestRead?.title || '—'}
          </h2>
          {stats.fastestRead && (
            <div className="text-2xl text-white opacity-90">
              <p className="font-bold">{stats.fastestRead.author}</p>
              <p className="mt-4">finished in {Math.ceil(
                (new Date(stats.fastestRead.complete_date!).getTime() - new Date(stats.fastestRead.start_date!).getTime()) /
                (1000 * 60 * 60 * 24)
              )} days</p>
            </div>
          )}
        </div>
      ),
    },
    // Longest Book Slide
    {
      id: 'longestBook',
      gradient: 'from-indigo-600 via-indigo-500 to-purple-500',
      content: (
        <div className="flex flex-col items-center justify-center h-screen w-full px-8 text-center">
          <p className="text-6xl font-bold text-white mb-4 opacity-80">longest book</p>
          <h2 className="text-6xl font-black text-white mb-4 drop-shadow-lg">
            {stats.longestBook?.title || '—'}
          </h2>
          {stats.longestBook && (
            <div className="text-2xl text-white opacity-90">
              <p className="font-bold">{stats.longestBook.author}</p>
              <p className="mt-4">{stats.longestBook.pages?.toLocaleString() || '0'} pages</p>
            </div>
          )}
        </div>
      ),
    },
    // Top Rated Slide
    {
      id: 'topRated',
      gradient: 'from-cyan-600 via-cyan-500 to-blue-500',
      content: (
        <div className="flex flex-col items-center justify-center h-screen w-full px-8 text-center">
          <p className="text-6xl font-bold text-white mb-8 opacity-80">highest rated</p>
          <div className="space-y-6">
            {stats.topRatedBooks.map((book, idx) => (
              <div key={idx}>
                <h3 className="text-5xl font-black text-white drop-shadow-lg">{book.title}</h3>
                <p className="text-2xl text-white mt-2 opacity-90">{book.author}</p>
                <p className="text-4xl font-bold mt-2">{'⭐'.repeat(book.rating || 0)}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    // Favorite Author Slide
    {
      id: 'favoriteAuthor',
      gradient: 'from-fuchsia-600 via-fuchsia-500 to-purple-500',
      content: (
        <div className="flex flex-col items-center justify-center h-screen w-full px-8 text-center">
          <p className="text-6xl font-bold text-white mb-8 opacity-80">favorite author</p>
          {stats.favoriteAuthor?.image_url && (
            <img
              src={stats.favoriteAuthor.image_url}
              alt={stats.favoriteAuthor.name}
              className="w-48 h-48 rounded-full mb-8 object-cover border-4 border-white drop-shadow-lg"
            />
          )}
          <h2 className="text-6xl font-black text-white mb-4 drop-shadow-lg">
            {stats.favoriteAuthor?.name || 'Unknown'}
          </h2>
          <p className="text-3xl text-white opacity-90">
            {stats.favoriteAuthor?.book_count || 0} books read
          </p>
        </div>
      ),
    },
    // Reading Pace Slide
    {
      id: 'readingPace',
      gradient: 'from-teal-600 via-teal-500 to-emerald-500',
      content: (
        <div className="flex flex-col items-center justify-center h-screen w-full px-8 text-center">
          <p className="text-6xl font-bold text-white mb-12 opacity-80">your reading pace</p>
          <div className="space-y-12">
            <div>
              <p className="text-6xl font-black text-white drop-shadow-lg">{stats.avgDaysPerBook}</p>
              <p className="text-3xl text-white mt-2 opacity-90">days per book</p>
            </div>
            <div>
              <p className="text-6xl font-black text-white drop-shadow-lg">{stats.booksPerMonth}</p>
              <p className="text-3xl text-white mt-2 opacity-90">books per month</p>
            </div>
          </div>
        </div>
      ),
    },
    // Milestone Slide
    {
      id: 'milestone',
      gradient: 'from-yellow-600 via-yellow-500 to-amber-500',
      content: (
        <div className="flex flex-col items-center justify-center h-screen w-full px-8 text-center">
          <p className="text-5xl font-bold text-white mb-8 opacity-80">milestone unlocked</p>
          <p className="text-9xl font-black mb-8">{getMilestoneEmoji(stats.totalBooks)}</p>
          <p className="text-5xl font-black text-white drop-shadow-lg">{getMilestoneText(stats.totalBooks)}</p>
        </div>
      ),
    },
    // Outro Slide
    {
      id: 'outro',
      gradient: 'from-rose-600 via-pink-500 to-purple-500',
      content: (
        <div className="flex flex-col items-center justify-center h-screen w-full px-8 text-center">
          <h2 className="text-7xl font-black text-white mb-8 drop-shadow-lg">
            Here's to another great year of reading
          </h2>
          <p className="text-5xl font-bold text-white mb-16 drop-shadow-lg">
            {stats.totalBooks} books • {stats.totalPages.toLocaleString()} pages
          </p>
          <p className="text-2xl text-white opacity-90 mb-12">
            Keep turning those pages. Your next favorite book is waiting.
          </p>
          <Link
            href="/"
            className="px-8 py-4 bg-white text-purple-600 font-bold text-xl rounded-full hover:bg-gray-100 transition-colors drop-shadow-lg"
          >
            Back to Library
          </Link>
        </div>
      ),
    },
  ];

  const scrollToSlide = (index: number) => {
    const element = document.getElementById(`slide-${slides[index].id}`);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative bg-zinc-950 overflow-x-hidden">
      <style>{`
        html {
          scroll-behavior: smooth;
          scroll-snap-type: y mandatory;
        }
        body {
          scroll-behavior: smooth;
        }
        .slide-container {
          scroll-snap-align: start;
          scroll-snap-stop: always;
        }
      `}</style>

      {/* Slides */}
      {slides.map((slide, idx) => (
        <div
          key={slide.id}
          id={`slide-${slide.id}`}
          className={`slide-container relative h-screen w-full bg-gradient-to-br ${slide.gradient} overflow-hidden`}
        >
          {slide.content}
        </div>
      ))}

      {/* Navigation Dots */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40 flex gap-3">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => scrollToSlide(idx)}
            className={`w-3 h-3 rounded-full transition-all ${
              idx === activeSlide ? 'bg-white w-8' : 'bg-white bg-opacity-50 hover:bg-opacity-75'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* Scroll Progress */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-white bg-opacity-20 z-50">
        <div
          className="h-full bg-emerald-500 transition-all"
          style={{ width: `${((activeSlide + 1) / slides.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
