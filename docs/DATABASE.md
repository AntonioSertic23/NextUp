# Database Documentation

## Overview

NextUp uses **Supabase** (PostgreSQL) with Row Level Security (RLS) for data isolation.

---

## Entity Relationship Diagram

```
┌─────────────────┐
│   auth.users    │  (Supabase managed)
│─────────────────│
│ id (UUID) PK    │
│ email           │
│ encrypted_pass  │
└────────┬────────┘
         │ 1:1
         ▼
┌─────────────────────────────┐
│           users             │
│─────────────────────────────│
│ id (UUID) PK/FK→auth.users │
│ email                       │
│ trakt_token                 │
│ trakt_refresh_token         │
│ trakt_token_expires_at      │
│ trakt_oauth_redirect_uri    │
│ created_at, updated_at      │
└─────────────────────────────┘

┌──────────────────────────┐       ┌─────────────────────┐
│          shows           │       │       genres        │
│──────────────────────────│       │─────────────────────│
│ id (UUID) PK             │       │ id (UUID) PK        │
│ trakt_id (INT) UNIQUE    │       │ name (TEXT) UNIQUE  │
│ slug_id (TEXT) UNIQUE    │       │ slug (TEXT) UNIQUE  │
│ title, year, overview    │       └──────────┬──────────┘
│ status, network, rating  │                  │
│ runtime, genres (TEXT)   │                  │ M:N
│ image_poster, image_*    │                  │
│ last_watched_at          │       ┌──────────┴──────────┐
│ aired_episodes           │       │    show_genres      │
│ ...                      │       │─────────────────────│
└───────────┬──────────────┘       │ show_id (FK) PK    │
            │                      │ genre_id (FK) PK   │
            │ 1:N                  └─────────────────────┘
            ▼
┌──────────────────────────┐
│         seasons          │
│──────────────────────────│
│ id (UUID) PK             │
│ show_id (FK→shows)       │
│ trakt_id (INT) UNIQUE    │
│ season_number            │
│ episode_count            │
│ aired_episodes           │
│ rating, first_aired      │
│ UNIQUE(show_id, season)  │
└───────────┬──────────────┘
            │ 1:N
            ▼
┌──────────────────────────┐
│        episodes          │
│──────────────────────────│
│ id (UUID) PK             │
│ show_id (FK→shows)       │
│ season_id (FK→seasons)   │
│ trakt_id (INT) UNIQUE    │
│ episode_number           │
│ season_number            │
│ title, overview          │
│ runtime, first_aired     │
│ rating, image_screenshot │
│ UNIQUE(show,season,ep)   │
└───────────┬──────────────┘
            │
            │ M:N (via user_episodes)
            ▼
┌──────────────────────────┐
│      user_episodes       │
│──────────────────────────│
│ id (UUID) PK             │
│ user_id (FK→auth.users)  │
│ episode_id (FK→episodes) │
│ watched_at               │
│ UNIQUE(user_id, ep_id)   │
└──────────────────────────┘

┌──────────────────────────┐       ┌─────────────────────────┐
│          lists           │       │       list_shows        │
│──────────────────────────│       │─────────────────────────│
│ id (UUID) PK             │──1:N─▶│ id (UUID) PK            │
│ user_id (FK→auth.users)  │       │ list_id (FK→lists)      │
│ name                     │       │ show_id (FK→shows)      │
│ is_default (BOOL)        │       │ added_at                │
│ created_at, updated_at   │       │ is_completed            │
└──────────────────────────┘       │ watched_episodes        │
                                   │ total_episodes          │
                                   │ next_episode_id (FK→ep) │
                                   │ UNIQUE(list_id, show_id)│
                                   └─────────────────────────┘

┌──────────────────────────┐       ┌─────────────────────────┐
│       show_notes         │       │       user_notes        │
│──────────────────────────│       │─────────────────────────│
│ user_id, show_id (UNIQUE)│       │ user_id PK              │
│ content, updated_at      │       │ content (profile note)  │
└──────────────────────────┘       └─────────────────────────┘

┌──────────────────────────┐       ┌─────────────────────────┐
│      user_follows        │       │   user_stats_cache      │
│──────────────────────────│       │─────────────────────────│
│ follower_id, following_id│       │ user_id PK              │
│ PK (follower, following) │       │ multi_list (jsonb)      │
└──────────────────────────┘       │ detail_by_list (jsonb)  │
                                   └─────────────────────────┘

┌──────────────────────────┐
│   push_subscriptions     │
│──────────────────────────│
│ user_id, endpoint (UNIQ) │
│ p256dh, auth, user_agent │
└──────────────────────────┘

┌──────────────────────────┐
│  user_show_ratings       │
│──────────────────────────│
│ user_id, show_id (PK)    │
│ score (1–5)              │
└──────────────────────────┘
```

---

## Tables

### `users`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | References `auth.users(id)` |
| `email` | TEXT UNIQUE | User's email |
| `trakt_token` | TEXT | Trakt OAuth access token |
| `trakt_refresh_token` | TEXT | Trakt OAuth refresh token |
| `trakt_token_expires_at` | TIMESTAMPTZ | Token expiry time |
| `trakt_oauth_redirect_uri` | TEXT | OAuth redirect URI used during auth |
| `display_name` | TEXT | Optional display name (v2.8+) |
| `created_at` | TIMESTAMPTZ | Registration time |
| `updated_at` | TIMESTAMPTZ | Last update (auto-trigger) |

**RLS Policies:**
- SELECT: own data only (`auth.uid() = id`)
- UPDATE: own data only (`auth.uid() = id`)

---

### `shows`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Internal ID |
| `trakt_id` | INT UNIQUE | Trakt.tv ID |
| `slug_id` | TEXT UNIQUE | URL-friendly slug |
| `tvdb_id` / `imdb_id` / `tmdb_id` | INT/TEXT | External IDs |
| `title` | TEXT | Show title |
| `year` | INT | Premiere year |
| `overview` | TEXT | Synopsis |
| `status` | TEXT | `returning series`, `ended`, `canceled`, etc. |
| `network` | TEXT | TV network |
| `runtime` | INT | Episode runtime (minutes) |
| `rating` | FLOAT | Trakt community rating |
| `genres` | TEXT | Comma-separated genre string (legacy) |
| `aired_episodes` | INT | Total aired episodes |
| `last_watched_at` | TIMESTAMPTZ | When user last watched this show |
| `image_poster` | TEXT | Poster image URL |
| `image_fanart` | TEXT | Fanart image URL |

**RLS Policies:**
- SELECT: public (everyone can read)
- INSERT/UPDATE/DELETE: service role only (via Netlify Functions)

---

### `seasons`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Internal ID |
| `show_id` | UUID FK | Parent show |
| `trakt_id` | INT UNIQUE | Trakt season ID |
| `season_number` | INT | Season number |
| `episode_count` | INT | Total episodes in season |
| `aired_episodes` | INT | Aired episodes in season |
| `first_aired` | TIMESTAMPTZ | Season premiere date |
| `rating` | FLOAT | Season rating |

**Constraints:** `UNIQUE(show_id, season_number)`

**RLS Policies:** SELECT: public

---

### `episodes`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Internal ID |
| `show_id` | UUID FK | Parent show |
| `season_id` | UUID FK | Parent season |
| `trakt_id` | INT UNIQUE | Trakt episode ID |
| `episode_number` | INT | Episode number |
| `season_number` | INT | Season number |
| `title` | TEXT | Episode title |
| `overview` | TEXT | Episode synopsis |
| `runtime` | INT | Duration (minutes) |
| `first_aired` | TIMESTAMPTZ | Air date |
| `rating` | FLOAT | Episode rating |
| `image_screenshot` | TEXT | Episode screenshot URL |

**Constraints:** `UNIQUE(show_id, season_number, episode_number)`

**RLS Policies:** SELECT: public

---

### `user_episodes`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Internal ID |
| `user_id` | UUID FK | User who watched |
| `episode_id` | UUID FK | Episode watched |
| `watched_at` | TIMESTAMPTZ | When marked as watched |

**Constraints:** `UNIQUE(user_id, episode_id)`

**RLS Policies:** Full CRUD for own data (`auth.uid() = user_id`)

---

### `lists`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Internal ID |
| `user_id` | UUID FK | List owner |
| `name` | TEXT | List name |
| `is_default` | BOOL | Default collection (auto-created) |
| `created_at` | TIMESTAMPTZ | Creation time |

**RLS Policies:** Full CRUD for own lists (`auth.uid() = user_id`)

---

### `list_shows`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Internal ID |
| `list_id` | UUID FK | Parent list |
| `show_id` | UUID FK | Show in list |
| `added_at` | TIMESTAMPTZ | When added |
| `is_completed` | BOOL | All episodes watched |
| `watched_episodes` | INT | Episodes watched |
| `total_episodes` | INT | Total episodes |
| `next_episode_id` | UUID FK | Next unwatched episode |

**Constraints:** `UNIQUE(list_id, show_id)`

**RLS Policies:** SELECT/INSERT/DELETE through list ownership check

---

### `genres`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Internal ID |
| `name` | TEXT UNIQUE | Genre display name (e.g. "Science Fiction") |
| `slug` | TEXT UNIQUE | URL-friendly slug (e.g. "science-fiction") |

**RLS Policies:** SELECT: public

---

### `show_genres`

| Column | Type | Description |
|--------|------|-------------|
| `show_id` | UUID FK/PK | Show reference |
| `genre_id` | UUID FK/PK | Genre reference |

**Constraints:** Composite PK `(show_id, genre_id)`

**RLS Policies:** SELECT: public

---

### `show_notes` (v2.8+)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Note id |
| `user_id` | UUID FK | Owner |
| `show_id` | UUID FK | Show |
| `content` | TEXT | Note body |
| `updated_at` | TIMESTAMPTZ | Last edit |

**Constraints:** `UNIQUE(user_id, show_id)`

**RLS Policies:** Full CRUD for own rows

---

### `user_notes` (v2.8+)

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID PK/FK | One profile note per user |
| `content` | TEXT | General/private note |
| `updated_at` | TIMESTAMPTZ | Last edit |

**RLS Policies:** Full CRUD for own row

---

### `user_follows` (v2.8+)

| Column | Type | Description |
|--------|------|-------------|
| `follower_id` | UUID FK/PK | User who follows |
| `following_id` | UUID FK/PK | User being followed |
| `created_at` | TIMESTAMPTZ | When follow was created |

**Constraints:** `CHECK (follower_id <> following_id)`

**RLS Policies:** SELECT if follower or following; INSERT/DELETE as follower only

---

### `user_stats_cache` (v2.8+)

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID PK/FK | Owner |
| `multi_list` | JSONB | Cached aggregate stats across lists |
| `multi_list_computed_at` | TIMESTAMPTZ | When multi-list cache was built |
| `detail_by_list` | JSONB | Per-list stat payloads keyed by list id |
| `updated_at` | TIMESTAMPTZ | Row touch time |

**RLS Policies:** Full CRUD for own row

---

### `user_show_ratings` (v2.8+)

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID FK/PK | Rater |
| `show_id` | UUID FK/PK | Show |
| `score` | SMALLINT | Personal hype tier 1–5 (1 = Later, 5 = Peak) |
| `updated_at` | TIMESTAMPTZ | Last change |

**Constraints:** `CHECK (score >= 1 AND score <= 5)`

**RLS Policies:** Full CRUD for own rows

One rating per user per show (global — not per list). Used for favorites-style filtering on My Shows and the Statistics “Your hype” section.

---

### `push_subscriptions` (v2.8+)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Subscription row |
| `user_id` | UUID FK | Owner |
| `endpoint` | TEXT | Browser push endpoint URL |
| `p256dh` | TEXT | Public key for encryption |
| `auth` | TEXT | Auth secret |
| `user_agent` | TEXT | Optional device hint |
| `created_at` / `updated_at` | TIMESTAMPTZ | Timestamps |

**Constraints:** `UNIQUE(user_id, endpoint)`

**RLS Policies:** Full CRUD for own rows (client upserts via Netlify functions with service role for cross-user push sends)

---

## Indexes

| Table | Index | Column(s) |
|-------|-------|-----------|
| `shows` | `idx_shows_trakt_id` | `trakt_id` |
| `seasons` | `idx_seasons_show_id` | `show_id` |
| `episodes` | `idx_episodes_trakt_id` | `trakt_id` |
| `episodes` | `idx_episodes_show_id` | `show_id` |
| `user_episodes` | `idx_user_episodes_user_id` | `user_id` |
| `lists` | `idx_lists_user_id` | `user_id` |
| `list_shows` | `idx_list_shows_list_id` | `list_id` |
| `list_shows` | `idx_list_shows_show_id` | `show_id` |
| `list_shows` | `idx_list_shows_next_episode_id` | `next_episode_id` |
| `show_genres` | `idx_show_genres_show_id` | `show_id` |
| `show_genres` | `idx_show_genres_genre_id` | `genre_id` |
| `show_notes` | `idx_show_notes_user_id` | `user_id` |
| `show_notes` | `idx_show_notes_show_id` | `show_id` |
| `user_follows` | `idx_user_follows_follower` | `follower_id` |
| `user_follows` | `idx_user_follows_following` | `following_id` |
| `push_subscriptions` | `idx_push_subscriptions_user_id` | `user_id` |
| `user_show_ratings` | `idx_user_show_ratings_user_id` | `user_id` |
| `user_show_ratings` | `idx_user_show_ratings_score` | `user_id`, `score` |

---

## Triggers

| Trigger | Table | Function | Description |
|---------|-------|----------|-------------|
| `on_auth_user_created` | `auth.users` | `handle_new_user()` | Creates `users` row + default list on signup |
| `update_users_updated_at` | `users` | `update_updated_at_column()` | Auto-updates `updated_at` on any change |

---

## Migration

The full schema is defined in `db/migration.sql`. To apply:

```sql
-- Run in Supabase SQL Editor
-- Copy & paste the entire contents of db/migration.sql
```

For existing databases, run only the **new sections** from the bottom of `db/migration.sql` that you have not applied yet:

| Version | Section in `migration.sql` | Adds |
|---------|---------------------------|------|
| Genres | `genres`, `show_genres` | Normalized genre filtering |
| v2.8.0 | Notes, follows, `display_name` | `show_notes`, `user_notes`, `user_follows` |
| v2.8.0 | Stats cache | `user_stats_cache` |
| v2.8.0 | Push | `push_subscriptions` |
| v2.8.0 | Hype ratings | `user_show_ratings` |

Always run blocks in order. Re-running `CREATE TABLE IF NOT EXISTS` is safe.
