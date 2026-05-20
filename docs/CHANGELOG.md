# Changelog

All notable changes to this project are documented here.

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
- **Sync New Episodes button** — Manual trigger for episode sync from Actions dropdown

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
