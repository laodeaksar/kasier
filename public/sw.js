const STATIC_CACHE = 'kasier-static-v1'
const CASHIER_CACHE = 'kasier-cashier-page-v1'
const PRECACHE_URLS = ['/offline.html', '/manifest.webmanifest', '/ar-shop-logo.svg']
const ASSET_PREFIX = '/assets/'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(names
      .filter((name) => name.startsWith('kasier-') && name !== STATIC_CACHE && name !== CASHIER_CACHE)
      .map((name) => caches.delete(name)))
    await self.clients.claim()
  })())
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_PRIVATE_PAGES') {
    event.waitUntil(caches.delete(CASHIER_CACHE).then(() => event.ports[0]?.postMessage({ ok: true })))
    return
  }
  if (event.data?.type === 'CACHE_CLIENT_ASSETS' && Array.isArray(event.data.urls)) {
    event.waitUntil((async () => {
      const cache = await caches.open(STATIC_CACHE)
      const urls = event.data.urls
        .filter((path) => typeof path === 'string' && path.startsWith(ASSET_PREFIX) && path.length < 2048)
        .slice(0, 100)
      await Promise.allSettled(urls.map(async (path) => {
        const url = new URL(path, self.location.origin)
        if (url.origin !== self.location.origin) return
        const response = await fetch(url.href, { credentials: 'same-origin' })
        if (response.ok) await cache.put(url.href, response)
      }))
    })())
    return
  }
  if (event.data?.type === 'CACHE_AUTHENTICATED_CASHIER_PAGE') {
    event.waitUntil((async () => {
      try {
        const response = await fetch('/kasir', { credentials: 'same-origin', cache: 'no-store' })
        if (response.ok && response.status === 200 && !response.redirected && new URL(response.url).pathname === '/kasir') {
          const cache = await caches.open(CASHIER_CACHE)
          await cache.put('/kasir', response)
        }
      } catch {
        // If this visit is already offline, keep any shell cached by an earlier online visit.
      }
    })())
  }
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    if (url.pathname !== '/kasir') return
    event.respondWith((async () => {
      const cache = await caches.open(CASHIER_CACHE)
      try {
        const response = await fetch(request)
        if (response.ok && response.status === 200 && !response.redirected && new URL(response.url).pathname === '/kasir') {
          await cache.put('/kasir', response.clone())
        }
        if (response.status >= 500) {
          return (await cache.match('/kasir')) ?? response
        }
        return response
      } catch {
        return (await cache.match('/kasir'))
          ?? (await caches.match('/offline.html'))
          ?? new Response('Anda sedang offline. Buka kembali Kasier saat internet tersedia.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
      }
    })())
    return
  }

  if (url.pathname.startsWith(ASSET_PREFIX) || PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith((async () => {
      const cached = await caches.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok) {
        const cache = await caches.open(STATIC_CACHE)
        await cache.put(request, response.clone())
      }
      return response
    })())
  }
})
