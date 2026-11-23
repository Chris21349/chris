/* 雾港未眠 · Service Worker
 * 网络优先，离线回退到缓存。这样更新剧本后不会读到旧缓存，
 * 没网时也能完整打开游戏。
 */

const CACHE_NAME = "wugang-v10";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./art.js",
  "./portraits.js",
  "./story.js",
  "./game.js",
  "./portraits/shen.png",
  "./portraits/jiang.png",
  "./portraits/lu.png",
  "./portraits/su.png",
  "./portraits/suqing.png",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => {
        if (cached) return cached;
        if (request.mode === "navigate") return caches.match("./index.html");
        return new Response("Offline", { status: 503, statusText: "Offline" });
      }))
  );
});
