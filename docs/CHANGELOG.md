# Changelog

All notable changes to this project are documented here.

---

## [2.8.0] — May 2026

### Added

- **Personal popcorn ratings** — 🍿 rating (1–5) beside the show title; inactive slots shown greyed on dark theme
- **My Shows rating filter** — Filter by popcorn count, top ratings (4–5), rated/unrated; sort by **My rating**
- **Popcorn badges** — Filled 🍿 on collection posters when rated
- **Statistics: Your take** — Rated shows, average score, tier breakdown, top-rated list
- **Multiple lists** — Create, rename, and delete lists on Profile; default **Collection** list on signup
- **List filter on Home** — Dropdown in the watchlist toolbar to view another list’s active shows (non-completed)
- **List filter on My Shows** — Selector next to sort controls for the full collection on any list
- **List picker on collection cards** — ⋮ menu to add/remove a show on other lists (with membership cache preload)
- **Multi-list statistics** — “Your lists” section at the bottom of Statistics with per-list insight cards
- **Statistics cache** — `user_stats_cache` table and client cache layer for faster repeat visits
- **Web Push (PWA)** — Episode notifications when the daily sync detects new episodes for shows on **any** of your lists
- **Push API** — `getVapidPublicKey`, `savePushSubscription`, `removePushSubscription`; Profile enable/disable controls
- **Show & profile notes** — `show_notes` and `user_notes` with UI on the show page and Profile
- **Follow users** — Follow by email on Profile; view followed users’ stats (`#user` route, `getPublicUserStats`)
- **Theme picker** — Midnight, Ocean, Ember, and Forest palettes on Profile (Daylight theme removed)
- **Back button** — In-app navigation in the navbar (PWA-friendly history)
- **Display name** — Optional `display_name` on `users` for social stats
- **Faster library loads** — Home and My Shows watchlist/collection queries go direct to Supabase where possible

### Changed

- **Home watchlist** — Shows **active** (in-progress) items from the selected list; falls back to all list items if none are active
- **Statistics deep dive** — Main dashboard uses the **default collection** only; per-list breakdown moved to “Your lists”
- **Service worker** — Push and notification-click handlers; version bump for cache refresh
- **`getWatchlistData`** — No longer filters `is_completed` server-side; Home applies `activeOnly` on the client
- **Trakt sync** — After sync, library page caches reset so Home/My Shows reflect imported shows immediately
- **Navbar** — Only the top `<header>` is sticky; stats/profile subheaders no longer compete with dropdown z-index

### Fixed

- **New users after Trakt sync** — Stale `active_list_id` in localStorage could hide synced shows; `resolveActiveListId()` validates against real lists
- **My Shows list menu** — Single delegated click handler; no duplicate handlers blocking the ⋮ menu
- **Statistics page stacking** — Navbar Actions dropdown appears above stats content
- **Duplicate imports** — Cleaned up `myShows.js` module imports

### Documentation

- README and all `docs/` guides updated for 2.8.0 (lists, stats cache, push, migration notes)

---

## [2.7.0] — 2025

### Added
- **Profile page** — New dedicated page accessible from Actions dropdown with Trakt status, sync actions, and account management
- **Genre filter on My Shows** — Filter collection by genre using chip buttons
- **Normalized genres** — New `genres` and `show_genres` tables for proper relational genre data
- **Enhanced statistics** — Completion rate, average rating, shows finished, watch activity by day/month, top networks
- **App logo** — New brand logo in navbar and login page, PWA icons updated
- **Documentation** — Full project documentation (API, database, architecture, deployment, developer guide, user guide, changelog)

### Fixed
- **Daily auto-sync** — Changed schedule from weekly (Monday 5 AM) to daily (6 AM UTC)
- **Episode marking from modal** — Fixed silent failures when marking episodes from home page Episode Info modal
- **Last watched sorting** — Shows now correctly re-sort after marking an episode (updates `last_watched_at` on mark)
- **Unaired episode protection** — Disabled mark-as-watched buttons for episodes/seasons that haven't aired yet

### Changed
- **Navbar Actions dropdown** — Simplified to only Profile + Logout (all sync actions moved to Profile page)
- **Stats page** — Top genres and top shows now show top 5 (was top 3)
- **Genre statistics** — Preferentially uses normalized `show_genres` table data

---

## [2.6.0] — 2025

### Added
- **Auto-hide navbar** — Navbar hides on scroll down and reappears on scroll up
- **Responsive design polish** — Comprehensive mobile/tablet layout improvements across all pages
- **Recent searches** — Last 5 Discover queries saved and accessible with one click
- **Sync New Episodes button** — Manual trigger for episode sync from Profile

### Fixed
- **Trakt OAuth** — Per-user redirect URI storage for reliable token refresh
- **Episode sync** — Properly populates `first_aired` dates for episodes

### Changed
- **Watchlist cards** — Polished design with overview text, progress pill, and "X left" badge
- **Statistics dashboard** — Hero card, tile grid, and ranked lists with gradient badges
- **Discover page** — Pill search bar, trending/popular/anticipated carousels with scroll-snap
- **My Shows** — 2-column upcoming grid, section titles, poster-based collection cards
- **Episode modal** — Centered dialog on desktop, slide-up bottom sheet on mobile

---

## [2.5.0] — 2025

### Added
- **PWA support** — Web App Manifest, service worker, home screen installation
- **App shortcuts** — Quick access to Discover and My Shows from installed PWA

---

## [2.4.0] — 2025

### Added
- **Related shows** — Trakt recommendations displayed below seasons on show page
- **Trending/Popular/Anticipated** — Trakt curated lists on Discover page
- **Watchlist sort controls** — Sort by title, year, rating, last added, last watched, episodes left
- **Persistent preferences** — Sort order saved in localStorage

### Fixed
- **Trakt OAuth** — Switched to authorization code flow with automatic token refresh
- **Mark episodes** — Resolved errors with episode marking and progress calculation
- **Boot sequence** — Fixed TDZ (Temporal Dead Zone) error in initialization

---

## [2.3.0] — 2025

### Added
- **Automatic episode sync** — Weekly scheduled function checks for new episodes
- **Trakt token refresh** — Automatic OAuth token refresh (no manual re-auth needed)

### Changed
- **Project architecture** — Reorganized into api/, ui/, pages/, stores/, services/, utils/
- **Token management** — Centralized server-side Trakt token handling

---

## [2.0.0] — 2024

### Added
- **Supabase Auth** — Email/password authentication with JWT
- **Database backend** — Full PostgreSQL schema with RLS
- **Trakt sync** — Import shows and watch history from Trakt.tv
- **Statistics page** — Total watch time, episode counts, top genres/shows
- **My Shows** — Upcoming episodes and full collection view
- **Discover** — Show search with pagination
- **Episode modal** — Mark/unmark episodes with details view
- **Actions dropdown** — Trakt connect, sync, and refresh

### Changed
- **Complete rewrite** — From static frontend to full SPA with Supabase + Netlify backend

---

## [1.0.0] — 2024

### Added
- Initial release
- Basic show tracking UI
- Trakt.tv API integration
