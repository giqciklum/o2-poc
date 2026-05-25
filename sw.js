const CACHE_VERSION = "o2-poc-v9";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/demo-runtime.js",
  "./assets/chart.umd.min.js",
  "./assets/icon.svg",
  "./assets/o2-favicon.png",
  "./assets/o2-hero-pool.webp",
  "./assets/o2-fitness-floor.webp",
  "./assets/o2-padel.webp",
  "./assets/o2-app-soyo2.webp"
];

const BACKEND_HOST = "script.google.com";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

function isBackendCall(url) {
  return url.hostname.endsWith(BACKEND_HOST);
}

function isAppShell(url) {
  return url.origin === self.location.origin;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (_) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") return cache.match("./index.html");
    throw _;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh.ok) cache.put(request, fresh.clone());
  return fresh;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  let url;
  try {
    url = new URL(request.url);
  } catch (_) {
    return;
  }

  if (isBackendCall(url)) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isAppShell(url) && ["style", "script", "image", "font", ""].includes(request.destination)) {
    event.respondWith(cacheFirst(request));
  }
});
