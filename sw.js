/**
 * NextUp service worker — PWA installability, network-first fetch, and Web Push.
 */

const SW_VERSION = "nextup-pwa-v2.8.1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response("Offline", {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Content-Type": "text/plain" },
      });
    }),
  );
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
