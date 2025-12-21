# NextUp - Smart Show Tracker

NextUp is a modern Vanilla JavaScript app for tracking and managing your TV show collection with Trakt.tv. Mark watched episodes, review seasons, filter, sort, and explore detailed info — all seamlessly, on any device.

---

## Features

- Persistent TV show collection synced via Trakt.tv
- Sort collection by Title, Year, Rating, Last Updated, Date Added, or Episodes Left (ascending/descending)
- Mark/unmark episodes and entire seasons as watched, with instant UI & local cache update
- View stats (total shows, watched/left, ratings) and next episodes
- Detailed episode modal (with air date, overview, screenshot, mark/unmark)
- Remove "Specials" from all calculations and visibility across UI & backend
- LocalStorage-powered cache optimizes UX and minimizes API calls
- Responsive UI (single page app) — no frameworks needed!
- Login via Trakt OAuth — secure and privacy-focused
- Serverless backend via Netlify Functions (proxies Trakt and centralizes logic)
- Built for modern browsers, deployable on Netlify/Vercel

---

## About This Project

- This project is inspired by several other similar applications.

- For the first version, it was decided to include all basic functionalities; optimization and customization will be addressed later.

- Due to the urgency of getting the application built and ready to use for personal needs, the decision was made to use AI assistance to complete it by the end of the year, rather than spending another half year building it myself.

---

## Quick Start

1. **Clone the repository:**

   ```sh
   git clone git@github.com:AntonioSertic23/NextUp.git
   ```

2. **Configure Trakt API keys:**

   Create a `.env` file and add your Trakt Client ID:

   ```
   TRAKT_CLIENT_ID="your_trakt_client_id_here"
   ```

3. **Install dependencies:**

   ```sh
   npm install
   ```

4. **Run locally:**

   ```sh
   netlify dev
   ```

5. **Open** the shown localhost URL in your browser.

---

## Usage

- **Home page**: Browse your collection with flexible sorting; open modal for episode details; click show card for more details.
- **Modal**: See episode info, screenshots, and mark/unmark directly.
- **Show Detail**: Mark episodes or entire season as watched/unwatched with a single click — UI instantly updates.
- **Stats/Upcoming**: Side routes for quick stats and a calendar of upcoming episodes (if implemented).
- **Logout**: Log out from Trakt securely via the top-right menu.

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
│   ├── local_storage.js     # LocalStorage cache management
│   └── pages/
│       ├── home.js          # Home page logic: sorting, rendering, events
│       ├── show.js          # Show details page and helpers
│       └── stats.js         # Statistics page
├── components/
│   ├── header.html          # Navigation header component
│   └── footer.html          # Footer component
└── netlify/functions/
    ├── getClientId.js       # Returns Trakt client ID for OAuth
    ├── getCollection.js     # Serverless backend, bulk data enrichment, filtering
    └── markEpisode.js       # Mark/unmark episodes proxy endpoint
```

---

## Backend (Netlify Functions)

- **getClientId.js**: Returns Trakt client ID for OAuth authentication flow
- **getCollection.js**: Fetches and merges collection, watched data, and seasons; enriches client cache; removes specials; supports efficient bulk fetch
- **markEpisode.js**: Mark/unmark single episodes via Trakt sync/history endpoints
- _Removed legacy code for per-show progress and watchlist in favor of scalable collection logic._

---

## Tech Stack

- HTML5 + CSS3 (+ responsive styles)
- Vanilla JS (ES6 modules)
- Trakt.tv API (OAuth, all main endpoints)
- Netlify Functions (backendless API proxy)
- LocalStorage (caching)
- Deployed: Netlify/Vercel-ready

---

## Security & Privacy

- Uses your Trakt OAuth token for all actions; no credentials/PII ever stored by the project
- All backend logic is serverless, source-available, and transparent

---

## Author

Antonio Sertić

MIT License
