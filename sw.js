// ============================================================================
// sw.js – cached ausschließlich die App-Hülle (HTML/CSS/JS), damit die App
// auch bei schlechter Verbindung startet. Kartenkacheln und Routing-Anfragen
// werden bewusst NICHT gecacht, da sie sich ändern bzw. viel Speicher fressen.
// ============================================================================

const CACHE_NAME = "openradroute-shell-v1";

const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/config.js",
  "./js/utils.js",
  "./js/map.js",
  "./js/geocoding.js",
  "./js/routing.js",
  "./js/waypoints.js",
  "./js/elevation.js",
  "./js/ui.js",
  "./js/main.js",
  "./icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Nur eigene App-Dateien (same-origin, GET) über Cache-first ausliefern.
  // Externe Requests (MapLibre-CDN, Kartenkacheln, BRouter, Nominatim)
  // laufen ganz normal übers Netzwerk.
  if (url.origin !== self.location.origin || event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).catch(() => caches.match("./index.html"))
    )
  );
});
