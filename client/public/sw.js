/**
 * FitAI Coach — Service Worker
 *
 * Static assets : cache-first (instant loads, shell always available offline)
 * API GET calls : stale-while-revalidate (serve cached copy immediately,
 *                 refresh in background, TTL = 5 min)
 * API mutations : pass-through — axios interceptor queues them in IndexedDB
 *                 when offline; this SW signals the app to flush on reconnect
 */

const SHELL_CACHE = "fitai-shell-v2";
const API_CACHE   = "fitai-api-v1";

// API response TTL — serve stale after this window (ms)
const API_TTL_MS = 5 * 60 * 1000;   // 5 minutes

// Static shell to precache on install
const PRECACHE = ["/", "/index.html"];

// ── Install ────────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ── Activate — prune old caches ────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, API_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Background Sync — tell the app to flush its mutation queue ─────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "fitai-sync-queue") {
    event.waitUntil(broadcastSyncReplay());
  }
});

async function broadcastSyncReplay() {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  clients.forEach((c) => c.postMessage({ type: "SW_SYNC_REPLAY" }));
}

// ── Fetch ──────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept same-origin http(s)
  if (!url.protocol.startsWith("http") || url.origin !== self.location.origin) return;

  // Non-GET mutations pass through — axios handles offline queuing
  if (request.method !== "GET") return;

  // API GETs: stale-while-revalidate
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Static assets: cache-first with network fallback
  event.respondWith(cacheFirst(request));
});

// ── Strategies ─────────────────────────────────────────────────────────────────

async function staleWhileRevalidate(request) {
  const cache  = await caches.open(API_CACHE);
  const cached = await cache.match(request);

  // Kick off a background network fetch regardless
  const networkFetch = fetch(request)
    .then((res) => {
      if (res.ok) {
        // Stamp with cache time so we can enforce TTL
        const headers = new Headers(res.headers);
        headers.set("X-SW-Cached-At", String(Date.now()));
        const stamped = new Response(res.clone().body, {
          status: res.status,
          statusText: res.statusText,
          headers,
        });
        cache.put(request, stamped);
      }
      return res;
    })
    .catch(() => null);  // null = offline

  if (cached) {
    const cachedAt = Number(cached.headers.get("X-SW-Cached-At") ?? 0);
    const age = Date.now() - cachedAt;

    if (age < API_TTL_MS) {
      // Fresh enough — return cache immediately, let network update happen in background
      networkFetch; // intentional fire-and-forget
      return cached;
    }

    // Stale — wait for network, fall back to stale cache if offline
    const fresh = await networkFetch;
    return fresh ?? cached;
  }

  // Nothing cached — must wait for network
  const fresh = await networkFetch;
  if (fresh) return fresh;

  return new Response(
    JSON.stringify({ error: "You are offline", offline: true }),
    { status: 503, headers: { "Content-Type": "application/json" } }
  );
}

async function cacheFirst(request) {
  const url    = new URL(request.url);
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const res = await fetch(request);
    if (res.ok && url.origin === self.location.origin) {
      const clone = res.clone();
      caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
    }
    return res;
  } catch {
    // For SPA routes — fall back to the app shell
    const shell = await caches.match("/index.html");
    return shell ?? new Response("Offline", { status: 503 });
  }
}
