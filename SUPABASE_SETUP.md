# Supabase Setup Guide

This guide explains how to set up Supabase for NextUp.

## Prerequisites

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project in Supabase

## Database Setup

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `db/migration.sql` into the SQL editor
4. Run the migration script

This will create:

- `users` — extends Supabase `auth.users` with Trakt OAuth fields (`trakt_token`, `trakt_refresh_token`, `trakt_token_expires_at`)
- `shows` — TV show metadata from Trakt
- `seasons` — season metadata per show
- `episodes` — episode metadata per season
- `user_episodes` — per-user watch progress (which episodes are watched)
- `lists` — user-created lists (each user gets a default "Collection" list)
- `list_shows` — shows added to lists, with progress tracking
- Row Level Security (RLS) policies for all tables
- Triggers for automatic user record creation and timestamp updates

### Migrating an existing database

If you already have the `users` table and need to add the Trakt token refresh columns:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS trakt_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trakt_token_expires_at TIMESTAMP WITH TIME ZONE;
```

**Important:** Passwords are NOT stored in the custom `users` table. Supabase Auth manages passwords (hashed and secured) in the built-in `auth.users` table. The custom `users` table only stores additional data like Trakt tokens. The `id` column references `auth.users(id)` via foreign key.

## Environment Variables

The app reads configuration from environment variables. For local development, create a `.env` file in the project root:

```sh
TRAKT_CLIENT_ID="your_trakt_client_id_here"
TRAKT_CLIENT_SECRET="your_trakt_client_secret_here"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your_supabase_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
```

| Variable | Where to find it | Used by |
|---|---|---|
| `SUPABASE_URL` | Supabase → Settings → API → Project URL | Client (via `getSupabaseConfig` function) |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API → Publishable key (or legacy anon key) | Client (via `getSupabaseConfig` function) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → Secret key (or legacy service_role key) | Server-side Netlify functions only |
| `TRAKT_CLIENT_ID` | [trakt.tv/oauth/applications](https://trakt.tv/oauth/applications) | Both client and server |
| `TRAKT_CLIENT_SECRET` | [trakt.tv/oauth/applications](https://trakt.tv/oauth/applications) | Server-side token exchange only |

For production, add these same variables in your Netlify dashboard: **Site settings → Environment variables**.

## Email Configuration (Optional)

By default, Supabase requires email verification. To disable this for development:

1. Go to **Authentication** → **Settings** in your Supabase dashboard
2. Under **Email Auth**, you can configure email templates and verification settings

## Connecting Trakt Account

NextUp uses Trakt's **OAuth 2.0 authorization code flow**:

1. The user clicks "Sign in to Trakt" in the Actions dropdown
2. The browser redirects to Trakt's authorization page
3. After the user authorizes, Trakt redirects back with a `?code=` query parameter
4. The client sends the code to the `traktAuth` Netlify function
5. The function exchanges the code for access + refresh tokens (using `TRAKT_CLIENT_SECRET`)
6. Tokens are saved to the `users` table (`trakt_token`, `trakt_refresh_token`, `trakt_token_expires_at`)

Tokens are automatically refreshed server-side when they expire — no manual re-authentication needed.

### Trakt Application Setup

Make sure your Trakt application (at [trakt.tv/oauth/applications](https://trakt.tv/oauth/applications)) has the correct **Redirect URI** set to your app's origin (e.g. `http://localhost:8888` for local dev, `https://your-site.netlify.app` for production).

## Security Notes

- The `SUPABASE_ANON_KEY` is safe to expose to the client (protected by RLS policies)
- `SUPABASE_SERVICE_ROLE_KEY` and `TRAKT_CLIENT_SECRET` must never be exposed to the client — they are only used in Netlify functions
- Never commit your `.env` file with real credentials to version control
