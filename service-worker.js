const CACHE_NAME = "rivayat-shell-2026-08-24-v3";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/storefront.css",
  "/catalog.js",
  "/manifest.webmanifest",
  "/assets/branding/rivayat-logo.png",
  "/assets/branding/rivayat-logo.webp",
  "/assets/branding/rivayat-favicon-96.png",
  "/assets/branding/rivayat-apple-touch.png",
  "/assets/branding/rivayat-icon-192.png",
  "/assets/branding/rivayat-icon-512.png",
  "/assets/storefront/categories/men.png",
  "/assets/storefront/categories/women.png"
];
const API_PREFIXES = [
  "/api", "/health", "/login", "/signup", "/auth/", "/profile", "/forgot-password",
  "/reset-password", "/settings/", "/products", "/search", "/coupons", "/orders", "/returns",
  "/users", "/reviews", "/newsletter", "/referrals", "/admin/", "/delivery/", "/pincode/",
  "/bugs", "/credits", "/telegram/", "/notifications", "/legal/secret"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => Promise.allSettled(CORE_ASSETS.map((asset) => cache.add(asset)))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("push", (event) => {
  let payload = { title: "RIVAYAT", body: "There is a fresh update in your account.", url: "/#/dashboard/notifications" };
  try { payload = { ...payload, ...(event.data ? event.data.json() : {}) }; } catch { /* use the safe fallback */ }
  event.waitUntil(self.registration.showNotification(String(payload.title || "RIVAYAT"), {
    body: String(payload.body || "There is a fresh update in your account."),
    icon: "/assets/branding/rivayat-icon-192.png",
    badge: "/assets/branding/rivayat-favicon-96.png",
    tag: String(payload.tag || "rivayat-update"),
    data: { url: String(payload.url || "/#/dashboard/notifications") }
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = event.notification.data?.url || "/#/dashboard/notifications";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      if ("focus" in client) {
        client.navigate(destination);
        return client.focus();
      }
    }
    return self.clients.openWindow(destination);
  }));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (API_PREFIXES.some((prefix) => url.pathname === prefix || url.pathname.startsWith(prefix))) {
    event.respondWith(fetch(request));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match("/"))));
    return;
  }
  if (request.destination === "image" || url.pathname.startsWith("/assets/")) {
    event.respondWith(caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        return response;
      });
      return cached || network;
    }));
    return;
  }
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
