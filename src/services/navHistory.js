/**
 * In-app navigation history for PWA (no browser back button).
 */

const stack = [];
let skipNextPush = false;

function routeKey() {
  return location.hash.slice(1) || "home";
}

export function initNavHistory() {
  stack.length = 0;
  stack.push(routeKey());

  window.addEventListener("hashchange", () => {
    const key = routeKey();
    if (skipNextPush) {
      skipNextPush = false;
    } else {
      const top = stack[stack.length - 1];
      if (key !== top) stack.push(key);
    }
    syncBackButton();
  });
}

export function canGoBack() {
  return stack.length > 1;
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
