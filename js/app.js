// ========================================================
// app.js - Main router, authentication, and component loader
// ========================================================

import { logout, getToken } from "./services/authService.js";
import {
  handleTraktAuthRedirect,
  connectTraktAccount,
  syncTraktAccount,
} from "./services/traktService.js";
import { isAuthenticated, initUserStore } from "./stores/userStore.js";
import { updateActiveNav } from "./ui.js";
import { renderHome } from "./pages/home.js";
import { renderShow } from "./pages/show.js";
import { renderStats } from "./pages/stats.js";
import { renderDiscover } from "./pages/discover.js";
import { renderMyShows } from "./pages/myShows.js";

// ========================================================
// AUTHENTICATION
// ========================================================

// Handle redirect from Trakt (for connecting Trakt account)
await handleTraktAuthRedirect();

await initUserStore();

// Check if user is logged in and redirect to login if not
async function initAuth() {
  const authenticated = isAuthenticated();

  if (!authenticated) {
    // Redirect to login page if not on login page already
    if (!window.location.pathname.includes("login.html")) {
      window.location.href = "/login.html";
      return;
    }
  } else {
    // If authenticated but on login page, redirect to home
    if (window.location.pathname.includes("login.html")) {
      window.location.href = "/";
      return;
    }
    console.log("User logged in.");
    // Initialize router if authenticated
    initRouter();
  }
}

initAuth();

// ========================================================
// ROUTER CONFIGURATION
// ========================================================

const routes = {
  home: renderHome,
  show: renderShow,
  stats: renderStats,
  discover: renderDiscover,
  myshows: renderMyShows,
};

/**
 * Router - Loads the correct page based on hash route.
 * Example: #show/123 → route='show', param='123'
 */
async function router() {
  // Check authentication before routing
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    window.location.href = "/login.html";
    return;
  }

  const main = document.querySelector("main");
  const hash = location.hash.slice(1) || "home";
  const [route, param] = hash.split("/");

  main.innerHTML = "";

  if (routes[route]) {
    await routes[route](main, param);
  } else {
    main.innerHTML = "<p>404 - Page not found.</p>";
  }
}

/**
 * Initialize router (only called after authentication)
 */
function initRouter() {
  // Update page and navbar on hash change
  window.addEventListener("hashchange", () => {
    router();
    updateActiveNav();
  });

  // Initial load
  window.addEventListener("load", () => {
    router();
    updateActiveNav();
  });

  // Initial route
  router();
  updateActiveNav();
}

// ========================================================
// COMPONENT LOADER
// ========================================================

/**
 * Dynamically loads HTML component into a given selector.
 * @param {string} selector - Target DOM selector
 * @param {string} path - Path to HTML component file
 */
async function loadComponent(selector, path) {
  const container = document.querySelector(selector);
  const res = await fetch(path);
  const html = await res.text();
  container.innerHTML = html;

  // After header loads, attach dropdown and action listeners
  if (selector === "header") {
    const dropdown = container.querySelector(".dropdown");
    const dropdownToggle = container.querySelector("#dropdown-toggle");
    const dropdownMenu = container.querySelector("#dropdown-menu");

    // Toggle dropdown on button click
    if (dropdownToggle && dropdownMenu) {
      dropdownToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("active");
      });

      // Close dropdown when clicking outside
      document.addEventListener("click", (e) => {
        if (!dropdown.contains(e.target)) {
          dropdown.classList.remove("active");
        }
      });

      // Close dropdown when clicking on menu item
      dropdownMenu.addEventListener("click", (e) => {
        if (e.target.classList.contains("dropdown-item")) {
          dropdown.classList.remove("active");
        }
      });
    }

    const traktConnectBtn = container.querySelector("#trakt-connect-btn");
    const traktSyncBtn = container.querySelector("#trakt-sync-btn");

    const token = await getToken();

    // Update Trakt options based on token status
    if (!!token) {
      // User has Trakt token - show "Sync with Trakt"
      if (traktConnectBtn) traktConnectBtn.style.display = "none";
      if (traktSyncBtn) traktSyncBtn.style.display = "block";
    } else {
      // User doesn't have Trakt token - show "Sign in to Trakt"
      if (traktConnectBtn) traktConnectBtn.style.display = "block";
      if (traktSyncBtn) traktSyncBtn.style.display = "none";
    }

    // Logout button
    const logoutBtn = container.querySelector("#logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => logout());
    }

    // Refresh button
    const refreshBtn = container.querySelector("#refresh-btn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        window.location.reload();
      });
    }

    // Trakt connect button
    if (traktConnectBtn) {
      traktConnectBtn.addEventListener("click", () => {
        connectTraktAccount();
      });
    }

    // Trakt sync button
    if (traktSyncBtn) {
      traktSyncBtn.addEventListener("click", async () => {
        try {
          await syncTraktAccount(token);
          alert("Sync successful!");
        } catch (error) {
          alert(error.message);
        }
      });

      // TODO: Add a loading spinner, as the sync may take a while for large lists.
      // TODO: Add a confirmation modal when clicking sync, allowing the user to choose the sync direction
      //       (sync from database to Trakt, from Trakt to database, or only sync new items for existing shows).
    }
  }
}

// Load header and footer components
loadComponent("header", "/components/header.html");
loadComponent("footer", "/components/footer.html");
