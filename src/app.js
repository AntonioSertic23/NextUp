/**
 * @module app
 *
 * Application entry point — runs on every page load of index.html.
 *
 * Boot sequence:
 *   1. Initialize user store (reads Supabase session from localStorage)
 *   2. Handle Trakt OAuth redirect if present
 *   3. Auth guard: redirect unauthenticated users to /login.html
 *   4. Start auth state listener (session expiry, cross-tab sign-out)
 *   5. Initialize hash router
 *   6. Load header and footer components
 */

import { logout, getToken, setupAuthGuard } from "./services/auth.js";
import {
  handleTraktAuthRedirect,
  connectTraktAccount,
  syncTraktAccount,
} from "./api/sync.js";
import { isAuthenticated, initUserStore } from "./stores/userStore.js";
import { updateActiveNav } from "./ui/navigation.js";
import { renderHome } from "./pages/home.js";
import { renderShow } from "./pages/show.js";
import { renderStats } from "./pages/stats.js";
import { renderDiscover } from "./pages/discover.js";
import { renderMyShows } from "./pages/myShows.js";

// ————————————————————————————————————————————————————
// Route table (must be declared before boot sequence)
// ————————————————————————————————————————————————————

const routes = {
  home: renderHome,
  show: renderShow,
  stats: renderStats,
  discover: renderDiscover,
  myshows: renderMyShows,
};

// ————————————————————————————————————————————————————
// Boot sequence (top-level await)
// ————————————————————————————————————————————————————

await initUserStore();

await handleTraktAuthRedirect();

if (!isAuthenticated()) {
  window.location.replace("/login.html");
} else {
  setupAuthGuard();

  initRouter();
  loadComponent("header", "/components/header.html");
  loadComponent("footer", "/components/footer.html");

  document.body.classList.add("authenticated");
}

async function router() {
  if (!isAuthenticated()) {
    window.location.replace("/login.html");
    return;
  }

  const main = document.querySelector("main");
  const hash = location.hash.slice(1) || "home";

  const [route, queryString] = hash.split("?");
  const params = new URLSearchParams(queryString);
  const traktIdentifier = params.get("traktIdentifier");

  main.innerHTML = "";

  if (routes[route]) {
    await routes[route](main, traktIdentifier);
  } else {
    main.innerHTML = "<p>404 - Page not found.</p>";
  }
}

function initRouter() {
  window.addEventListener("hashchange", () => {
    router();
    updateActiveNav();
  });

  router();
  updateActiveNav();
}

// ————————————————————————————————————————————————————
// Component loader
// ————————————————————————————————————————————————————

async function loadComponent(selector, path) {
  const container = document.querySelector(selector);
  const res = await fetch(path);
  const html = await res.text();
  container.innerHTML = html;

  if (selector === "header") {
    setupHeaderActions(container);
  }
}

async function setupHeaderActions(header) {
  const dropdown = header.querySelector(".dropdown");
  const dropdownToggle = header.querySelector("#dropdown-toggle");
  const dropdownMenu = header.querySelector("#dropdown-menu");

  if (dropdownToggle && dropdownMenu) {
    dropdownToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove("active");
      }
    });

    dropdownMenu.addEventListener("click", (e) => {
      if (e.target.classList.contains("dropdown-item")) {
        dropdown.classList.remove("active");
      }
    });
  }

  const traktConnectBtn = header.querySelector("#trakt-connect-btn");
  const traktSyncBtn = header.querySelector("#trakt-sync-btn");
  const token = await getToken();

  if (token) {
    if (traktConnectBtn) traktConnectBtn.style.display = "none";
    if (traktSyncBtn) traktSyncBtn.style.display = "block";
  } else {
    if (traktConnectBtn) traktConnectBtn.style.display = "block";
    if (traktSyncBtn) traktSyncBtn.style.display = "none";
  }

  header
    .querySelector("#logout-btn")
    ?.addEventListener("click", () => logout());

  header.querySelector("#refresh-btn")?.addEventListener("click", () => {
    window.location.reload();
  });

  traktConnectBtn?.addEventListener("click", () => connectTraktAccount());

  traktSyncBtn?.addEventListener("click", async () => {
    try {
      await syncTraktAccount();
      alert("Sync successful!");
    } catch (error) {
      alert(error.message);
    }
  });
}
