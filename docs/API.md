# API Documentation

> All endpoints are Netlify Functions available at `/.netlify/functions/<name>`.

---

## Authentication

Most endpoints require a Supabase JWT token passed via the `Authorization` header:

```
Authorization: Bearer <supabase_access_token>
```

---

## Endpoints

### `getClientId`

| | |
|---|---|
| **Method** | `GET` |
| **Auth** | None |
| **Description** | Returns the Trakt.tv client ID for OAuth initialization. |

**Response:**
```json
{ "clientId": "abc123..." }
```

---

### `getSupabaseConfig`

| | |
|---|---|
| **Method** | `GET` |
| **Auth** | None |
| **Description** | Returns Supabase URL and anon key for client-side initialization. |

**Response:**
```json
{
  "supabaseUrl": "https://xxx.supabase.co",
  "supabaseAnonKey": "eyJ..."
}
```

---

### `traktAuth`

| | |
|---|---|
| **Method** | `POST` |
| **Auth** | Bearer token (Supabase JWT) |
| **Description** | Exchanges a Trakt authorization code for access/refresh tokens and stores them in the database. |

**Request body:**
```json
{
  "code": "TRAKT_AUTH_CODE",
  "redirectUri": "https://your-app.netlify.app"
}
```

**Response:**
```json
{ "message": "Trakt account connected" }
```

**Errors:**
- `401` — Missing/invalid auth token
- `400` — Missing code or redirectUri
- `500` — Token exchange failed

---

### `syncTraktAccount`

| | |
|---|---|
| **Method** | `POST` |
| **Auth** | Bearer token (Supabase JWT) |
| **Timeout** | 120s |
| **Description** | Synchronizes the user's full Trakt watch history — imports shows, seasons, episodes, and watch progress into the database. |

**Request body:** None

**Response:**
```json
{
  "message": "Sync completed successfully",
  "shows": 42,
  "errors": []
}
```

**Errors:**
- `401` — Missing auth / no Trakt token
- `500` — Sync failure (partial results may be returned)

---

### `syncNextEpisodes`

| | |
|---|---|
| **Method** | `POST` (manual) or Scheduled (cron: `0 6 * * *` — daily at 6 AM UTC) |
| **Auth** | None (scheduled) / None (manual trigger) |
| **Timeout** | 120s |
| **Description** | Checks all tracked shows for newly aired episodes, updates seasons/episodes in the database, and recalculates user progress. |

**Response:**
```json
{
  "message": "Sync completed",
  "updated": ["Breaking Bad", "The Bear"],
  "skipped": ["Game of Thrones"],
  "errors": [{ "show": "Lost", "error": "API timeout" }]
}
```

---

### `getShowDetails`

| | |
|---|---|
| **Method** | `GET` |
| **Auth** | None |
| **Description** | Returns full show details with seasons and episodes. Fetches from Trakt if not cached in the database. |

**Query params:**
- `traktId` — Trakt numeric ID or slug (required)

**Response:**
```json
{
  "show": { "id": "uuid", "title": "...", "year": 2024, ... },
  "seasons": [...],
  "episodes": [...]
}
```

---

### `searchShows`

| | |
|---|---|
| **Method** | `GET` |
| **Auth** | None |
| **Description** | Searches Trakt for shows matching the query string. |

**Query params:**
- `query` — Search string (required)
- `page` — Page number (default: 1)
- `limit` — Results per page (default: 10)

**Response:**
```json
[
  {
    "show": { "title": "...", "year": 2024, "ids": { "trakt": 123, "slug": "..." } },
    "score": 95.2
  }
]
```

**Headers:** `X-Pagination-Page-Count`, `X-Pagination-Item-Count`

---

### `getTraktShows`

| | |
|---|---|
| **Method** | `GET` |
| **Auth** | None |
| **Description** | Returns Trakt curated lists: trending, popular, or anticipated shows. |

**Query params:**
- `type` — One of: `trending`, `popular`, `anticipated` (required)
- `limit` — Number of results (default: 20)

**Response:** Array of show objects from Trakt API.

---

### `getRelatedShows`

| | |
|---|---|
| **Method** | `GET` |
| **Auth** | None |
| **Description** | Returns shows related to a given show (Trakt recommendation engine). |

**Query params:**
- `traktId` — Show Trakt ID or slug (required)

**Response:** Array of related show objects.

---

### `getNextEpisodes`

| | |
|---|---|
| **Method** | `POST` |
| **Auth** | Bearer token (Supabase JWT) |
| **Description** | Returns next unwatched episode data for a list of shows. |

**Request body:**
```json
{
  "showIds": ["uuid1", "uuid2", ...]
}
```

**Response:**
```json
{
  "uuid1": { "episode": {...}, "show": {...} },
  "uuid2": null
}
```

---

### `getEpisodeDetails`

| | |
|---|---|
| **Method** | `GET` |
| **Auth** | None |
| **Description** | Returns detailed info for a specific episode from Trakt. |

**Query params:**
- `showId` — Trakt show ID or slug
- `season` — Season number
- `episode` — Episode number

**Response:** Episode object with overview, screenshot, runtime, etc.

---

### `getWatchlistData`

| | |
|---|---|
| **Method** | `GET` |
| **Auth** | Bearer token (Supabase JWT) |
| **Description** | Returns the user's watchlist (shows from default list with progress data). |

**Response:**
```json
[
  {
    "id": "uuid",
    "show_id": "uuid",
    "shows": { "title": "...", ... },
    "watched_episodes": 5,
    "total_episodes": 24,
    "next_episode_id": "uuid"
  }
]
```

---

### `markEpisodes`

| | |
|---|---|
| **Method** | `POST` |
| **Auth** | Bearer token (Supabase JWT) |
| **Description** | Marks or unmarks episodes as watched. Updates user progress and syncs to Trakt if connected. |

**Request body:**
```json
{
  "action": "mark" | "unmark",
  "showId": "uuid",
  "episodeIds": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "message": "Episodes marked as watched",
  "watchedCount": 2
}
```

---

### `manageCollection`

| | |
|---|---|
| **Method** | `POST` |
| **Auth** | Bearer token (Supabase JWT) |
| **Description** | Adds or removes a show from the user's collection (default list). |

**Request body:**
```json
{
  "action": "add" | "remove",
  "showId": "uuid"
}
```

**Response:**
```json
{ "message": "Show added to collection" }
```

---

## Server-side Libraries

### `netlify/lib/supabase.js`

Shared Supabase admin client and helper functions used by all functions:

| Function | Description |
|---|---|
| `getAdminClient()` | Returns Supabase client with service role key |
| `saveShow(showData)` | Upserts a show into the `shows` table |
| `saveSeasons(seasons)` | Upserts seasons for a show |
| `saveEpisodes(episodes)` | Upserts episodes for a show |
| `saveShowGenres(showId, genreNames)` | Syncs genre associations for a show |
| `updateShowLastWatchedAt(showId)` | Sets `last_watched_at` to NOW() |

### `netlify/lib/trakt.js`

Trakt API configuration and OAuth token management:

| Function | Description |
|---|---|
| `getTraktHeaders()` | Returns default Trakt API headers |
| `exchangeCode(code, redirectUri)` | Exchanges auth code for tokens |
| `refreshToken(userId)` | Refreshes expired Trakt token |

---

## Rate Limits & Timeouts

- Trakt API: 1000 requests per 5 minutes (shared across all users)
- `syncTraktAccount` and `syncNextEpisodes`: 120s timeout (configured in `netlify.toml`)
- All other functions: default Netlify timeout (10s)
