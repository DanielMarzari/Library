-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

create table if not exists books (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  author text not null,
  isbn text,
  cover_url text,
  description text,
  status text not null default 'want_to_read' check (status in ('want_to_read', 'reading', 'read')),
  rating integer check (rating >= 1 and rating <= 5),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security (optional for now, but good practice)
alter table books enable row level security;

-- Allow all operations for now (no auth yet)
create policy "Allow all access" on books
  for all
  using (true)
  with check (true);

-- Index for faster search
create index if not exists books_title_idx on books using gin (to_tsvector('english', title));
create index if not exists books_status_idx on books (status);
