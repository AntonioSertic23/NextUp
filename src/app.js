import { logout, getToken } from "./services/auth.js";
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

await handleTraktAuthRedirect();

await initUserStore();

async function initAuth() {
  const authenticated = isAuthenticated();

  if (!authenticated) {
    if (!window.location.pathname.includes("login.html")) {
      window.location.href = "/login.html";
      return;
    }
  } else {
    if (window.location.pathname.includes("login.html")) {
      window.location.href = "/";
      return;
    }
    console.log("User logged in.");
    initRouter();
  }
}

initAuth();

const routes = {
  home: renderHome,
  show: renderShow,
  stats: renderStats,
  discover: renderDiscover,
  myshows: renderMyShows,
};

/**
 * Router - Loads the correct page based on hash route.
 */
async function router() {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    window.location.href = "/login.html";
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

  window.addEventListener("load", () => {
    router();
    updateActiveNav();
  });

  router();
  updateActiveNav();
}

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

  if (selector === "header") {
    const dropdown = container.querySelector(".dropdown");
    const dropdownToggle = container.querySelector("#dropdown-toggle");
    const dropdownMenu = container.querySelector("#dropdown-menu");

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

    const traktConnectBtn = container.querySelector("#trakt-connect-btn");
    const traktSyncBtn = container.querySelector("#trakt-sync-btn");

    const token = await getToken();

    if (!!token) {
      if (traktConnectBtn) traktConnectBtn.style.display = "none";
      if (traktSyncBtn) traktSyncBtn.style.display = "block";
    } else {
      if (traktConnectBtn) traktConnectBtn.style.display = "block";
      if (traktSyncBtn) traktSyncBtn.style.display = "none";
    }

    const logoutBtn = container.querySelector("#logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => logout());
    }

    const refreshBtn = container.querySelector("#refresh-btn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        window.location.reload();
      });
    }

    if (traktConnectBtn) {
      traktConnectBtn.addEventListener("click", () => {
        connectTraktAccount();
      });
    }

    if (traktSyncBtn) {
      traktSyncBtn.addEventListener("click", async () => {
        try {
          await syncTraktAccount(token);
          alert("Sync successful!");
        } catch (error) {
          alert(error.message);
        }
      });
    }
  }
}

loadComponent("header", "/components/header.html");
loadComponent("footer", "/components/footer.html");
