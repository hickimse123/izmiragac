/* İzmir Ağaç Atlası — temel PWA servis çalışanı */
const CACHE = "agac-atlasi-v1";
const STATIC_ASSETS = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => null),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // API istekleri her zaman ağ üzerinden
  if (url.pathname.startsWith("/api/")) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request)
          .then((res) => {
            // Başarılı statik yanıtları önbelleğe al
            if (res.ok && (url.origin === self.location.origin)) {
              const clone = res.clone();
              caches.open(CACHE).then((cache) => cache.put(event.request, clone));
            }
            return res;
          })
          .catch(() => cached),
    ),
  );
});
