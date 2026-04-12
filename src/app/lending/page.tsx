'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { Book } from '@/types/book';

interface LendingRecord {
  id: string;
  book_id: string;
  borrower_name: string;
  lent_date: string;
  due_date: string | null;
  returned_date: string | null;
  notes: string | null;
  book: Book;
}

interface SummaryStats {
  totalOut: number;
  uniqueBorrowers: number;
  mostBorrowedBook: string | null;
}

export default function LendingPage() {
  const [lendingRecords, setLendingRecords] = useState<LendingRecord[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [stats, setStats] = useState<SummaryStats>({
    totalOut: 0,
    uniqueBorrowers: 0,
    mostBorrowedBook: null,
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [borrowerName, setBorrowerName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all books
      const booksData = await api.books.list();
      setBooks(booksData || []);

      // Fetch lending records
      const lendingData = await api.lending.list();

      // Enrich lending records with book details
      const booksMap = new Map(booksData.map((b) => [b.id, b]));
      const normalized = (lendingData || []).map((r: any) => ({
        ...r,
        book: booksMap.get(r.book_id) || null,
      })) as LendingRecord[];
      setLendingRecords(normalized);

      // Calculate stats
      calculateStats(normalized);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (records: LendingRecord[]) => {
    const activeLoans = records.filter((r) => !r.returned_date);
    const totalOut = activeLoans.length;

    const borrowers = new Set(activeLoans.map((r) => r.borrower_name));
    const uniqueBorrowers = borrowers.size;

    // Find most borrowed book
    const bookCounts: { [key: string]: number } = {};
    records.forEach((r) => {
      const bookTitle = r.book?.title || 'Unknown';
      bookCounts[bookTitle] = (bookCounts[bookTitle] || 0) + 1;
    });

    const mostBorrowed = Object.entries(bookCounts).sort(
      ([, a], [, b]) => b - a
    )[0];
    const mostBorrowedBook = mostBorrowed ? mostBorrowed[0] : null;

    setStats({
      totalOut,
      uniqueBorrowers,
      mostBorrowedBook,
    });
  };

  const handleLendBook = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBook || !borrowerName.trim()) {
      alert('Please select a book and enter borrower name');
      return;
    }

    try {
      setSubmitting(true);

      await api.lending.create({
        book_id: selectedBook.id,
        borrower_name: borrowerName.trim(),
        lent_date: new Date().toISOString().split('T')[0],
        due_date: dueDate || null,
        notes: notes || null,
      });

      // Reset form and close modal
      setSelectedBook(null);
      setBorrowerName('');
      setDueDate('');
      setNotes('');
      setShowModal(false);

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error adding lending record:', error);
      alert('Error adding lending record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkReturned = async (recordId: string) => {
    try {
      await api.lending.update(recordId, {
        returned_date: new Date().toISOString().split('T')[0],
      } as any);

      await fetchData();
    } catch (error) {
      console.error('Error marking as returned:', error);
      alert('Error marking as returned');
    }
  };

  const getStatusColor = (dueDate: string | null, returnedDate: string | null) => {
    if (returnedDate) return 'bg-surface-2 border-border-custom';

    if (!dueDate) return 'bg-emerald-950 border-emerald-500';

    const due = new Date(dueDate);
    const today = new Date();
    const isOverdue = due < today;

    return isOverdue ? 'bg-red-950 border-red-500' : 'bg-emerald-950 border-emerald-500';
  };

  const getDaysOut = (lentDate: string) => {
    const lent = new Date(lentDate);
    const today = new Date();
    const days = Math.floor(
      (today.getTime() - lent.getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  const isOverdue = (dueDate: string | null, returnedDate: string | null) => {
    if (returnedDate) return false;
    if (!dueDate) return false;

    const due = new Date(dueDate);
    const today = new Date();
    return due < today;
  };

  const activeLoans = lendingRecords.filter((r) => !r.returned_date);
  const history = lendingRecords.filter((r) => r.returned_date);

  const filteredBooks = books.filter((book) =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          <p className="mt-4">Loading lending data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Header */}
      <div className="border-b border-border-custom bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="px-4 py-2 bg-surface-2 hover:bg-border-custom rounded-lg text-foreground transition-colors text-sm font-medium"
              >
                Back to Library
              </Link>
              <h1 className="text-3xl font-bold text-emerald-500">Book Lending</h1>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              + Lend a Book
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="border-b border-border-custom bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-2 border border-border-custom rounded-lg p-4">
              <p className="text-muted text-sm">Total Books Out</p>
              <p className="text-3xl font-bold text-emerald-500 mt-1">
                {stats.totalOut}
              </p>
            </div>
            <div className="bg-surface-2 border border-border-custom rounded-lg p-4">
              <p className="text-muted text-sm">Unique Borrowers</p>
              <p className="text-3xl font-bold text-emerald-500 mt-1">
                {stats.uniqueBorrowers}
              </p>
            </div>
            <div className="bg-surface-2 border border-border-custom rounded-lg p-4">
              <p className="text-muted text-sm">Most Borrowed</p>
              <p className="text-lg font-bold text-emerald-500 mt-1 truncate">
                {stats.mostBorrowedBook || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Active Loans */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-emerald-500 mb-6">
            Currently Lent Out ({activeLoans.length})
          </h2>

          {activeLoans.length === 0 ? (
            <div className="bg-surface-2 border border-border-custom rounded-lg p-8 text-center">
              <p className="text-muted">No books currently lent out</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {activeLoans.map((record) => (
                <div
                  key={record.id}
                  className={`border rounded-lg p-6 transition-colors ${getStatusColor(
                    record.due_date,
                    record.returned_date
                  )}`}
                >
                  <div className="flex gap-6">
                    {/* Book Cover */}
                    <div className="flex-shrink-0">
                      {record.book?.cover_url ? (
                        <img
                          src={record.book.cover_url}
                          alt={record.book?.title || 'Book cover'}
                          className="w-20 h-28 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-20 h-24 bg-border-custom rounded-lg flex items-center justify-center">
                          <span className="text-xs text-muted">No cover</span>
                        </div>
                      )}
                    </div>

                    {/* Loan Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold">
                            {record.book?.title || 'Unknown Book'}
                          </h3>
                          <p className="text-sm text-foreground">
                            {record.book?.author || 'Unknown Author'}
                          </p>
                        </div>
                        {isOverdue(record.due_date, record.returned_date) && (
                          <div className="flex items-center gap-1 bg-red-900 text-red-200 px-3 py-1 rounded-full text-sm">
                            <span>!</span>
                            Overdue
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                        <div>
                          <p className="text-muted">Borrower</p>
                          <p className="font-semibold">{record.borrower_name}</p>
                        </div>
                        <div>
                          <p className="text-muted">Lent</p>
                          <p className="font-semibold">
                            {new Date(record.lent_date).toLocaleDateString()} (
                            {getDaysOut(record.lent_date)} days out)
                          </p>
                        </div>
                        {record.due_date && (
                          <div>
                            <p className="text-muted">Due</p>
                            <p
                              className={
                                isOverdue(record.due_date, record.returned_date)
                                  ? 'font-semibold text-red-400'
                                  : 'font-semibold'
                              }
                            >
                              {new Date(record.due_date).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {record.notes && (
                        <div className="mb-4 p-3 bg-black/30 rounded text-sm text-foreground">
                          <p className="text-muted text-xs mb-1">Notes</p>
                          {record.notes}
                        </div>
                      )}

                      <button
                        onClick={() => handleMarkReturned(record.id)}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                      >
                        <span>✓</span>
                        Mark Returned
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Lending History */}
        {history.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-emerald-500 mb-6">
              Lending History ({history.length})
            </h2>

            <div className="grid grid-cols-1 gap-4">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="border border-border-custom bg-surface-2 rounded-lg p-6 hover:border-border-custom transition-colors"
                >
                  <div className="flex gap-6">
                    {/* Book Cover */}
                    <div className="flex-shrink-0">
                      {record.book?.cover_url ? (
                        <img
                          src={record.book.cover_url}
                          alt={record.book?.title || 'Book cover'}
                          className="w-20 h-28 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-20 h-24 bg-border-custom rounded-lg flex items-center justify-center">
                          <span className="text-xs text-muted">No cover</span>
                        </div>
                      )}
                    </div>

                    {/* History Details */}
                    <div className="flex-1">
                      <div>
                        <h3 className="text-lg font-bold">
                          {record.book?.title || 'Unknown Book'}
                        </h3>
                        <p className="text-sm text-muted">
                          {record.book?.author || 'Unknown Author'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                        <div>
                          <p className="text-muted">Borrower</p>
                          <p className="font-semibold">{record.borrower_name}</p>
                        </div>
                        <div>
                          <p className="text-muted">Lent</p>
                          <p className="font-semibold">
                            {new Date(record.lent_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted">Returned</p>
                          <p className="font-semibold">
                            {new Date(record.returned_date!).toLocaleDateString()}
                          </p>
                        </div>
                        {record.due_date && (
                          <div>
                            <p className="text-muted">Due Date</p>
                            <p className="font-semibold">
                              {new Date(record.due_date).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {record.notes && (
                        <div className="mt-3 p-3 bg-border-custom/50 rounded text-sm text-muted">
                          <p className="text-muted text-xs mb-1">Notes</p>
                          {record.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Lend Book Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-border-custom rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Lend a Book</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-surface-2 rounded transition-colors"
              >
                <span className="text-xl leading-none">×</span>
              </button>
            </div>

            <form onSubmit={handleLendBook} className="space-y-4">
              {/* Book Search/Select */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Select Book
                </label>
                <input
                  type="text"
                  placeholder="Search books by title or author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-2 border border-border-custom rounded-lg px-3 py-2 text-white placeholder-muted focus:outline-none focus:border-emerald-500 mb-2"
                />

                {searchQuery && filteredBooks.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border border-border-custom rounded-lg bg-surface-2">
                    {filteredBooks.map((book) => (
                      <button
                        key={book.id}
                        type="button"
                        onClick={() => {
                          setSelectedBook(book);
                          setSearchQuery('');
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-border-custom border-b border-border-custom last:border-b-0 transition-colors"
                      >
                        <p className="font-semibold text-sm">{book.title}</p>
                        <p className="text-xs text-muted">{book.author}</p>
                      </button>
                    ))}
                  </div>
                )}

                {selectedBook && (
                  <div className="mt-2 p-3 bg-emerald-950 border border-emerald-500 rounded-lg">
                    <p className="text-sm font-semibold">{selectedBook.title}</p>
                    <p className="text-xs text-muted">{selectedBook.author}</p>
                  </div>
                )}
              </div>

              {/* Borrower Name */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Borrower Name
                </label>
                <input
                  type="text"
                  value={borrowerName}
                  onChange={(e) => setBorrowerName(e.target.value)}
                  placeholder="Enter borrower's name"
                  className="w-full bg-surface-2 border border-border-custom rounded-lg px-3 py-2 text-white placeholder-muted focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-surface-2 border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes..."
                  rows={3}
                  className="w-full bg-surface-2 border border-border-custom rounded-lg px-3 py-2 text-white placeholder-muted focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-surface-2 hover:bg-border-custom text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedBook || !borrowerName.trim()}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-border-custom disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors font-semibold"
                >
                  {submitting ? 'Lending...' : 'Lend Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
