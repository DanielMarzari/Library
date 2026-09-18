'use client';

import { Book, ReadingUpdate, Density } from '@/types/book';
import type { TierStat } from '@/lib/readingPace';

export interface NextBook {
  id: string; title: string; author: string;
  currentPage: number; totalPages: number; pagesLeft: number;
  percentDone: number; daysSince: number; lastReadAt: string | null;
  pagesPerHour?: number | null; hoursLeft?: number | null;
}
export interface NextPayload {
  hero: NextBook | null;
  heroAlt: NextBook | null;
  nearlyDone: NextBook[];
  nearlyDoneTotal: number;
  pagesToClose: number;
  poolFloor: number;
  misShelved: { count: number; books: Array<{ id: string; title: string; author: string; currentPage: number; totalPages: number; daysSince: number }> };
  readNext: Array<{ id: string; title: string; author: string; pages: number | null; score: number; goalName: string; goalDone: number; goalOwned: number }>;
  buyNext: {
    starred: Array<{ id: string; title: string; author: string; price: number }>;
    opensGoal: Array<{ id: string; title: string; author: string; price: number; opens: string[] }>;
    emptyGoalCount: number;
  };
  unrankable: number;
}

export interface Author {
  id: string;
  name: string;
  ethnicity?: string | null;
  nationality?: string | null;
  country?: string | null;
  birth_year?: number | null;
  death_year?: number | null;
  religious_tradition?: string | null;
  gender?: string | null;
  image_url?: string | null;
  profile_url?: string | null;
  discipline?: string | null;
  era?: string | null;
  denomination?: string | null;
  school?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description?: string;
  source?: string;
  created_at: string;
  updated_at: string;
  // These are the real column names in the recommendations table — kept
  // optional so the type stays compatible with older call sites.
  author?: string;
  isbn?: string;
  cover_url?: string;
  recommended_by?: string;
  notes?: string;
  topic?: string;
  interest?: string;
  year?: number;
  lowest_price?: number | null;
  thriftbooks_price?: number | null;
  amazon_price?: number | null;
  starred?: number;
  item_type?: "book" | "article";
}

export interface LearningGoal {
  id: string;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
}

export interface LearningGoalBook {
  id: string;
  goal_id: string;
  book_id: string;
  priority?: number;
  added_at: string;
}

export interface ReadingList {
  id: string;
  book_id: string;
  year: number;
  priority?: number;
  added_at: string;
}

export interface ReadingGoal {
  id: string;
  year: number;
  target: number;
  created_at: string;
}

export interface LendingRecord {
  id: string;
  book_id: string;
  borrower_name: string;
  lent_date: string;
  due_date?: string | null;
  returned_date?: string | null;
  notes?: string | null;
  created_at: string;
}

async function fetchJson<T>(
  url: string,
  options?: { method?: string; body?: any }
): Promise<T> {
  const res = await fetch(url, {
    method: options?.method || 'GET',
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API error: ${res.status} - ${error}`);
  }
  return res.json();
}

/** Carries the HTTP status and parsed body so callers can branch on them —
 *  specifically the 409 that book deletion returns when the book has related
 *  rows the user should be warned about. */
export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

// DELETE endpoints go through this rather than a bare fetch(). fetch() resolves
// normally on 4xx/5xx, so `api.books.delete(id).catch(...)` never fired and a
// rejected delete looked exactly like a successful one: the UI dropped the row
// optimistically and it reappeared on the next refetch. 263 books have child
// rows and none of the foreign keys cascade, so this was reachable in normal use.
async function deleteJson(url: string): Promise<void> {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let body: any = text;
    try { body = JSON.parse(text); } catch { /* keep the raw text */ }
    const detail = (body && typeof body === 'object' && (body.message || body.error)) || text;
    throw new ApiError(res.status, body, `API error: ${res.status} - ${detail}`);
  }
}

export const api = {
  books: {
    list: (params?: { status?: string; search?: string; favorites?: boolean; sort?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.search) searchParams.set('search', params.search);
      if (params?.favorites) searchParams.set('favorites', 'true');
      if (params?.sort) searchParams.set('sort', params.sort);
      return fetchJson<Book[]>(`/api/books?${searchParams}`);
    },
    get: (id: string) => fetchJson<Book>(`/api/books/${id}`),
    create: (data: Partial<Book>) => fetchJson<Book>('/api/books', { method: 'POST', body: data }),
    update: (id: string, data: Partial<Book>) =>
      fetchJson<Book>(`/api/books/${id}`, { method: 'PUT', body: data }),
    /** Throws ApiError(409) with `body.related` when the book has reading log
     *  entries, goal memberships, etc. Pass cascade:true to delete those too. */
    delete: (id: string, opts?: { cascade?: boolean }) =>
      deleteJson(`/api/books/${id}${opts?.cascade ? '?cascade=true' : ''}`),
  },

  authors: {
    list: () => fetchJson<Author[]>('/api/authors'),
    get: (id: string) => fetchJson<Author>(`/api/authors/${id}`),
    create: (data: Partial<Author>) => fetchJson<Author>('/api/authors', { method: 'POST', body: data }),
    update: (id: string, data: Partial<Author>) =>
      fetchJson<Author>(`/api/authors/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => deleteJson(`/api/authors/${id}`),
  },

  recommendations: {
    list: () => fetchJson<Recommendation[]>('/api/recommendations'),
    get: (id: string) => fetchJson<Recommendation>(`/api/recommendations/${id}`),
    create: (data: Partial<Recommendation>) =>
      fetchJson<Recommendation>('/api/recommendations', { method: 'POST', body: data }),
    update: (id: string, data: Partial<Recommendation>) =>
      fetchJson<Recommendation>(`/api/recommendations/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => deleteJson(`/api/recommendations/${id}`),
  },

  learningGoals: {
    list: () => fetchJson<LearningGoal[]>('/api/learning-goals'),
    get: (id: string) => fetchJson<LearningGoal>(`/api/learning-goals/${id}`),
    create: (data: Partial<LearningGoal>) =>
      fetchJson<LearningGoal>('/api/learning-goals', { method: 'POST', body: data }),
    update: (id: string, data: Partial<LearningGoal>) =>
      fetchJson<LearningGoal>(`/api/learning-goals/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => deleteJson(`/api/learning-goals/${id}`),
  },

  learningGoalBooks: {
    list: (goalId?: string) => {
      const params = new URLSearchParams();
      if (goalId) params.set('goal_id', goalId);
      return fetchJson<LearningGoalBook[]>(`/api/learning-goal-books?${params}`);
    },
    get: (id: string) => fetchJson<LearningGoalBook>(`/api/learning-goal-books/${id}`),
    create: (data: Partial<LearningGoalBook>) =>
      fetchJson<LearningGoalBook>('/api/learning-goal-books', { method: 'POST', body: data }),
    update: (id: string, data: Partial<LearningGoalBook>) =>
      fetchJson<LearningGoalBook>(`/api/learning-goal-books/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => deleteJson(`/api/learning-goal-books/${id}`),
  },

  readingList: {
    list: (year?: number) => {
      const params = new URLSearchParams();
      if (year) params.set('year', year.toString());
      return fetchJson<ReadingList[]>(`/api/reading-list?${params}`);
    },
    get: (id: string) => fetchJson<ReadingList>(`/api/reading-list/${id}`),
    create: (data: Partial<ReadingList>) =>
      fetchJson<ReadingList>('/api/reading-list', { method: 'POST', body: data }),
    update: (id: string, data: Partial<ReadingList>) =>
      fetchJson<ReadingList>(`/api/reading-list/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => deleteJson(`/api/reading-list/${id}`),
  },

  readingGoals: {
    list: () => fetchJson<ReadingGoal[]>('/api/reading-goals'),
    create: (data: Partial<ReadingGoal>) =>
      fetchJson<ReadingGoal>('/api/reading-goals', { method: 'POST', body: data }),
    update: (id: string, data: Partial<ReadingGoal>) =>
      fetchJson<ReadingGoal>(`/api/reading-goals/${id}`, { method: 'PUT', body: data }),
  },

  next: {
    get: () => fetchJson<NextPayload>('/api/next'),
  },

  booksBulk: {
    setStatus: (updates: Array<{ id: string; status: Book['status'] }>) =>
      fetchJson<{ changed: number; previous: Array<{ id: string; status: Book['status'] }> }>(
        '/api/books/bulk-status',
        { method: 'PATCH', body: { updates } }
      ),
  },

  stalled: {
    get: () => fetchJson<{
      stalledCount: number;
      readingCount: number;
      candidates: Array<{
        id: string; title: string; author: string;
        currentPage: number; totalPages: number; pagesLeft: number;
        percentDone: number; lastReadAt: string | null; daysSince: number;
      }>;
    }>('/api/stalled'),
  },

  readingPace: {
    get: () => fetchJson<{
      perBook: Record<string, { title: string; author: string; density: Density | null; pagesPerHour: number; pairs: number; observedMinutes: number }>;
      tiers: Record<string, TierStat>;
      needsTag: Array<{ id: string; title: string; author: string; pagesPerHour: number; pairs: number }>;
      meta: { booksMeasured: number; tiersCalibrated: number; minBooksPerTier: number };
    }>('/api/reading-pace'),
  },

  readingUpdates: {
    list: (bookId?: string) => {
      const params = new URLSearchParams();
      if (bookId) params.set('book_id', bookId);
      return fetchJson<ReadingUpdate[]>(`/api/reading-updates?${params}`);
    },
    create: (data: Partial<ReadingUpdate>) =>
      fetchJson<ReadingUpdate>('/api/reading-updates', { method: 'POST', body: data }),
    delete: (id: string) => deleteJson(`/api/reading-updates/${id}`),
  },

  lending: {
    list: () => fetchJson<LendingRecord[]>('/api/lending'),
    get: (id: string) => fetchJson<LendingRecord>(`/api/lending/${id}`),
    create: (data: Partial<LendingRecord>) =>
      fetchJson<LendingRecord>('/api/lending', { method: 'POST', body: data }),
    update: (id: string, data: Partial<LendingRecord>) =>
      fetchJson<LendingRecord>(`/api/lending/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => deleteJson(`/api/lending/${id}`),
  },
};
