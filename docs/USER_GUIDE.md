# User Guide

---

## Getting Started

### Registration

1. Open the app and click the **Register** tab
2. Enter your email and password
3. Click **Register**
4. You're in! A default collection is created automatically

### Login

1. Enter your email and password
2. Click **Login**
3. Your session persists until you log out or it expires

---

## Pages

### Watchlist (Home)

Your main hub — shows you're currently watching with progress tracking.

**Features:**
- See your next episode for each show
- Progress bar showing episodes watched vs total
- "X left" badge showing remaining episodes
- Episode overview text (on desktop)

**Sorting:**
- Click **Sort by** to change order
- Options: Last added, Title, Year, Rating, Last watched, Episodes left
- Toggle ascending/descending with the arrow button
- Your preference is saved automatically

**Episode Info Modal:**
- Click any show card to open the episode modal
- See episode title, air date, overview, and screenshot
- Click **Mark as watched** to progress to the next episode
- Episodes that haven't aired yet cannot be marked

---

### My Shows

Two sections: upcoming episodes and your full collection.

**Upcoming Episodes:**
- Shows episodes airing in the future
- Includes show title, episode info, air date, and countdown
- 2-column grid layout

**Collection:**
- All shows you've added to your list
- **Search**: Type to filter by title
- **Sort**: Last added, Title, or Year
- **Genre filter**: Click genre chips to filter by genre
- Click any poster to open the show details

---

### Discover

Find new shows to watch.

**Search:**
- Type a show name and press Enter or click search
- Results show with pagination
- **Recent searches**: Your last 5 searches appear below for quick access

**Curated Lists:**
- **Trending**: Currently most watched shows
- **Popular**: All-time most popular
- **Most Anticipated**: Upcoming shows with most buzz
- Scroll horizontally through carousels

---

### Statistics

Visual overview of your watching habits.

**Overview tiles:**
- Total watch time (hours/days)
- Episodes watched
- Shows tracked
- Seasons completed
- Completion rate
- Average show rating
- Shows finished

**Charts:**
- Watch activity by day of week
- Recent monthly activity
- Top genres (bar chart)
- Top networks (ranked list)

**Top lists:**
- Top 5 genres
- Top 5 shows (by episodes watched)

---

### Show Details

Full information about a specific show.

**Header:**
- Poster, title, year, network, status, rating
- Overview/synopsis
- **Add to Collection** / **Remove from Collection** button

**Seasons & Episodes:**
- Expand seasons to see all episodes
- Episode progress percentage per season
- **Mark episode**: Click the checkmark icon
- **Mark season**: Marks all aired, unwatched episodes in that season
- Disabled buttons for episodes/seasons not yet aired

**Recommended Shows:**
- Related shows from Trakt displayed below seasons

---

### Profile

Manage your account and app actions.

**Access:** Click "Actions" dropdown → "Profile" in the navbar.

**Sections:**
- **Account info**: Email, member since date
- **Trakt Integration**: Connection status + sync actions
- **App**: Refresh (reload page)
- **Account**: Logout

---

## Trakt.tv Integration

### Connecting

1. Go to the **Profile** page
2. Click **Sign in to Trakt**
3. You'll be redirected to Trakt.tv to authorize
4. After authorizing, you're redirected back automatically

### Syncing Watch History

1. Go to **Profile** → click **Sync with Trakt**
2. Wait for sync to complete (may take up to 2 minutes for large libraries)
3. All your watched shows and progress will be imported

### Syncing New Episodes

- **Automatic**: Runs daily at 6:00 AM UTC
- **Manual**: Go to **Profile** → click **Sync New Episodes**

This checks all your tracked shows for newly aired episodes and updates your watchlist.

---

## Installing as App (PWA)

NextUp can be installed on your phone or computer like a native app.

### Android (Chrome):
1. Open the app in Chrome
2. Tap the menu (⋮) → "Install app" or "Add to Home Screen"
3. The app appears on your home screen

### iOS (Safari):
1. Open the app in Safari
2. Tap Share (↑) → "Add to Home Screen"
3. Tap "Add"

### Desktop (Chrome/Edge):
1. Look for the install icon (⊕) in the address bar
2. Click "Install"

**Note:** PWA installation requires HTTPS (works on the deployed Netlify URL, not localhost).

---

## Tips & Tricks

| Tip |
|-----|
| Use "Last watched" sort to see what you watched most recently at the top |
| Click an episode in the watchlist to quickly mark it without opening the show page |
| Use genre chips on My Shows to filter by mood (e.g. only comedies) |
| Install as PWA for full-screen experience without browser UI |
| Statistics update automatically as you mark episodes |

---

## Troubleshooting

| Problem | Solution |
|---------|---------|
| Can't mark episode | Episode hasn't aired yet (check air date) |
| Watchlist not updating | Try refreshing the page (Profile → Refresh App) |
| Trakt sync stuck | Wait up to 2 minutes; if still stuck, refresh and try again |
| Show not found in search | Try alternative name or search by year |
| PWA won't install | Make sure you're on HTTPS (deployed URL) |
| Login fails | Check email/password; password is case-sensitive |
