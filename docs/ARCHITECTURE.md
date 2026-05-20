# Architecture Documentation

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser/PWA)                        │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Pages   │  │    UI    │  │  Stores  │  │     Services      │  │
│  │ (Router) │─▶│ (Render) │◀─│ (State)  │  │ (Auth, Supabase)  │  │
│  └────┬─────┘  └──────────┘  └──────────┘  └─────────┬─────────┘  │
│       │                                               │            │
│       ▼                                               ▼            │
│  ┌──────────┐                                 ┌──────────────┐     │
│  │   API    │─────── HTTP ──────────┐         │  Supabase JS │     │
│  │ (Fetch)  │                       │         │   (Direct)   │     │
│  └──────────┘                       │         └──────┬───────┘     │
└─────────────────────────────────────┼────────────────┼─────────────┘
                                      │                │
                                      ▼                ▼
┌─────────────────────────────┐    ┌──────────────────────────────────┐
│   Netlify Functions (Edge)  │    │        Supabase (Cloud)          │
│─────────────────────────────│    │──────────────────────────────────│
│                             │    │                                  │
│  ┌──────────────────────┐   │    │  ┌────────────┐  ┌───────────┐  │
│  │  lib/trakt.js        │   │    │  │ PostgreSQL │  │   Auth    │  │
│  │  (Trakt API Client)  │───┼──┐ │  │   + RLS    │  │  (JWT)    │  │
│  └──────────────────────┘   │  │ │  └────────────┘  └───────────┘  │
│                             │  │ │                                  │
│  ┌──────────────────────┐   │  │ └──────────────────────────────────┘
│  │  lib/supabase.js     │───┼──┘
│  │  (Admin Client)      │   │         ┌──────────────────┐
│  └──────────────────────┘   │         │   Trakt.tv API   │
│                             │────────▶│  (External)      │
│  ┌──────────────────────┐   │         └──────────────────┘
│  │  Scheduled (cron)    │   │
│  │  syncNextEpisodes    │   │
│  └──────────────────────┘   │
└─────────────────────────────┘
```

---

## Architecture Style

| Aspect | Choice | Reasoning |
|--------|--------|-----------|
| Frontend | SPA (Single Page Application) | Fast navigation, no page reloads |
| Routing | Hash-based (`#page`) | No server config needed, works on static hosting |
| State | In-memory singletons (stores) | Simple, no framework overhead |
| Backend | Serverless (Netlify Functions) | No server to manage, auto-scales |
| Database | PostgreSQL (Supabase) | Relational data, RLS, realtime-ready |
| Auth | Supabase Auth (JWT) | Built-in, secure, session management |
| External API | Trakt.tv | Rich TV show metadata & community data |

---

## Data Flow

### Reading data (shows, watchlist)

```
User action → Page renderer → API module → Supabase (direct query)
                                         → or Netlify Function → Trakt API
                                                               → Supabase (admin)
           ← DOM update ← UI module ← Store (cached) ← Response
```

### Writing data (mark episode)

```
User click → UI handler → API module → Netlify Function (markEpisodes)
                                           │
                                           ├─ Supabase: insert/delete user_episodes
                                           ├─ Supabase: update list_shows progress
                                           ├─ Supabase: update shows.last_watched_at
                                           └─ Trakt API: sync watch history (if connected)
           ← UI update ← Store update ← Response
```

### Authentication flow

```
1. User enters email/password on login.html
2. Supabase Auth → returns JWT session
3. app.js checks session → redirects if invalid
4. JWT stored in localStorage (managed by Supabase SDK)
5. Token auto-refreshed by Supabase on expiry
6. Auth guard listens for SIGNED_OUT events
```

### Trakt OAuth flow

```
1. User clicks "Sign in to Trakt" → redirect to trakt.tv/oauth/authorize
2. User authorizes → redirected back with ?code=AUTH_CODE
3. handleTraktAuthRedirect() detects code
4. POST to /.netlify/functions/traktAuth with code + redirectUri
5. Function exchanges code for access_token + refresh_token
6. Tokens stored in users table (server-side only)
7. On subsequent API calls, token is auto-refreshed if expired
```

### Scheduled sync

```
Daily at 6:00 AM UTC (cron: 0 6 * * *)
    │
    ▼
syncNextEpisodes function
    │
    ├─ Query all shows from DB
    ├─ For each show:
    │   ├─ Fetch latest data from Trakt
    │   ├─ Compare with DB (new episodes?)
    │   ├─ Upsert new seasons/episodes
    │   ├─ Update genre associations
    │   └─ Recalculate user progress (list_shows)
    │
    └─ Return summary (updated/skipped/errors)
```

---

## Module Dependency Graph

```
app.js (entry point)
  ├── services/auth.js ─── services/supabase.js
  ├── stores/userStore.js ── services/supabase.js
  ├── api/sync.js ── stores/userStore.js
  │
  ├── pages/home.js
  │     ├── api/watchlist.js ── stores/userStore.js, services/supabase.js
  │     ├── ui/watchlist.js ── stores/watchlistStore.js
  │     └── ui/episodeModal.js ── api/episodes.js
  │
  ├── pages/show.js
  │     ├── api/shows.js ── stores/userStore.js
  │     └── ui/showDetails.js ── api/episodes.js
  │
  ├── pages/discover.js
  │     ├── api/shows.js
  │     └── ui/discover.js ── stores/discoverStore.js
  │
  ├── pages/myShows.js
  │     ├── api/watchlist.js
  │     └── ui/myShows.js ── stores/myShowsStore.js
  │
  ├── pages/stats.js
  │     ├── api/stats.js
  │     └── ui/statistics.js ── stores/statsStore.js, utils/stats.js
  │
  └── pages/profile.js
        └── ui/profile.js ── services/auth.js, api/sync.js
```

---

## Security Model

| Layer | Mechanism | What it protects |
|-------|-----------|-----------------|
| Auth | Supabase JWT | User identity |
| Database | RLS policies | Data isolation per user |
| API | Bearer token validation | Function access control |
| Tokens | Server-side only | Trakt credentials never exposed to client |
| HTTPS | Netlify CDN | Transport encryption |

---

## Performance Considerations

| Strategy | Where | Benefit |
|----------|-------|---------|
| In-memory stores | Client | No redundant API calls per session |
| Supabase direct queries | Client | Bypasses function cold start for reads |
| localStorage | Client | Persists preferences without API calls |
| Service worker | Client | Offline installability, caching |
| Upsert pattern | Server | Idempotent writes (safe to retry) |
| Scheduled sync | Server | Background updates without user action |
| esbuild bundling | Build | Fast function builds |
