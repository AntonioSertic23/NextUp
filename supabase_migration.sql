-- ========================================================
-- Supabase Database Migration
-- NextUp - Users, Shows, Seasons, Episodes and User Episodes Tables
-- ========================================================

-- NOTE: Passwords are NOT stored in this custom users table.
-- Supabase Auth automatically manages passwords in the built-in auth.users table.
-- This custom users table extends auth.users with additional data (trakt_token).
-- When a user signs up via supabase.auth.signUp(), Supabase automatically:
-- 1. Creates a record in auth.users (with hashed password)
-- 2. Our trigger (below) automatically creates a record in public.users
-- 3. The id in public.users references auth.users(id) via foreign key

-- =========================
-- Users
-- =========================

-- This table extends auth.users with additional user data (Trakt token)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  trakt_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own data
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can only update their own data
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Function to automatically create user record AND default list when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Create user profile record
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);

  -- 2. Create default list for the user
  INSERT INTO public.lists (user_id, name, is_default)
  VALUES (NEW.id, 'Collection', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- Shows
-- =========================

create table if not exists shows (
  id uuid primary key default gen_random_uuid(),
  trakt_id integer unique not null,
  slug_id text unique not null,
  tvdb_id integer,
  imdb_id text,
  tmdb_id integer,
  last_watched_at timestamptz,
  title text,
  year integer,
  tagline text,
  overview text,
  first_aired timestamptz,
  airs_day text,
  airs_time text,
  airs_timezone text,
  runtime integer,
  country text,
  status text,
  rating float,
  votes integer,
  trailer text,
  homepage text,
  network text,
  updated_at timestamptz,
  language text,
  genres text,
  subgenres text,
  aired_episodes integer,
  image_fanart text,
  image_poster text,
  image_logo text,
  image_clearart text,
  image_banner text,
  image_thumb text,
  created_at timestamptz default now()
);

create index if not exists idx_shows_trakt_id on shows(trakt_id);

-- Enable RLS
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
-- Policy: All users can read shows (public)
CREATE POLICY "Public read for shows"
  ON shows FOR SELECT
  USING (true);
-- Policy: Only admins (or future roles) can modify shows
-- Currently no UPDATE/DELETE policy → no user can modify

-- =========================
-- Seasons
-- =========================

create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer,
  tvdb_id integer,
  trakt_id integer unique not null,
  show_id uuid references shows(id) on delete cascade,
  season_number integer not null,
  title text,
  episode_count integer,
  aired_episodes integer,
  votes integer,
  rating float,
  image_thumb text,
  image_poster text,
  overview text,
  updated_at timestamptz,
  first_aired timestamptz,
  unique (show_id, season_number)
);

create index if not exists idx_seasons_show_id on seasons(show_id);

-- Enable RLS
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

-- Policy: All users can read seasons
CREATE POLICY "Public read for seasons"
  ON seasons FOR SELECT
  USING (true);


-- =========================
-- Episodes
-- =========================
create table if not exists episodes (
  id uuid primary key default gen_random_uuid(),
  show_id uuid references shows(id) on delete cascade,
  season_id uuid references seasons(id) on delete cascade,
  trakt_id integer unique not null,
  imdb_id text,
  tmdb_id integer,
  tvdb_id integer,
  title text,
  votes integer,
  image_screenshot text,
  episode_number integer not null,
  rating float,
  season_number integer not null,
  runtime integer,
  overview text,
  updated_at timestamptz,
  first_aired timestamptz,
  episode_type text,
  unique (show_id, season_number, episode_number)
);

create index if not exists idx_episodes_trakt_id on episodes(trakt_id);
create index if not exists idx_episodes_show_id on episodes(show_id);

-- Enable RLS
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

-- Policy: All users can read episodes
CREATE POLICY "Public read for episodes"
  ON episodes FOR SELECT
  USING (true);

-- =========================
-- User Episodes (progress)
-- =========================
create table if not exists user_episodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  episode_id uuid references episodes(id) on delete cascade,
  watched_at timestamptz default now(),
  unique (user_id, episode_id)
);

create index if not exists idx_user_episodes_user_id on user_episodes(user_id);

-- Enable RLS
ALTER TABLE user_episodes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own progress
CREATE POLICY "Users can read own progress"
  ON user_episodes FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only update their own progress
CREATE POLICY "Users can update own progress"
  ON user_episodes FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own progress
CREATE POLICY "Users can insert own progress"
  ON user_episodes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own progress
CREATE POLICY "Users can delete own progress"
  ON user_episodes FOR DELETE
  USING (auth.uid() = user_id);

-- =========================
-- Lists
-- =========================

create table if not exists lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_lists_user_id on lists(user_id);

alter table lists enable row level security;

-- Read own lists
create policy "Users can read own lists"
on lists for select
using (auth.uid() = user_id);

-- Insert own lists
create policy "Users can create lists"
on lists for insert
with check (auth.uid() = user_id);

-- Update own lists
create policy "Users can update own lists"
on lists for update
using (auth.uid() = user_id);

-- Delete own lists
create policy "Users can delete own lists"
on lists for delete
using (auth.uid() = user_id);

-- =========================
-- List Shows
-- =========================

create table if not exists list_shows (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references lists(id) on delete cascade,
  show_id uuid not null references shows(id) on delete cascade,
  added_at timestamptz default now(),
  is_completed boolean default false,
  completed_at timestamptz,
  watched_episodes integer default 0,
  total_episodes integer,
  next_episode_id uuid references episodes(id) on delete cascade,
  unique (list_id, show_id)
);

create index if not exists idx_list_shows_list_id on list_shows(list_id);
create index if not exists idx_list_shows_show_id on list_shows(show_id);
create index if not exists idx_list_shows_next_episode_id on list_shows(next_episode_id);

alter table list_shows enable row level security;

-- User can read shows from own lists
create policy "Users can read own list shows"
on list_shows for select
using (
  exists (
    select 1 from lists
    where lists.id = list_shows.list_id
    and lists.user_id = auth.uid()
  )
);

-- User can add shows to own lists
create policy "Users can add shows to own lists"
on list_shows for insert
with check (
  exists (
    select 1 from lists
    where lists.id = list_shows.list_id
    and lists.user_id = auth.uid()
  )
);

-- User can remove shows from own lists
create policy "Users can delete shows from own lists"
on list_shows for delete
using (
  exists (
    select 1 from lists
    where lists.id = list_shows.list_id
    and lists.user_id = auth.uid()
  )
);
