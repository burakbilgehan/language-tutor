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
//   31 MB hanzi stroke store is runtime-cached on first use instead), in
//   PRIORITY order: HTML pages first (navigations must work offline early),
//   then the hashed app shell (_next/static), then the bulk (seeds, wasm,
//   icons). Bounded-concurrency per-file fetches with per-file tolerance.
//   HTML files are ALSO cached under their extensionless and trailing-slash
//   keys: the host's html_handling redirects (auto-trailing-slash) mean a
//   navigation can arrive in any of the three forms, and offline it must hit
//   the cache without following a redirect.
// - self-heal: an interrupted install (tab closed, iOS suspending a
//   backgrounded page, airplane mode before completion) is RESUMED by a
//   top-up run on activate and on every fetch while incomplete; cached
//   entries are skipped, so the remainder re-downloads on the next online
//   load. The app shows a one-time "offline ready" banner when the loop
//   completes (progress posted to clients as {type:"okumo-precache"}).
// - activate: drop older okumo-shell caches, claim clients, top up.
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

function priorityOf(p) {
  if (p.endsWith(".html")) return 0;
  if (p.startsWith("_next/")) return 1;
  return 2;
}
const precacheUrls = PRECACHE.map((p) => `${BASE}/${p}`).sort(
  (a, b) => priorityOf(a) - priorityOf(b) || (a < b ? -1 : a > b ? 1 : 0)
);

const INSTALL_CONCURRENCY = 8;

let precacheDone = false;
let topUpRunning = null;

function postProgress(done, total) {
  void self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
    for (const c of clients) {
      c.postMessage({ type: "okumo-precache", done, total, version: VERSION });
    }
  });
}

async function runTopUp() {
  const cache = await caches.open(CACHE);
  let next = 0;
  let processed = 0;
  const worker = async () => {
    for (;;) {
      const url = precacheUrls[next++];
      if (!url) return;
      try {
        if (await cache.match(url)) continue; // resume: skip already-cached
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
        // Tolerate per-file failures; the next online load retries them.
      }
      processed++;
      if (processed % 20 === 0) postProgress(processed, precacheUrls.length);
    }
  };
  await Promise.all(
    Array.from({ length: INSTALL_CONCURRENCY }, () => worker())
  );
  precacheDone = true;
  postProgress(precacheUrls.length, precacheUrls.length);
}

function topUp() {
  if (!topUpRunning) topUpRunning = runTopUp();
  return topUpRunning;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await topUp();
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
      // Self-heal: resume an interrupted precache without delaying activation.
      await topUp();
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

  // Self-heal: keep filling the precache while incomplete. waitUntil keeps
  // this SW alive for the run without delaying the response below.
  if (!precacheDone) event.waitUntil(topUp());

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
