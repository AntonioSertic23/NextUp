// ========================================================
// app.js - Main router, authentication, and component loader
// ========================================================

import { handleTraktAuthRedirect, logout, isAuthenticated } from "./auth.js";
import { clearCache } from "./local_storage.js";
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
handleTraktAuthRedirect();

// Check if user is logged in and redirect to login if not
(async function initAuth() {
  const authenticated = await isAuthenticated();
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
})();

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

  // After header loads, attach logout button listener
  if (selector === "header") {
    const logoutBtn = container.querySelector("#logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => logout());
    }

    const refreshBtn = container.querySelector("#refresh-btn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        clearCache();
        window.location.reload();
      });
    }
  }
}

// Load header and footer components
loadComponent("header", "/components/header.html");
loadComponent("footer", "/components/footer.html");
