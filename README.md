# NextUp - Smart Show Tracker

![NextUp Project](img/nextup-project.png)

## Project Description

NextUp is a modern **TV show tracker** built with Vanilla JavaScript and Supabase. Track your watched episodes, explore shows, review seasons, and get detailed statistics — all in a **single-page application**. Optionally, link your Trakt.tv account to import existing shows and sync progress.

## Features

- **Watchlist / My Shows**: Browse your collection, sort by next episode, mark watched/unwatched.
- **Discover & Add Shows**: Search shows, explore new releases, add them to your collection.
- **Statistics Dashboard**: Visual overview of watched episodes, total watch time, top genres, and top shows.
- **Show Details & Episodes**: Episode modals with air dates, screenshots, and watch toggles.
- **Persistent Data**: Supabase handles all user-specific data with secure Row-Level Security (RLS).
- **Trakt.tv Sync**: Optionally link your Trakt account to import existing shows and sync progress.
- **Automatic Episode Sync**: A weekly scheduled function checks for new episodes across all tracked shows and updates the database automatically (seasons, episodes, and user progress).
- **Secure Token Management**: Trakt OAuth uses the authorization code flow with automatic token refresh — no manual re-authentication needed.

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6 modules), Single Page Application
- **Backend / Database**: Netlify Functions, Supabase
- **APIs**: Trakt.tv (show & episode data)
- **Deployment**: Netlify / Vercel-ready

  [![Skills](https://skillicons.dev/icons?i=html,css,js,supabase,netlify)](https://skillicons.dev)

## Quick Start

1. **Clone the repository**

   ```bash
   git clone git@github.com:AntonioSertic23/NextUp.git
   ```

2. **Set up environment variables**

   Create a `.env` file with your Trakt and Supabase credentials:

   ```sh
   TRAKT_CLIENT_ID="your_trakt_client_id_here"
   TRAKT_CLIENT_SECRET="your_trakt_client_secret_here"
   SUPABASE_URL="your_supabase_url"
   SUPABASE_ANON_KEY="your_supabase_anon_key"
   SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
   ```

   You can find both `TRAKT_CLIENT_ID` and `TRAKT_CLIENT_SECRET` in your Trakt application settings at https://trakt.tv/oauth/applications.

3. **Install dependencies**

   ```bash
   npm install
   npm install -g netlify-cli
   ```

4. **Run locally**

   ```bash
   netlify dev
   ```

5. **Open** the displayed localhost URL in your browser.

## Usage Overview

- **Watchlist / My Shows**: Browse your collection, sort by next episode, mark watched/unwatched.
- **Discover & Add Shows**: Search shows, explore new releases, add them to your collection.
- **Statistics Dashboard**: Visual overview of watched episodes, total watch time, top genres, and top shows.
- **Show Details & Episodes**: Episode modals with air dates, screenshots, and watch toggles.
- **Persistent Data**: Supabase handles all user-specific data securely.
- **Trakt.tv Sync**: Optional import of shows and progress from Trakt.tv; syncing is **explicitly triggered** by the user.
- **Sync New Episodes**: A scheduled Netlify function runs every Monday at 5:00 AM UTC to check all tracked shows for new episodes. It can also be triggered manually from the Actions dropdown ("Sync New Episodes"). When new episodes are found, the database is updated and user watchlist progress is recalculated automatically.

## Security & Privacy

- User authentication is handled via **Supabase Auth**; no passwords or sensitive PII are ever stored externally.
- Supabase RLS guarantees **user-specific data isolation**.
- All backend logic is **serverless and transparent**.
- Trakt sync is optional and **explicitly triggered**; it only imports show data and progress.
- Trakt OAuth tokens are stored server-side and automatically refreshed — the client never handles or transmits Trakt credentials.

## Author

**Antonio Sertić**

## License

MIT License
