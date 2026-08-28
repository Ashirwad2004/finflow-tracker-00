const CACHE_NAME = "rupeebill-v4";

const STATIC_FILES = [
  "/",
  "/index.html",
  "/favicon.svg",
  "/placeholder.svg",
  "/robots.txt",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_FILES))
      .then(() => self.skipWaiting())
  );
});


self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName.startsWith("rupeebill-") &&
              cacheName !== CACHE_NAME
            ) {
              return caches.delete(cacheName);
            }

            return Promise.resolve(false);
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

function shouldBypass(request) {
  const url = new URL(request.url);

  // Never cache non-GET requests.
  if (request.method !== "GET") {
    return true;
  }

  // Never cache API or authentication requests.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/graphql")
  ) {
    return true;
  }

  // Never cache Supabase requests.
  if (
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("supabase.in")
  ) {
    return true;
  }

  // Never interfere with Vite development.
  if (
    url.pathname.includes("@vite") ||
    url.pathname.includes("__vite") ||
    url.pathname.includes("hot-update")
  ) {
    return true;
  }

  return false;
}

function isStaticAsset(request) {
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return false;
  }

  return /\.(js|mjs|css|png|jpg|jpeg|webp|svg|ico|woff|woff2|ttf|otf)$/i.test(
    url.pathname
  );
}

async function handleNavigation(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("text/html")) {
        await cache.put(request, response.clone());
      }
    }

    return response;
  } catch (error) {
    const cachedPage = await caches.match(request);

    if (cachedPage) {
      return cachedPage;
    }

    const indexPage = await caches.match("/index.html");

    if (indexPage) {
      return indexPage;
    }

    return new Response("RupeeBill is currently offline.", {
      status: 503,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}

async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_NAME);

  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Update the cache in the background.
    fetch(request)
      .then((response) => {
        if (response.ok) {
          cache.put(request, response);
        }
      })
      .catch(() => {
        // Ignore background update errors.
      });

    return cachedResponse;
  }

  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    return new Response("Asset unavailable.", {
      status: 503,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Let the browser handle API/auth/non-GET requests normally.
  if (shouldBypass(request)) {
    return;
  }

  // React/Vite page navigation.
  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  // JS/CSS/images/fonts.
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Everything else goes directly to the network.
});

