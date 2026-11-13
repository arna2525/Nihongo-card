/* Kotoba Card V1.0 — Service Worker
   - Hanya mengelola cache berawalan "kotoba-v" milik aplikasi ini (cache aplikasi lain tidak disentuh).
   - Tidak menyentuh IndexedDB/localStorage sama sekali.
   - Berkas kamus (dict/) dan version.json selalu ke jaringan (tidak di-cache) agar pemeriksaan update akurat.
   - Pemulihan: versi cache lama dihapus HANYA setelah versi baru sukses ter-install & aktif. */
var CACHE_NAME = "kotoba-v1.4.10";
var CORE = ["./", "index.html", "manifest.webmanifest"];
var ART = ["assets/header.webp", "assets/bg.webp", "assets/logo.png", "assets/icon-192.png", "assets/icon-512.png"];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // Berkas inti wajib berhasil; artwork opsional agar aset yang belum ada tidak menggagalkan install.
      return cache.addAll(CORE).then(function () {
        return Promise.all(ART.map(function (f) { return cache.add(f).catch(function () { return false; }); }));
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key.indexOf("kotoba-v") === 0 && key !== CACHE_NAME) return caches.delete(key);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("message", function (e) {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;
  var url = new URL(request.url);
  // Google Fonts: cache-first agar font CSS dan file font dipakai ulang saat kunjungan berikutnya.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(request).then(function (hit) {
        var fresh = fetch(request).then(function (res) {
          if (res && (res.ok || res.type === "opaque")) cache.put(request, res.clone()).catch(function () {});
          return res;
        });
        return hit || fresh;
      });
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (/\/dict\//.test(url.pathname) || /\/version\.json$/.test(url.pathname)) return; // jaringan langsung

  // HTML: network-first, salinan cache untuk offline.
  if (request.mode === "navigate" || /\/index\.html$/.test(url.pathname)) {
    event.respondWith(
      fetch(request).then(function (res) {
        if (res && res.ok) { var copy = res.clone(); caches.open(CACHE_NAME).then(function (c) { c.put(request, copy); }); }
        return res;
      }).catch(function () {
        return caches.match(request).then(function (hit) { return hit || caches.match("index.html") || caches.match("./"); });
      })
    );
    return;
  }

  // Aset: cache-first + isi cache di latar belakang.
  event.respondWith(
    caches.match(request).then(function (hit) {
      if (hit) return hit;
      return fetch(request).then(function (res) {
        if (res && res.ok) { var copy = res.clone(); caches.open(CACHE_NAME).then(function (c) { c.put(request, copy); }); }
        return res;
      });
    })
  );
});
