/**
 * Registers the root service worker so the app meets PWA install criteria
 * (manifest + SW). Network-first behavior is implemented in sw.js.
 */
import { showUpdateBanner } from "./updateBanner.js";

const UPDATE_CHECK_MS = 60 * 60 * 1000;

let refreshing = false;

function applyUpdate(registration) {
  refreshing = true;
  if (registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
    return;
  }
  window.location.reload();
}

function promptForUpdate(registration) {
  showUpdateBanner(() => applyUpdate(registration));
}

function watchForUpdates(registration) {
  if (registration.waiting && navigator.serviceWorker.controller) {
    promptForUpdate(registration);
  }

  registration.addEventListener("updatefound", () => {
    const worker = registration.installing;
    if (!worker) return;

    worker.addEventListener("statechange", () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller) {
        promptForUpdate(registration);
      }
    });
  });
}

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        watchForUpdates(registration);
        setInterval(() => registration.update(), UPDATE_CHECK_MS);
      })
      .catch(() => {
        /* ignore — e.g. localhost without HTTPS in some setups */
      });
  });
}
