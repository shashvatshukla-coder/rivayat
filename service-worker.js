const CACHE_NAME = "rivayat-shell-2026-08-24-v2";
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
  "/bugs", "/credits", "/telegram/"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => Promise.allSettled(CORE_ASSETS.map((asset) => cache.add(asset)))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
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
