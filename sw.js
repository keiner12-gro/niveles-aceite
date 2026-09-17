// Service worker: cachea el app shell para uso offline en planta.
//
// El código de la app (html/css/js) va con estrategia "red primero, caché de
// respaldo": así, cuando hay señal, siempre se sirve la versión más nueva
// (importante porque la app se actualiza sola vía GitHub Pages) y solo se cae
// a la copia cacheada cuando no hay conexión. Las librerías de vendor/ son
// pesadas y no cambian con cada release, así que esas sí van caché-primero.
const CACHE_NAME = "niveles-aceite-v2";
const ARCHIVOS_APP = [
  "./",
  "./index.html",
  "./style.css",
  "./data.js",
  "./db.js",
  "./report.js",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];
const ARCHIVOS_VENDOR = [
  "./vendor/xlsx.full.min.js",
  "./vendor/jspdf.umd.min.js",
  "./vendor/jspdf.plugin.autotable.min.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll([...ARCHIVOS_APP, ...ARCHIVOS_VENDOR]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function esVendor(url) {
  return ARCHIVOS_VENDOR.some((v) => url.pathname.endsWith(v.replace("./", "/")));
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (esVendor(url)) {
    // Caché primero: son librerías grandes que casi no cambian.
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return resp;
        });
      })
    );
    return;
  }

  // Red primero: siempre la versión más nueva de la app cuando hay conexión.
  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});
