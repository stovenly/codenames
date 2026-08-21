import {copyFile, readdir, readFile, writeFile} from 'node:fs/promises'

const OUT = 'docs'

const assets = await readdir(`${OUT}/assets`)
let html = await readFile(`${OUT}/index.html`, 'utf8')

/**
 * The browser cannot discover a lazily-imported chunk until the entry has
 * downloaded, parsed and run — a whole round trip of waterfall. The crowd is
 * decoration, so it must not be in the entry, but it should not wait behind it
 * either. A preload hint gets it fetching in parallel from the first byte of
 * HTML, which is the difference between it fading in and popping in.
 */
const preload = assets.filter(a => /^Silhouettes-.*\.js$/.test(a))
if (preload.length) {
  const tags = preload
    .map(a => `    <link rel="modulepreload" href="/codenames/assets/${a}" />`)
    .join('\n')
  html = html.replace('</head>', `${tags}\n  </head>`)
  await writeFile(`${OUT}/index.html`, html)
}

await copyFile(`${OUT}/index.html`, `${OUT}/404.html`)

/**
 * Only the shell is precached: index.html plus the entry chunks it references.
 * Lazy chunks (avatar styles, word packs, the mesh) are cached on first use, so
 * a repeat visit opens instantly without a first visit paying for all of them.
 */
const referenced = [...html.matchAll(/\/codenames\/assets\/([^"']+)/g)].map(m => m[1])
const shell = ['./', './index.html', ...referenced.map(a => `./assets/${a}`)]

const stamp = referenced.join('|')
let hash = 0
for (const ch of stamp) hash = (Math.imul(hash, 31) + ch.charCodeAt(0)) | 0
const version = `cn-${(hash >>> 0).toString(36)}`

await writeFile(
  `${OUT}/sw.js`,
  `const VERSION = '${version}'
const SHELL = ${JSON.stringify(shell, null, 2)}

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
`
)

console.log(
  `postbuild: 404.html + sw.js (${version}, ${shell.length} shell entries, ${preload.length} preloaded)`
)
