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

import { logout, setupAuthGuard } from "./services/auth.js";
import { handleTraktAuthRedirect } from "./api/sync.js";
import { isAuthenticated, initUserStore } from "./stores/userStore.js";
import { fetchUserLists } from "./api/lists.js";
import { setLists } from "./stores/listsStore.js";
import { updateActiveNav } from "./ui/navigation.js";
import { renderHome } from "./pages/home.js";
import { renderShow } from "./pages/show.js";
import { renderStats } from "./pages/stats.js";
import { renderDiscover } from "./pages/discover.js";
import { renderMyShows } from "./pages/myShows.js";
import { renderProfilePage } from "./pages/profile.js";
import { registerServiceWorker } from "./pwa/registerServiceWorker.js";
import { syncPushSubscriptionIfEnabled } from "./pwa/pushNotifications.js";
import { initTheme } from "./services/theme.js";
import { initNavHistory, goBack, syncBackButton } from "./services/navHistory.js";
import { renderUserStats } from "./pages/userStats.js";

initTheme();
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
  profile: renderProfilePage,
  user: renderUserStats,
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

  initNavHistory();
  initRouter();
  loadComponent("header", "/components/header.html");
  loadComponent("footer", "/components/footer.html");

  document.body.classList.add("authenticated");
  syncPushSubscriptionIfEnabled();
  fetchUserLists()
    .then((lists) => {
      if (lists?.length) setLists(lists);
    })
    .catch(() => {});
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
  const userId = params.get("userId");

  main.innerHTML = "";

  if (route === "user") {
    await routes.user(main, userId);
  } else if (routes[route]) {
    await routes[route](main, traktIdentifier);
  } else {
    main.innerHTML = "<p>404 - Page not found.</p>";
  }
}

function initRouter() {
  window.addEventListener("hashchange", () => {
    router();
    updateActiveNav();
    syncBackButton();
  });

  router();
  updateActiveNav();
  syncBackButton();
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
      if (e.target.closest(".dropdown-item")) {
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

  header
    .querySelector("#logout-btn")
    ?.addEventListener("click", () => logout());

  header.querySelector("#nav-back-btn")?.addEventListener("click", () => {
    goBack();
  });

  syncBackButton();
}
