// Service worker for the midiviz experiments (registered by 032_pianist.html,
// scope: this folder).
//
// • Assets (soundfonts, the pianist's models and textures, MIDI files, the
//   synth's WASM, three.js from the CDN) are cache-first: fetched once, then
//   served from the cache, so a second visit downloads almost nothing even
//   though GitHub Pages re-stamps every file on each deploy. Bump ASSETS
//   when one of them really changes.
// • Pages and code (HTML, JS, CSS, JSON) are network-first, so updates show
//   at once; the cached copy is the offline fallback.
//   A cached asset is checked once per worker lifetime with a HEAD request
//   and fetched again if its size changed.
// Range requests and non-GET requests go straight to the network.

const ASSETS = 'midiviz-assets-v2'   // (the same name keeps what's cached; bump to drop it. v2: #047 rebuilt pianist/assets/character.bin, and a cached old .bin with the new .json fails to load)
const CODE = 'midiviz-code-v1'
const ASSET_RE = /\.(sf2|sf3|mid|midi|bin|glb|gltf|vrm|png|jpe?g|webp|ktx2|wasm|hdr|exr|ogg|mp3|wav|woff2?)$/i
const CDN_RE = /^https:\/\/cdn\.jsdelivr\.net\/npm\/[^/]+@\d/   // versioned: immutable

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', ev => ev.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('midiviz-') && k !== ASSETS && k !== CODE) await caches.delete(k)
  await self.clients.claim()
})()))

self.addEventListener('fetch', ev => {
  const req = ev.request
  if (req.method !== 'GET' || req.headers.has('range')) return
  const url = new URL(req.url)
  const sameOrigin = url.origin === self.location.origin
  if (sameOrigin && !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return
  if (CDN_RE.test(req.url) || (sameOrigin && ASSET_RE.test(url.pathname))) ev.respondWith(cacheFirst(req))
  else if (sameOrigin) ev.respondWith(networkFirst(req))
})

const checked = new Set()   // (per worker lifetime)
async function cacheFirst(req) {
  const cache = await caches.open(ASSETS)
  const hit = await cache.match(req)
  if (hit) {
    // once in a while, in the background: has the file changed size? (a cheap
    // HEAD; GitHub Pages' ETags change on every deploy, so they can't tell)
    if (!checked.has(req.url) && !CDN_RE.test(req.url)) { checked.add(req.url); revalidate(cache, req, hit) }
    return hit
  }
  const res = await fetch(req)
  if (res.ok && (res.type === 'basic' || res.type === 'cors')) cache.put(req, res.clone()).catch(() => {})
  return res
}
async function revalidate(cache, req, hit) {
  try {
    const h = await fetch(req.url, { method: 'HEAD', cache: 'no-store' })
    const n = h.headers.get('content-length'), m = hit.headers.get('content-length')
    if (h.ok && n && m && n !== m) { const r = await fetch(req.url, { cache: 'no-store' }); if (r.ok) await cache.put(req, r) }
  } catch { /* offline */ }
}

async function networkFirst(req) {
  const cache = await caches.open(CODE)
  try {
    const res = await fetch(req)
    if (res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => {})
    return res
  } catch (e) {
    const hit = await cache.match(req, { ignoreSearch: true }) || await caches.match(req, { ignoreSearch: true })
    if (hit) return hit
    throw e
  }
}

// "Save for offline": the page posts { type: 'precache', urls } and gets
// { type: 'precache', done, total, bytes, failed } back as files arrive
self.addEventListener('message', ev => {
  if (ev.data?.type !== 'precache') return
  const urls = [...new Set(ev.data.urls)], port = ev.source
  ev.waitUntil((async () => {
    const cache = await caches.open(ASSETS)
    let next = 0, done = 0, bytes = 0, failed = 0
    const report = () => port?.postMessage({ type: 'precache', done, total: urls.length, bytes, failed })
    const worker = async () => {
      while (next < urls.length) {
        const u = urls[next++]
        try {
          const hit = await cache.match(u)
          if (hit) bytes += +(hit.headers.get('content-length') || 0)
          else {
            const r = await fetch(u)
            if (r.ok) { bytes += +(r.headers.get('content-length') || 0); await cache.put(u, r) } else if (r.status !== 404) failed++   // (not every part has a texture)
          }
        } catch { failed++ }
        done++; report()
      }
    }
    await Promise.all([worker(), worker(), worker(), worker()])
    report()
  })())
})
