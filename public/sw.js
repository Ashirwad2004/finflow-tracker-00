const CACHE_NAME = "finflow-static-v2";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/favicon.svg",
  "/placeholder.svg",
  "/robots.txt"
];

// Install Event: pre-caches the static shell resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching static shell");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event: cleans up older cache instances
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Clearing stale cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: intercepts network calls
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // We only intercept GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Handle client-side routing Navigation requests
  const isNavigationRequest = event.request.mode === "navigate";
  if (isNavigationRequest) {
    event.respondWith(
      fetch(event.request).catch(() => {
        console.log("[Service Worker] Serving index.html shell offline");
        return caches.match("/index.html") || caches.match("/");
      })
    );
    return;
  }

  const isSameOrigin = requestUrl.origin === self.location.origin;
  const isGoogleFont = requestUrl.hostname.includes("fonts.gstatic.com") || requestUrl.hostname.includes("fonts.googleapis.com");

  // Intercept Same Origin resources (like main.tsx, styles, and vite bundles) & Google Fonts
  if (isSameOrigin || isGoogleFont) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If response is valid, clone and save it dynamically in cache
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Serve from cache if offline
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback for missing offline files
            return new Response("Resource unavailable offline", {
              status: 503,
              statusText: "Offline",
              headers: new Headers({ "Content-Type": "text/plain" })
            });
          });
        })
    );
  }
});