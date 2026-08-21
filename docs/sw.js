const VERSION = 'cn-637k34'
const SHELL = [
  "./",
  "./index.html",
  "./assets/index-BqbVACdh.js",
  "./assets/rolldown-runtime-hePW80VL.js",
  "./assets/index-Bg3N2CXv.css"
]

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const {request} = event
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return

  // Navigations fall back to the cached shell, which is what makes deep links
  // and a slow Pages origin both survive.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html').then(r => r || Response.error()))
    )
    return
  }

  event.respondWith(
    caches.match(request).then(hit => {
      if (hit) return hit
      return fetch(request).then(response => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone()
          caches.open(VERSION).then(cache => cache.put(request, copy))
        }
        return response
      })
    })
  )
})
