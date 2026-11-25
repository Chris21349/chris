/* 镜刃 MIRROR EDGE — Service Worker
   策略：导航与脚本/样式一律「网络优先」，断网才回落到缓存。
   这样只要联网，刷新/重开就一定拿到最新版本，不会再出现旧代码卡住的情况。 */
const V = 'mirror-edge-v1.3.3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(V)
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== V).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

async function netFirst(req, ms) {
  const cache = await caches.open(V);
  try {
    const res = await withTimeout(fetch(req, { cache: 'no-store' }), ms);
    if (res && (res.ok || res.type === 'opaque')) {
      cache.put(req, res.clone()).catch(() => {});
      return res;
    }
    throw new Error('bad');
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    return new Response('', { status: 504, statusText: 'offline' });
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(V);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (e) {
    return new Response('', { status: 504 });
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(netFirst(req, 4000));
    return;
  }
  if (/\.(js|css|webmanifest|json|html)$/i.test(url.pathname)) {
    e.respondWith(netFirst(req, 3000));
    return;
  }
  e.respondWith(cacheFirst(req));
});
