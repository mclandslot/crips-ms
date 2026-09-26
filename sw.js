/* =====================================
   SERVICE WORKER

   Makes CRIPS MS installable ("Add to Home Screen"). Pages and data are
   always fetched from the network so staff never see stale marks or
   reports; only the offline notice and the app icons are cached, and the
   notice is shown when a page can't be reached without a connection.
===================================== */
const CACHE_NAME = "crips-shell-v1";

const OFFLINE_URL = "offline.html";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "app-icons/icon-192.png",
  "app-icons/icon-512.png"
];

/* absolute URLs of the files above, to recognise them in fetch events */
const PRECACHED = new Set(
  PRECACHE_URLS.map((path) => new URL(path, self.registration.scope).href)
);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  /* the offline notice's own logo must load without a connection */
  if (request.method === "GET" && PRECACHED.has(request.url)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  /* only page loads get the offline fallback; everything else (scripts,
     styles, Supabase calls) goes straight to the network untouched */
  if (request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(OFFLINE_URL);
      return cached || Response.error();
    })
  );
});
