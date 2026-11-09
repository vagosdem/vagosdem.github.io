/* Trading Floor service worker.
   - App shell: cached, served network-first (so new deploys show up), cache fallback offline.
   - state.json: always network-first (cache only as an offline fallback).
   - OKX and any other cross-origin request: not intercepted (always live network). */
const VERSION = "tf-shell-v1";
const SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // OKX etc: straight to network

  event.respondWith(
    fetch(req, url.pathname.endsWith("state.json") ? { cache: "no-store" } : undefined)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          const key = url.pathname.endsWith("state.json") ? "state.json" : req;
          caches.open(VERSION).then((c) => c.put(key, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(url.pathname.endsWith("state.json") ? "state.json" : req, { ignoreSearch: true })
          .then((hit) => hit || caches.match("index.html"))
      )
  );
});
