/**
 * Registers the root service worker so the app meets PWA install criteria
 * (manifest + SW). Network-first behavior is implemented in sw.js.
 */
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        /* ignore — e.g. localhost without HTTPS in some setups */
      });
  });
}
