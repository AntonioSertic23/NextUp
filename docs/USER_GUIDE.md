# User Guide

End-user documentation for NextUp **2.8.0**.

---

## Getting Started

### Registration

1. Open the app and click the **Register** tab
2. Enter your email and password
3. Click **Register**
4. A default list named **Collection** is created automatically

### Login

1. Enter your email and password
2. Click **Login**
3. Your session persists until you log out or it expires

---

## Pages

### Watchlist (Home)

Your main hub for shows you are **currently watching** on the selected list.

**List filter:**
- Use the **list dropdown** in the toolbar (next to sort controls) to switch lists
- Home shows **active** shows (`is_completed = false`). If a list has no active items, all shows on that list are shown

**Sorting:**
- **Sort by**: Last added, Title, Year, Rating, Last watched, Episodes left
- Toggle ascending/descending — saved automatically

**Cards:**
- Next episode overview (desktop), progress pill, “X left” badge
- Click a card for the **Episode Info** modal (mark watched, screenshot, air date)
- Unaired episodes cannot be marked

---

### My Shows

Two sections: **upcoming episodes** and **your collection**.

**List selector:**
- Choose which list’s collection to browse (dropdown near sort controls)

**Upcoming:**
- Future air dates with countdown (2-column grid on larger screens)

**Collection:**
- Poster grid for all shows on the selected list
- **Search** by title
- **Sort**: Last added, Title, Year (asc/desc)
- **Genre chips** to filter by genre
- **Rating** dropdown — filter by popcorn count (5–1), “5–4 popcorn”, rated/unrated
- **Sort** by **My rating** (most popcorn first)
- Small **popcorn icons** on posters for rated shows
- **⋮ menu** on each card — add or remove the show on other lists without opening the show page

Click any poster to open **Show Details**.

---

### Discover

Find new shows to watch.

**Search** with pagination; **Recent searches** (last 5) for one-click reuse.

**Curated carousels:** Trending, Popular, Most Anticipated.

Add shows from the **Show** page (collection / list controls).

---

### Statistics

Overview of your watching habits.

**Main dashboard** (top of page):
- Uses your **default Collection list** only
- Total watch time, episodes, shows, seasons, completion rate, ratings
- Charts: activity by day/month, top genres, top networks
- Top 5 genres and top 5 shows

**Your hype** (2.8+):
- How many shows you rated, average hype score, tier breakdown chart
- **Top of your queue** — links to your Peak/Love shows

**Your lists** (bottom section, 2.8+):
- One card per list you own with highlights for that list
- Data is cached server-side for faster reloads

**Following others:**
- From Profile, follow a user by email
- Open their stats from the following list (read-only)

---

### Show Details

**Header:** poster, metadata, overview, collection toggle.

**Lists:** bookmark/collection control; show can exist on multiple lists.

**Notes:** private per-show note (saved to your account).

**Your take (popcorn rating):**
- One minimal row: **5 popcorn icons** (tap to rate 1–5, like filling buckets)
- Label shows **Peak**, **Love**, **Solid**, etc. — not Trakt star scores
- **Clear** removes your rating; same score applies on every list

**Seasons & episodes:** mark episode or whole season (aired only); progress per season.

**Recommended shows** from Trakt below seasons.

---

### Profile

**Access:** Navbar → **Actions** → **Profile**

| Section | What you can do |
|---------|-----------------|
| **Account** | Email, member since |
| **Lists** | Create, rename, delete lists (default list cannot be deleted) |
| **Themes** | Midnight, Ocean, Ember, Forest |
| **Notes** | General profile note; list of your show notes |
| **Following** | Follow by email; unfollow; open friend stats |
| **Trakt** | Connect, full sync, sync new episodes |
| **App** | Enable/disable **episode notifications** (Web Push); refresh app |
| **Account (danger)** | Logout (also removes push subscription on this device) |

---

## Trakt.tv Integration

### Connecting

1. **Profile** → **Sign in to Trakt**
2. Authorize on Trakt.tv
3. You return to the app automatically

### Syncing watch history

1. **Profile** → **Sync with Trakt**
2. Wait (large libraries may take up to ~2 minutes)
3. Shows appear on your lists; open **Home** or **My Shows** — data refreshes after sync

### Syncing new episodes

- **Automatic:** daily at **6:00 AM UTC**
- **Manual:** **Profile** → **Sync New Episodes**

Updates episodes in the database and recalculates progress on your lists.

---

## Episode notifications (Web Push)

Get a notification on **this device** when the daily sync finds a **new episode** for a show on **any of your lists**.

### Requirements

- **HTTPS** (your Netlify URL, not plain localhost)
- **Installed PWA** recommended; on **iPhone**, add NextUp to the **Home Screen** first (iOS 16.4+)
- Server must have VAPID keys configured (hosting admin)

### Enable

1. **Profile** → **Enable episode notifications**
2. Allow notifications when the browser asks
3. Status text confirms success

### Disable

**Profile** → **Turn off notifications**

### What you receive

- Title/body with show name and episode info
- Tap notification → opens the **show page** in the app

Notifications are **per device** — enable on each phone/browser where you want alerts.

---

## Installing as App (PWA)

### Android (Chrome)

Menu → **Install app** or **Add to Home Screen**

### iOS (Safari)

**Share** → **Add to Home Screen** — required for reliable push on iPhone

### Desktop (Chrome/Edge)

Install icon in the address bar

**Note:** Install and push need **HTTPS** (production deploy).

---

## Tips

| Tip |
|-----|
| Rate favorites with **Tier V (Peak)** on the show page, then filter My Shows by hype |
| Use **list filter** on Home to focus one list at a time |
| Use **⋮ on My Shows** to organize shows across lists quickly |
| **Last watched** sort surfaces what you watched recently |
| **Your lists** on Statistics compares lists without changing the main overview |
| Enable push on the PWA install you actually use daily |
| After Trakt sync, use **Refresh App** if something looks stale |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't mark episode | Episode hasn't aired yet |
| Home empty after Trakt sync | Pick the right **list** in the dropdown; try **Refresh App** on Profile |
| Push not offered / fails | HTTPS + VAPID on server; iOS needs Home Screen PWA |
| No notification after new episode | Wait for daily sync or run **Sync New Episodes**; show must be on a list and notifications enabled |
| Statistics “Your lists” empty | Add shows to that list; open Statistics again to refresh cache |
| Trakt sync stuck | Wait up to 2 minutes, then refresh |
| PWA won't install | Use deployed HTTPS URL |
| Login fails | Check email/password (case-sensitive) |
