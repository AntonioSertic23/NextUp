# NextUp - Smart Show Tracker

NextUp is a modern Vanilla JavaScript app for tracking and managing your TV show collection with Trakt.tv. Mark watched episodes, review seasons, filter, sort, and explore detailed info — all seamlessly, on any device.

---

## Features

- **Persistent TV show collection** synced via Trakt.tv
- **Sort collection** by Title, Year, Rating, Last Watched, Date Added, or Episodes Left (ascending/descending)
- **Mark/unmark episodes and entire seasons** as watched, with instant UI & database update
- **Add/remove shows** from collection directly from show details page
- **Discover page** with search functionality and pagination to find new shows
- **My Shows page** showing collection sorted by time until next episode (with days and hours countdown)
- **Statistics page** displaying:
  - Total watch time breakdown (years/months/days/hours)
  - Total episodes watched across shows and seasons
  - Top 3 most watched genres
  - Top 3 most watched shows
- **Detailed episode modal** (air date, overview, screenshot, mark/unmark)
- **Next episode countdown** showing days and hours until next episode airs
- **Specials excluded** from all calculations and visibility across UI & backend
- **LocalStorage-powered cache** optimizes UX and minimizes API calls
- **Responsive UI** (single-page app) — no frameworks needed!
- **Login via Trakt OAuth** — secure and privacy-focused
- **Serverless backend via Netlify Functions** (proxies Trakt API and centralizes logic)
- **Supabase backend** with row-level security (RLS) for user-specific data
- **Trakt sync**: triggered by the user; adds or updates shows, seasons, and episodes in the database automatically

---

## About This Project

- Inspired by multiple modern TV tracking apps.
- Initial version focuses on full basic functionality; optimization and advanced customization are planned for later updates.
- AI-assisted development was used to expedite completion for personal use by the end of the year.

---

## Quick Start

1. **Clone the repository:**

   ```sh
   git clone git@github.com:AntonioSertic23/NextUp.git
   ```

2. **Configure environment variables:**

   Create a `.env` file with your Trakt Client ID:

   ```
   TRAKT_CLIENT_ID="your_trakt_client_id_here"
   SUPABASE_URL="your_supabase_url"
   SUPABASE_ANON_KEY="your_supabase_anon_key"
   SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
   ```

3. **Install dependencies:**

   ```sh
   npm install
   npm install -g netlify-cli
   ```

4. **Run locally:**

   ```sh
   netlify dev
   ```

5. **Open** the displayed localhost URL in your browser.

---

## Usage

- **Home page (Watchlist)**: Browse collection, sort by multiple criteria, open episode modals, click show cards for details.
- **My Shows**: Sorts shows by time until next episode airs; countdown is in days and hours.
- **Discover**: Search shows, paginate results, add shows to your collection.
- **Statistics**: Overview of total watch time, episodes watched, top genres, and top shows.
- **Show Detail**: Detailed info per show, mark episodes/seasons watched/unwatched, add/remove from collection.
- **Episode Modal**: View detailed episode info, air date, screenshots, mark/unmark directly.
- **Logout**: Securely log out from Trakt.

---

## Project Structure

```
nextup-show-tracker/
├── index.html               # Main HTML entry point
├── package.json             # Dependencies and scripts
├── css/
│   └── style.css            # All styling, including modal and sort controls
├── js/
│   ├── app.js               # SPA routing and main logic
│   ├── api.js               # Client API for Trakt (uses Netlify backend)
│   ├── auth.js              # Trakt OAuth authentication handling
│   ├── ui.js                # DOM helpers, rendering, and modal logic
│   └── pages/
│       ├── home.js          # Home page logic: sorting, rendering, events
│       ├── show.js          # Show details page and helpers
│       ├── stats.js         # Statistics page with watch time and top shows/genres
│       ├── discover.js      # Discover page with search and pagination
│       └── myShows.js       # My Shows page with next episode countdown
├── components/
│   ├── header.html          # Navigation header component
│   └── footer.html          # Footer component
└── netlify/functions/
    ├── getClientId.js       # Returns Trakt client ID for OAuth
    ├── getWatchlistData.js  #
    ├── getShowDetails.js    # Fetch detailed show information with seasons/episodes
    ├── getNextEpisodes.js   # Fetch next episode info for multiple shows
    ├── getEpisodeDetails.js # Fetch detailed episode information (air date, etc.)
    ├── searchShows.js       # Search for TV shows by name with pagination
    ├── manageCollection.js  # Add/remove shows from user's collection
    └── markEpisodes.js       # Mark/unmark episodes proxy endpoint
```

---

## Backend (Netlify Functions)

- **getClientId.js**: Returns Trakt client ID for OAuth authentication flow.
- **getCollection.js**: Fetches the user's collection, seasons, and watched progress; removes specials; supports bulk fetch; caches results for frontend efficiency.
- **getShowDetails.js**: Fetch detailed show information including seasons, episodes, and watched status.
- **getNextEpisodes.js**: Fetch next episode information for multiple shows using Trakt's `/shows/{id}/next_episode` endpoint.
- **getEpisodeDetails.js**: Fetch detailed episode information including air date, screenshots, overview.
- **searchShows.js**: Search for TV shows by name with pagination support.
- **manageCollection.js**: Add/remove shows from user's Trakt collection.
- **markEpisodes.js**: Mark/unmark single episodes; sync with Trakt and database.

---

## Tech Stack

- HTML5 + CSS3 (+ responsive styles)
- Vanilla JS (ES6 modules)
- Trakt.tv API (OAuth, all main endpoints)
- Netlify Functions (serverless backend/API proxy)
- Supabase (database + RLS for user-specific data)
- LocalStorage (caching)
- Deployed: Netlify/Vercel-ready

---

## Security & Privacy

- Uses your Trakt OAuth token for all actions; no credentials or PII are ever stored.
- All backend logic is serverless, source-available, and transparent.
- Supabase Row-Level Security ensures users can only access their own data.
- Trakt sync is triggered explicitly by the user; backend writes are scoped to the authenticated user.

---

## Author

Antonio Sertić

MIT License
