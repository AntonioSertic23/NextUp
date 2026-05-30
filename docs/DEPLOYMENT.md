# Deployment Documentation

## Prerequisites

- [Netlify](https://netlify.com) account
- [Supabase](https://supabase.com) project
- [Trakt.tv](https://trakt.tv/oauth/applications) OAuth application

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TRAKT_CLIENT_ID` | Yes | Trakt OAuth app client ID |
| `TRAKT_CLIENT_SECRET` | Yes | Trakt OAuth app client secret |
| `SUPABASE_URL` | Yes | Supabase project URL (e.g. `https://xxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (admin access) |
| `TRAKT_REDIRECT_URI` | Optional | Fallback redirect URI for Trakt OAuth refresh |
| `VAPID_PUBLIC_KEY` | For push | Web Push public key (`npx web-push generate-vapid-keys`) |
| `VAPID_PRIVATE_KEY` | For push | Web Push private key (keep secret) |
| `VAPID_SUBJECT` | Optional | `mailto:you@domain.com` or site URL (defaults to `mailto:hello@nextup.app`) |

### Where to find them

**Trakt:**
1. Go to https://trakt.tv/oauth/applications
2. Create a new application (or use existing)
3. Set "Redirect URI" to your production URL (e.g. `https://nextup.netlify.app`)
4. Copy Client ID and Client Secret

**Supabase:**
1. Go to your Supabase project → Settings → API
2. Copy "Project URL" → `SUPABASE_URL`
3. Copy "anon public" key → `SUPABASE_ANON_KEY`
4. Copy "service_role" key → `SUPABASE_SERVICE_ROLE_KEY`

---

## Supabase Setup

### 1. Create project

Create a new Supabase project at https://supabase.com/dashboard.

### 2. Run migration

1. Open SQL Editor in Supabase Dashboard
2. Copy the entire contents of `db/migration.sql`
3. Execute the SQL

This creates all tables, triggers, RLS policies, and indexes.

### 3. Verify

After running migration, verify in Table Editor:
- Core: `users`, `shows`, `seasons`, `episodes`, `user_episodes`, `lists`, `list_shows`, `genres`, `show_genres`
- v2.8+: `show_notes`, `user_notes`, `user_follows`, `user_stats_cache`, `push_subscriptions`, `user_show_ratings`
- RLS enabled on all user tables (green shield icon)

**Upgrading an existing project:** run only the new SQL blocks at the end of `db/migration.sql` (see [Database](DATABASE.md#migration)).

---

## Netlify Setup

### 1. Connect repository

1. Go to https://app.netlify.com
2. "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Build settings are auto-detected from `netlify.toml`:
   - Publish directory: `.` (root)
   - Functions directory: `netlify/functions`

### 2. Set environment variables

In Netlify Dashboard → Site settings → Environment variables:

Add all required environment variables listed above (including VAPID keys if you enable Web Push).

Generate VAPID keys locally:

```bash
npx web-push generate-vapid-keys
```

Copy the public and private keys into Netlify (and your local `.env` for `netlify dev`). Re-run the latest `db/migration.sql` section for `push_subscriptions` in Supabase if upgrading an existing project.

### 3. Deploy

Push to main branch or trigger manual deploy.

---

## `netlify.toml` Configuration

```toml
[build]
  publish = "."
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"

[functions."syncTraktAccount"]
  timeout = 120

[functions."syncNextEpisodes"]
  timeout = 120
```

Key points:
- `publish = "."` — Static files served from root (no build step)
- `node_bundler = "esbuild"` — Fast function bundling
- Extended timeout (120s) for sync functions that process many shows

---

## Scheduled Functions

`syncNextEpisodes` runs automatically via cron schedule defined in the function's `config`:

```javascript
export const config = { schedule: "0 6 * * *" }; // Daily at 6:00 AM UTC
```

Netlify automatically detects and registers this schedule on deploy.

---

## Custom Domain

1. Netlify → Domain settings → Add custom domain
2. Configure DNS (CNAME or Netlify DNS)
3. Update Trakt OAuth "Redirect URI" to match new domain
4. SSL is automatic via Netlify

---

## Web Push setup (2.8+)

1. Generate keys: `npx web-push generate-vapid-keys`
2. Add `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` to Netlify env (and local `.env`)
3. Optional: `VAPID_SUBJECT=mailto:you@yourdomain.com`
4. Run the `push_subscriptions` section of `db/migration.sql` in Supabase
5. Deploy, then verify `/.netlify/functions/getVapidPublicKey` returns `{ "publicKey": "..." }`
6. On a device: Profile → Enable episode notifications → confirm row in `push_subscriptions`

If VAPID keys are missing, the app works normally; push controls show a configuration error.

---

## Production Checklist

- [ ] Trakt + Supabase env variables set in Netlify
- [ ] VAPID keys set (if using push)
- [ ] Supabase migration executed (including v2.8 tables)
- [ ] RLS enabled on all tables
- [ ] Trakt OAuth redirect URI matches production URL
- [ ] Custom domain configured (optional)
- [ ] HTTPS active
- [ ] Test login/register
- [ ] Test Trakt connect + sync (Home/My Shows show imported shows)
- [ ] Test list filter on Home and My Shows
- [ ] Test Statistics + “Your lists” section
- [ ] Test push subscribe (optional)
- [ ] Scheduled `syncNextEpisodes` visible in Netlify Functions

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|---------|
| Functions return 500 | Missing env vars | Check all env vars are set in Netlify |
| Trakt OAuth fails | Wrong redirect URI | Ensure Trakt app URI matches your domain |
| RLS blocks queries | Missing policies | Re-run migration SQL |
| Sync timeout | Too many shows | Already set to 120s max; reduce batch if needed |
| PWA not installing | Not HTTPS | Deploy to Netlify (auto SSL) |
| Service worker stale | Cached old version | Hard refresh (Ctrl+Shift+R) or clear site data |
| Push 503 | No VAPID keys | Set `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` and redeploy |
| Push subscribe fails | HTTP localhost | Test on HTTPS deploy; iOS needs Home Screen PWA |
