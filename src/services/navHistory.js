/**
 * In-app navigation history for PWA (no browser back button).
 * Back is shown only on detail routes (show, user) when there is a prior page.
 */

const stack = [];
let skipNextPush = false;

const MAIN_ROUTES = new Set([
  "home",
  "myshows",
  "discover",
  "stats",
  "profile",
]);

const DETAIL_ROUTES = new Set(["show", "user"]);

function routeKey() {
  return location.hash.slice(1) || "home";
}

function routeName() {
  return routeKey().split("?")[0];
}

export function initNavHistory() {
  stack.length = 0;
  stack.push(routeKey());

  window.addEventListener("hashchange", () => {
    const key = routeKey();
    const name = routeName();

    if (skipNextPush) {
      skipNextPush = false;
    } else if (MAIN_ROUTES.has(name)) {
      stack.length = 0;
      stack.push(key);
    } else {
      const top = stack[stack.length - 1];
      if (key !== top) stack.push(key);
    }
    syncBackButton();
  });
}

export function canGoBack() {
  if (stack.length <= 1) return false;
  return DETAIL_ROUTES.has(routeName());
}

export function goBack() {
  if (stack.length <= 1) {
    location.hash = "home";
    return;
  }
  stack.pop();
  skipNextPush = true;
  location.hash = stack[stack.length - 1] || "home";
}

export function syncBackButton() {
  const btn = document.getElementById("nav-back-btn");
  if (!btn) return;
  const show = canGoBack();
  btn.hidden = !show;
  btn.setAttribute("aria-hidden", show ? "false" : "true");
}
