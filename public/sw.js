// Okumo offline shell (T-095): airplane-mode service worker.
//
// THIS FILE IS A TEMPLATE. scripts/build-static.mjs reads it at build time,
// replaces the three tokens below with the real precache manifest, and writes
// the result to out/sw.js (the deployed file). The public/ copy with token
// placeholders is never registered by the app: registration is
// production-only (src/components/shared/SwRegister.tsx), and the dev server
// must not cache dev chunks.
//
// Strategy:
// - freshness: registration passes updateViaCache:"none" (SwRegister.tsx), so
//   the browser's update check never consults the HTTP cache for this script;
//   a new deploy's sw.js is picked up on the next check despite CDN caching.
//   (Deliberately no Worker-side Cache-Control rule: wrangler 4.x has no
//   per-asset header config, and the auth-gate test forbids a pathname check
//   in worker/src/index.ts. updateViaCache is the spec-backed mechanism.)
// - install: precache the whole static export EXCEPT strokes-data (the
//   31 MB hanzi stroke store is runtime-cached on first use instead).
//   Bounded-concurrency per-file fetches with per-file tolerance so one bad
//   entry can't abort the install. HTML files are ALSO cached under their
//   extensionless and trailing-slash keys: the host's html_handling redirects
//   (auto-trailing-slash) mean a navigation can arrive in any of the three
//   forms, and offline it must hit the cache without following a redirect.
// - activate: drop older okumo-shell caches, claim clients.
// - fetch: same-origin GETs only, never /api/*.
//   - navigations: network-first, cached-HTML fallback (exact path, then
//     path + ".html" for the static export's file mapping, then index.html).
//     Visited pages are runtime-cached under their pathname so a later
//     offline visit with a different query string still hits.
//   - everything else (hashed _next/static chunks, packaged seeds, wasm):
//     cache-first, network fill on miss.
const VERSION = "__OKUMO_VERSION__";
const BASE = "__OKUMO_BASE__";
const PRECACHE = __OKUMO_PRECACHE__;

const CACHE = `okumo-shell-${VERSION}`;
const precacheUrls = PRECACHE.map((p) => `${BASE}/${p}`);

const INSTALL_CONCURRENCY = 8;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      let next = 0;
      const worker = async () => {
        for (;;) {
          const url = precacheUrls[next++];
          if (!url) return;
          try {
            const res = await fetch(url);
            if (!res.ok) continue;
            await cache.put(url, res.clone());
            if (url.endsWith(".html")) {
              const bare = url.slice(0, -5);
              await cache.put(bare, res.clone());
              await cache.put(`${bare}/`, res.clone());
              if (url === `${BASE}/index.html`) {
                await cache.put(`${BASE}/`, res.clone());
              }
            }
          } catch {
            // Tolerate per-file failures; the rest still lands, and a missed
            // entry falls through to runtime caching on demand.
          }
        }
      };
      await Promise.all(
        Array.from({ length: INSTALL_CONCURRENCY }, () => worker())
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("okumo-shell-") && k !== CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // The /api/* namespace belongs to the Worker; never shadow it.
  if (url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          if (fresh.ok && fresh.type === "basic") {
            const cache = await caches.open(CACHE);
            cache.put(url.pathname, fresh.clone());
          }
          return fresh;
        } catch {
          const cache = await caches.open(CACHE);
          return (
            (await cache.match(url.pathname)) ||
            (await cache.match(`${url.pathname}.html`)) ||
            (await cache.match(`${BASE}/index.html`)) ||
            new Response("Çevrimdışı: bu sayfa henüz önbellekte yok / Offline: this page is not cached yet", {
              status: 503,
              headers: { "content-type": "text/plain; charset=utf-8" },
            })
          );
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const fresh = await fetch(req);
      if (fresh.ok && fresh.type === "basic") cache.put(req, fresh.clone());
      return fresh;
    })()
  );
});
