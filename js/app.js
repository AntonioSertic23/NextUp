// ========================================================
// app.js - Main router and component loader
// ========================================================

import { renderHome } from "./pages/home.js";
import { renderShow } from "./pages/show.js";
import { renderStats } from "./pages/stats.js";
import { renderUpcoming } from "./pages/upcoming.js";
import { updateActiveNav } from "./ui.js";

// Define routes: mapping of hash routes to rendering functions
const routes = {
  home: renderHome,
  show: renderShow,
  stats: renderStats,
  upcoming: renderUpcoming,
};

/**
 * Router function - loads the correct page based on URL hash
 * @returns {Promise<void>}
 */
async function router() {
  const main = document.querySelector("main");
  const hash = location.hash.slice(1) || "home"; // Default to 'home'
  const [route, param] = hash.split("/"); // e.g., 'show/123' -> route='show', param='123'

  main.innerHTML = "";
  if (routes[route]) {
    await routes[route](main, param); // Call page render function with main container and optional param
  } else {
    main.innerHTML = "<p>404 - Page not found.</p>";
  }
}

// Update page and active navbar on hash change
window.addEventListener("hashchange", () => {
  router();
  updateActiveNav();
});

// Initial page load
window.addEventListener("load", () => {
  router();
  updateActiveNav();
});

/**
 * Dynamically load HTML components into a selector
 * @param {string} selector - DOM selector where component will be inserted
 * @param {string} path - Path to the HTML component file
 * @returns {Promise<void>}
 */
async function loadComponent(selector, path) {
  const container = document.querySelector(selector);
  const res = await fetch(path);
  const html = await res.text();
  container.innerHTML = html;
}

// Load header and footer components
loadComponent("header", "/components/header.html");
loadComponent("footer", "/components/footer.html");
