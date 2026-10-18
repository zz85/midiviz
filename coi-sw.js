// Cross-origin isolation for pages that need SharedArrayBuffer (multithreaded
// onnxruntime-web) on hosts that cannot send headers (GitHub Pages,
// python -m http.server). Registered by 036_onnx_transcription.html with its
// own URL as the scope, so no other page is affected; it re-serves every
// response with COOP / COEP added. COEP is "credentialless", so cross-origin
// fetches (jsdelivr) keep working without CORP headers.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', e => {
  const r = e.request
  if (r.cache === 'only-if-cached' && r.mode !== 'same-origin') return
  e.respondWith(fetch(r).then(res => {
    if (res.status === 0) return res   // opaque: pass through
    const h = new Headers(res.headers)
    h.set('Cross-Origin-Embedder-Policy', 'credentialless')
    h.set('Cross-Origin-Opener-Policy', 'same-origin')
    if (!h.has('Cross-Origin-Resource-Policy')) h.set('Cross-Origin-Resource-Policy', 'cross-origin')
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h })
  }))
})
