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
  syncNewEpisodes,
} from "./api/sync.js";
import { isAuthenticated, initUserStore } from "./stores/userStore.js";
import { updateActiveNav } from "./ui/navigation.js";
import { renderHome } from "./pages/home.js";
import { renderShow } from "./pages/show.js";
import { renderStats } from "./pages/stats.js";
import { renderDiscover } from "./pages/discover.js";
import { renderMyShows } from "./pages/myShows.js";
import { registerServiceWorker } from "./pwa/registerServiceWorker.js";

registerServiceWorker();

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
    setupHeaderScrollBehavior(container);
  }
}

/**
 * Auto-hide the sticky header on scroll-down and bring it back on
 * scroll-up. Always keep it visible near the top of the page, while the
 * mobile menu is open, or while the Actions dropdown is open.
 */
function setupHeaderScrollBehavior(header) {
  const navbar = header.querySelector(".navbar");
  if (!navbar) return;

  const TOP_OFFSET = 80;
  const DELTA_THRESHOLD = 6;
  let lastY = Math.max(0, window.scrollY);
  let ticking = false;

  const isMenuOpen = () =>
    navbar.classList.contains("nav-open") ||
    !!header.querySelector(".dropdown.active");

  const updateHeader = () => {
    ticking = false;
    const currentY = Math.max(0, window.scrollY);
    const delta = currentY - lastY;

    if (currentY <= TOP_OFFSET || isMenuOpen()) {
      header.classList.remove("is-hidden");
      lastY = currentY;
      return;
    }

    if (Math.abs(delta) < DELTA_THRESHOLD) return;

    if (delta > 0) {
      header.classList.add("is-hidden");
    } else {
      header.classList.remove("is-hidden");
    }

    lastY = currentY;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      }
    },
    { passive: true },
  );

  // Always reveal the header after a route change so navigation feels reliable
  window.addEventListener("hashchange", () => {
    header.classList.remove("is-hidden");
    lastY = Math.max(0, window.scrollY);
  });
}

async function setupHeaderActions(header) {
  // Highlight the current route now that the navbar is in the DOM
  // (the initial call in initRouter() runs before the header HTML is fetched).
  updateActiveNav();

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

  const navbar = header.querySelector(".navbar");
  const navToggle = header.querySelector("#nav-toggle");
  const navCenter = header.querySelector("#nav-center");

  if (navbar && navToggle && navCenter) {
    const closeMobileNav = () => {
      navbar.classList.remove("nav-open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Open navigation menu");
    };

    const openMobileNav = () => {
      navbar.classList.add("nav-open");
      navToggle.setAttribute("aria-expanded", "true");
      navToggle.setAttribute("aria-label", "Close navigation menu");
    };

    navToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      if (navbar.classList.contains("nav-open")) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    });

    navCenter.addEventListener("click", (e) => {
      if (e.target.classList.contains("nav-link")) {
        closeMobileNav();
      }
    });

    document.addEventListener("click", (e) => {
      if (!navbar.contains(e.target)) {
        closeMobileNav();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && navbar.classList.contains("nav-open")) {
        closeMobileNav();
        navToggle.focus();
      }
    });

    // Auto-close when resizing back to desktop layout
    const desktopMq = window.matchMedia("(min-width: 769px)");
    const handleViewportChange = (event) => {
      if (event.matches) closeMobileNav();
    };
    if (desktopMq.addEventListener) {
      desktopMq.addEventListener("change", handleViewportChange);
    } else if (desktopMq.addListener) {
      desktopMq.addListener(handleViewportChange);
    }
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
    traktSyncBtn.disabled = true;
    const origText = traktSyncBtn.textContent;
    traktSyncBtn.textContent = "Syncing…";

    try {
      const result = await syncTraktAccount();
      let msg = result?.message || "Sync completed";
      if (result?.errors?.length) {
        msg += "\n\nErrors:\n" + result.errors.join("\n");
      }
      alert(msg);
    } catch (error) {
      alert(error.message);
    } finally {
      traktSyncBtn.disabled = false;
      traktSyncBtn.textContent = origText;
    }
  });

  const syncEpisodesBtn = header.querySelector("#sync-episodes-btn");

  syncEpisodesBtn?.addEventListener("click", async () => {
    const labelSpan = syncEpisodesBtn.querySelector(
      "span:not(.dropdown-icon)",
    );
    const origLabel = labelSpan?.textContent ?? "";

    syncEpisodesBtn.disabled = true;
    if (labelSpan) labelSpan.textContent = "Syncing…";

    try {
      const result = await syncNewEpisodes();
      const updated = result?.updated?.length ?? 0;
      const skipped = result?.skipped?.length ?? 0;
      const errors = result?.errors ?? [];

      let msg = result?.message || "Episode sync completed";
      msg += `\n\nUpdated: ${updated}\nSkipped: ${skipped}`;
      if (errors.length) {
        msg +=
          "\n\nErrors:\n" +
          errors
            .map((e) => (typeof e === "string" ? e : `${e.show}: ${e.error}`))
            .join("\n");
      }
      alert(msg);
    } catch (error) {
      alert(error.message);
    } finally {
      syncEpisodesBtn.disabled = false;
      if (labelSpan) labelSpan.textContent = origLabel;
    }
  });
}
