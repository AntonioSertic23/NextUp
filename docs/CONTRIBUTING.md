# Developer Guide

## Local Setup

### Requirements

- Node.js 18+
- npm 9+
- Netlify CLI (`npm install -g netlify-cli`)
- Supabase project (free tier works)
- Trakt.tv OAuth application

### Steps

```bash
# 1. Clone
git clone git@github.com:AntonioSertic23/NextUp.git
cd NextUp

# 2. Install dependencies
npm install
npm install -g netlify-cli

# 3. Create .env file (see SUPABASE_SETUP.md)
# TRAKT_*, SUPABASE_* required
# VAPID_* optional for Web Push testing

# 4. Set up database
# Run db/migration.sql in your Supabase SQL Editor

# 5. Run locally
netlify dev
# Opens at http://localhost:8888
```

**Important:** Set your Trakt OAuth "Redirect URI" to `http://localhost:8888` for local development.

---

## Project Structure

```
NextUp/
├── index.html              → Main SPA shell
├── login.html              → Auth page (separate from SPA)
├── css/style.css           → All styles (single file)
├── components/             → HTML fragments (loaded at runtime)
├── db/migration.sql        → Full database schema
├── docs/                   → Documentation
├── img/                    → Static images (logo, PWA icons)
├── src/
│   ├── app.js              → Entry point, router, push resync on login
│   ├── api/                → Supabase + Netlify fetch wrappers (incl. ratings.js)
│   ├── pages/              → home, show, discover, myShows, stats, profile, userStats
│   ├── ui/                 → Rendering (incl. listFilter.js, statistics.js)
│   ├── stores/             → user, watchlist, myShows, lists, stats, discover, …
│   ├── services/           → auth, supabase, theme, libraryCache, pageCache
│   ├── pwa/                → registerServiceWorker, pushNotifications
│   └── utils/              → format, stats, multiListStats, icons
└── netlify/
    ├── functions/          → Trakt, sync, push, followUser, …
    └── lib/                → supabase.js, trakt.js, webPush.js
```

---

## Code Conventions

### JavaScript

| Convention | Example |
|-----------|---------|
| ES Modules | `import { x } from "./module.js"` |
| camelCase for variables/functions | `getUserData()`, `watchlistStore` |
| PascalCase for classes (none used) | — |
| UPPER_CASE for constants | `const SUPABASE = await getClient()` |
| Async/await (no callbacks) | `const data = await fetchData()` |
| Template literals for HTML | `` `<div>${value}</div>` `` |
| Optional chaining | `user?.email` |
| Nullish coalescing | `value ?? "default"` |

### File naming

| Type | Convention | Example |
|------|-----------|---------|
| Pages | camelCase.js | `myShows.js` |
| UI modules | camelCase.js | `episodeModal.js` |
| Stores | camelCaseStore.js | `watchlistStore.js` |
| Netlify Functions | camelCase.js | `getShowDetails.js` |
| CSS | Single file: `style.css` | — |

### CSS

- Single `style.css` file (no preprocessor)
- BEM-inspired naming: `.section-element` (e.g. `.profile-action-btn`)
- Theme palettes via CSS variables set by `services/theme.js` (Midnight, Ocean, Ember, Forest)
- Mobile-first responsive with `@media (max-width: 768px)`
- Colors: dark backgrounds (`#15161b`, `#1a1b22`), white text, purple accents (`#857aff`, `#ef6bf3`)

### HTML

- Semantic elements where possible (`<nav>`, `<main>`, `<section>`)
- IDs for JavaScript hooks (`id="dropdown-toggle"`)
- Classes for styling (`.dropdown-item`)
- Accessibility: `aria-label`, `aria-expanded` on interactive elements

---

## Adding a New Page

### 1. Create page renderer

```javascript
// src/pages/newPage.js
import { renderNewPageUI } from "../ui/newPage.js";

export async function renderNewPage(main) {
  const container = document.createElement("div");
  container.id = "new-page-container";
  container.innerHTML = "<p class='loading-text'>Loading...</p>";
  main.appendChild(container);

  await renderNewPageUI();
}
```

### 2. Create UI module

```javascript
// src/ui/newPage.js
export async function renderNewPageUI() {
  const container = document.getElementById("new-page-container");
  container.innerHTML = `<h1>New Page</h1>`;
}
```

### 3. Register route

```javascript
// src/app.js
import { renderNewPage } from "./pages/newPage.js";

const routes = {
  // ... existing routes
  newpage: renderNewPage,
};
```

### 4. Add navigation link

```html
<!-- components/header.html -->
<a href="#newpage" class="nav-link">New Page</a>
```

### 5. Add styles

Add a new section in `css/style.css`:
```css
/* ========================================================
   New Page Styles
   ======================================================== */
#new-page-container { ... }
```

---

## Adding a Netlify Function

### 1. Create function file

```javascript
// netlify/functions/myFunction.js
import { getAdminClient } from "../lib/supabase.js";

export default async function handler(req) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase.from("table").select("*");

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
```

### 2. Call from client

```javascript
// src/api/myModule.js
import { getSession } from "../stores/userStore.js";

export async function myApiCall() {
  const { access_token } = getSession();
  const res = await fetch("/.netlify/functions/myFunction", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  return res.json();
}
```

---

## State Management Pattern

Stores are simple in-memory singletons:

```javascript
// src/stores/exampleStore.js
let items = [];
let sortBy = "title";

export function setItems(newItems) { items = newItems; }
export function getItems() { return items; }
export function setSortBy(value) { sortBy = value; }
export function getSortBy() { return sortBy; }
```

Rules:
- One store per page/domain
- Stores are populated once per page visit
- Stores are NOT cleared between navigations (cached)
- localStorage used only for user preferences (sort, filters)

---

## Git Workflow

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code |
| `release/X.Y.Z` | Release preparation |
| `feature/name` | New features |
| `fix/name` | Bug fixes |

### Commit message convention

```
type(scope): description

feat(stats): add watch activity charts
fix(sync): wire Sync New Episodes button
style(discover): redesigned page layout
refactor: reorganize project architecture
docs: update README with new features
chore: bump version to 2.5.0
```

Types: `feat`, `fix`, `style`, `refactor`, `docs`, `chore`, `perf`, `test`

---

## Testing Locally

There is no automated test suite. Manual testing checklist (2.8+):

1. **Auth:** Register → Login → Logout → Session persistence
2. **Lists:** Create/rename/delete on Profile → filter Home & My Shows → ⋮ menu on collection cards
3. **Watchlist:** Active-only on Home → Sort → Mark episode from modal → progress updates
4. **Trakt:** Connect → Sync → shows visible on correct list (refresh if needed)
5. **Show details:** Seasons, notes, multi-list collection toggle
6. **Discover:** Search, pagination, carousels
7. **My Shows:** List selector, upcoming, genre + hype filter, sort by hype, badges
8. **Show page:** Hype meter save/clear, reload My Shows filter
9. **Statistics:** “Your hype” section after rating shows
10. **Statistics:** Default-list overview → “Your hype” → “Your lists” cards
11. **Social:** Follow by email → open `#user` stats
12. **Profile:** Themes, notes, sync new episodes
13. **Push (HTTPS + VAPID):** Enable on Profile → row in `push_subscriptions`
14. **Mobile / PWA:** Navbar, back button, install
