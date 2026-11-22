function cacheLoadedAssets(worker: ServiceWorker | null): void {
  if (!worker || typeof performance === 'undefined') return
  const urls = [...new Set(performance.getEntriesByType('resource')
    .map((entry) => entry.name)
    .filter((name) => {
      try {
        const url = new URL(name)
        return url.origin === location.origin && url.pathname.startsWith('/assets/')
      } catch {
        return false
      }
    })
    .map((name) => `${new URL(name).pathname}${new URL(name).search}`))]
  worker.postMessage({ type: 'CACHE_CLIENT_ASSETS', urls })
}

export function registerPwaServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return
  void navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(async (registration) => {
    await navigator.serviceWorker.ready
    cacheLoadedAssets(registration.active ?? navigator.serviceWorker.controller)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      cacheLoadedAssets(navigator.serviceWorker.controller)
    }, { once: true })
  }).catch((error: unknown) => {
    console.error('Service worker Kasier gagal didaftarkan.', error)
  })
}

export function primeCashierPageCache(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  void navigator.serviceWorker.ready.then((registration) => {
    registration.active?.postMessage({ type: 'CACHE_AUTHENTICATED_CASHIER_PAGE' })
  }).catch((error: unknown) => {
    console.warn('Halaman Kasir belum dapat disiapkan untuk dibuka offline.', error)
  })
}

export async function clearCachedCashierPage(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    const registration = await navigator.serviceWorker.getRegistration('/')
    if (!registration) return
    const worker = registration.active
    if (!worker) return
    await new Promise<void>((resolve) => {
      const channel = new MessageChannel()
      const timeout = window.setTimeout(resolve, 1000)
      channel.port1.onmessage = () => {
        window.clearTimeout(timeout)
        channel.port1.close()
        resolve()
      }
      worker.postMessage({ type: 'CLEAR_PRIVATE_PAGES' }, [channel.port2])
    })
  } catch (error) {
    console.error('Cache halaman kasir tidak dapat dibersihkan.', error)
  }
}
