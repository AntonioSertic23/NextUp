/**
 * NextUp service worker — PWA installability, offline fallback, and Web Push.
 *
 * Caching: network-first for same-origin GET requests, with the cache as
 * the offline fallback. App code is plain ES modules (no bundle), so
 * serving them stale could mix old and new modules after a deploy.
 * API calls (Netlify functions, Supabase) and Trakt images are never cached.
 */

const SW_VERSION = "nextup-pwa-v2.11.1";
const CACHE_NAME = `nextup-shell-${SW_VERSION}`;
const OFFLINE_URL = "/offline.html";

const PRECACHE = [
  "/",
  "/index.html",
  "/login.html",
  OFFLINE_URL,
  "/css/style.css",
  "/css/RobotoVariable.woff2",
  "/components/header.html",
  "/components/footer.html",
  "/manifest.webmanifest",
  "/img/logo.webp",
  "/img/favicon-32.png",
  "/img/pwa-icon-192.png",
  "/img/down-arrow.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" }))),
      )
      .catch(() => {
        /* precache is best effort; runtime caching still fills it */
      }),
  );
  // First install: activate immediately. Updates wait for the in-app banner.
  if (!self.registration.active) {
    self.skipWaiting();
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("nextup-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Supabase JS is loaded as an ES module from this CDN (CORS-enabled).
const CACHEABLE_CDN = "https://cdn.jsdelivr.net";
const CDN_PACKAGES = ["@supabase/", "tslib@", "iceberg-js@"];

function isCacheable(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin === CACHEABLE_CDN) {
    return CDN_PACKAGES.some((pkg) => url.pathname.startsWith(`/npm/${pkg}`));
  }
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/.netlify/")) return false;
  return true;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok && (response.type === "basic" || response.type === "cors")) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request, { ignoreSearch: request.mode === "navigate" });
    if (cached) return cached;

    if (request.mode === "navigate") {
      const offline = await cache.match(OFFLINE_URL);
      if (offline) return offline;
    }
    return new Response("Offline", {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/plain" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  // Everything else (APIs, Trakt images) goes straight to the network.
  if (!isCacheable(event.request)) return;
  event.respondWith(networkFirst(event.request));
});

self.addEventListener("push", (event) => {
  let data = { title: "NextUp", body: "New episode available", url: "/#home" };
  try {
    data = { ...data, ...event.data?.json() };
  } catch {
    /* ignore malformed payload */
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "NextUp", {
      body: data.body || "",
      icon: "/img/pwa-icon-192.png",
      badge: "/img/pwa-icon-192.png",
      data: { url: data.url || "/#home" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/#home";
  const absolute = new URL(target, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (
            client.url.startsWith(self.location.origin) &&
            "focus" in client
          ) {
            client.navigate(absolute);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(absolute);
        }
      }),
  );
});
