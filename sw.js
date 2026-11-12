/* Kotoba Card V0.8 — safer cache update */
var CACHE_NAME = "kotoba-v21";
var APP_FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "assets/header.webp",
  "assets/bg.webp",
  "assets/logo.png",
  "assets/icon-192.png",
  "assets/icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // Core app files must install successfully. Optional artwork is cached
      // independently so a missing asset cannot disable offline app startup.
      return cache.addAll(["./", "index.html", "manifest.webmanifest"])
        .then(function () {
          return Promise.all(APP_FILES.slice(3).map(function (file) {
            return cache.add(file).catch(function () { return false; });
          }));
        });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        // Only clean up Kotoba Card's own previous cache versions.
        if (key.indexOf("kotoba-v") === 0 && key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // HTML: network-first so deployments update promptly, cached copy works offline.
  if (request.mode === "navigate" || url.pathname.endsWith("/index.html")) {
    event.respondWith(
      fetch(request).then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, copy);
          });
        }
        return response;
      }).catch(function () {
        return caches.match(request).then(function (cached) {
          return cached || caches.match("index.html");
        });
      })
    );
    return;
  }

  // Same-origin app assets: cache-first with background cache fill.
  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, copy);
          });
        }
        return response;
      });
    })
  );
});
