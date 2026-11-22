import { Field, Form, reset, useForm } from '@formisch/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import * as v from 'valibot'
import { useEffect, useRef, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { clearCachedCashierPage, primeCashierPageCache } from '@/shared/pwa'
import { requireRouteSession } from '@/shared/route-access'
import { listQueuedSales, readCachedProducts, readProductsCachedAt, removeQueuedSale, saveCachedProducts } from '@/shared/offline-db'
import { submitLunasSale, submitUtangSale, syncQueuedSalesForUser } from '@/shared/offline-sales'
import { addCartItem, cartStore, clearCart, removeCartItem, setCartItemQuantity } from '@/stores/cart'
import {
  calculateSaleLineSubtotal,
  calculateSaleTotal,
  saleCheckoutSchema,
  saleCreateSchema,
  type SaleCheckoutInput,
  type SaleCreateInput,
} from '@/shared/validators/sales'

type ProductOption = {
  id: string
  name: string
  unit: string
  sellPrice: number
  stock: number
}

export const Route = createFileRoute('/kasir')({
  beforeLoad: ({ context }) => ({ session: requireRouteSession(context) }),
  component: CashierPage,
})

function CashierPage() {
  const router = useRouter()
  const { session, queryClient } = Route.useRouteContext()
  const user = session!.user
  const cartItems = useStore(cartStore, (state) => state.items)
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })
  const productsData = productsQuery.data
  const products = productsData?.products ?? []
  const queueQuery = useQuery({
    queryKey: ['offline-sales-queue', user.id],
    queryFn: () => listQueuedSales(user.id),
  })
  const [isOnline, setIsOnline] = useState(true)
  const offlineMode = !isOnline || productsData?.offline === true
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({})
  const [paymentMethod, setPaymentMethod] = useState<'lunas' | 'utang'>('lunas')
  const [cartError, setCartError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [noticeKind, setNoticeKind] = useState<'success' | 'pending' | 'error'>('success')
  const utangIdempotencyKey = useRef<string | null>(null)
  const checkoutForm = useCheckoutForm()
  const saleMutation = useMutation({
    mutationFn: async ({ input, idempotencyKey }: { input: SaleCreateInput; idempotencyKey?: string }) => {
      if (input.paymentMethod === 'utang') {
        return { status: 'confirmed' as const, sale: await submitUtangSale(input, idempotencyKey!) }
      }
      return await submitLunasSale(input, user.id)
    },
    onSuccess: async (outcome) => {
      clearCart()
      setPaymentMethod('lunas')
      if (outcome.status === 'confirmed' && outcome.sale.paymentMethod === 'utang') clearUtangRetryKey(user.id)
      utangIdempotencyKey.current = null
      reset(checkoutForm, { initialInput: { paymentMethod: 'lunas' } })
      if (outcome.status === 'confirmed') {
        setNoticeKind('success')
        setNotice(`Transaksi dikonfirmasi server. Total: ${formatRupiah(outcome.sale.total)}. Nomor transaksi: ${outcome.sale.id}.`)
        await queryClient.invalidateQueries({ queryKey: ['products'] })
      } else if (outcome.status === 'needs_review') {
        setNoticeKind('error')
        setNotice('Server menolak transaksi ini. Transaksi belum berhasil; periksa daftar antrean sebelum membuat transaksi baru.')
      } else {
        setNoticeKind('pending')
        setNotice('Transaksi Lunas masuk antrean perangkat dan belum dianggap berhasil. Total/stok final menunggu pemeriksaan server saat internet kembali.')
      }
      await queryClient.invalidateQueries({ queryKey: ['offline-sales-queue', user.id] })
    },
  })

  useEffect(() => {
    primeCashierPageCache()
    const updateOnlineState = () => setIsOnline(navigator.onLine)
    updateOnlineState()
    window.addEventListener('online', updateOnlineState)
    window.addEventListener('offline', updateOnlineState)
    return () => {
      window.removeEventListener('online', updateOnlineState)
      window.removeEventListener('offline', updateOnlineState)
    }
  }, [])

  useEffect(() => {
    let active = true
    const syncQueue = async () => {
      if (!navigator.onLine) return
      try {
        const result = await syncQueuedSalesForUser(user.id)
        if (!active) return
        if (result.confirmed.length > 0) {
          const latest = result.confirmed[result.confirmed.length - 1]!
          setNoticeKind('success')
          setNotice(`${result.confirmed.length} transaksi antrean dikonfirmasi server. Total transaksi terbaru: ${formatRupiah(latest.total)}. Nomor: ${latest.id}.`)
          await queryClient.invalidateQueries({ queryKey: ['products'] })
        }
        if (result.needsReview > 0) {
          setNoticeKind('error')
          setNotice(`${result.needsReview} transaksi antrean ditolak server dan perlu ditinjau. Transaksi tersebut belum berhasil.`)
        }
        await queryClient.invalidateQueries({ queryKey: ['offline-sales-queue', user.id] })
      } catch (error) {
        console.error('Antrean penjualan Kasier belum dapat disinkronkan.', error)
      }
    }
    void syncQueue()
    window.addEventListener('online', syncQueue)
    return () => {
      active = false
      window.removeEventListener('online', syncQueue)
    }
  }, [queryClient, user.id])

  async function handleLogout() {
    await fetch('/api/auth/sign-out', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    await clearCachedCashierPage()
    await router.invalidate()
    await router.navigate({ to: '/login' })
  }

  function addProduct(product: ProductOption) {
    setCartError(null)
    setNotice(null)
    const quantity = Number(quantityInputs[product.id] ?? '1')
    const result = v.safeParse(saleCreateSchema, {
      paymentMethod: 'lunas',
      items: [{ productId: product.id, quantity }],
    })
    if (!result.success) {
      setCartError(result.issues[0]?.message ?? 'Masukkan jumlah barang yang valid.')
      return
    }

    addCartItem(product.id, quantity)
    setQuantityInputs((values) => ({ ...values, [product.id]: '1' }))
  }

  async function submitCheckout(data: SaleCheckoutInput) {
    setFormError(null)
    setCartError(null)
    setNotice(null)
    const result = v.safeParse(saleCreateSchema, { ...data, items: cartItems })
    if (!result.success) {
      setFormError(result.issues[0]?.message ?? 'Periksa kembali barang dan data pembayaran.')
      return
    }

    const { paymentMethod: validatedMethod, customerName, customerContact, items } = result.output
    if (validatedMethod === 'utang' && offlineMode) {
      setFormError('Pembayaran Utang hanya bisa disimpan saat terhubung ke internet. Data pembeli tidak disimpan offline.')
      return
    }
    const expectedPrices = [...new Set(items.map(({ productId }) => productId))].map((productId) => {
      const product = products.find((option) => option.id === productId)
      return product ? { productId, sellPrice: product.sellPrice } : null
    })
    if (expectedPrices.some((price) => price === null)) {
      setFormError('Harga salah satu barang tidak tersedia. Muat ulang daftar barang sebelum menyimpan.')
      return
    }

    const requestBody: SaleCreateInput = {
      paymentMethod: validatedMethod,
      items: items.map(({ productId, quantity }) => ({ productId, quantity })),
      expectedPrices: expectedPrices.filter((price): price is NonNullable<typeof price> => price !== null),
      ...(validatedMethod === 'utang' ? { customerName, customerContact } : {}),
    }

    try {
      const idempotencyKey = validatedMethod === 'utang'
        ? (utangIdempotencyKey.current ??= getUtangRetryKey(user.id))
        : undefined
      await saleMutation.mutateAsync({ input: requestBody, idempotencyKey })
    } catch (error) {
      const status = (error as { status?: number }).status
      if (validatedMethod === 'utang' && status !== undefined && status > 0 && status < 500) {
        utangIdempotencyKey.current = null
        clearUtangRetryKey(user.id)
      }
      setFormError(error instanceof Error ? error.message : 'Konfirmasi transaksi tidak diterima. Muat ulang stok dan periksa sebelum mencoba lagi.')
    }
  }

  const previewTotal = getCartTotal(cartItems, products)
  const pendingQueue = queueQuery.data?.filter((item) => item.status === 'pending') ?? []
  const reviewQueue = queueQuery.data?.filter((item) => item.status === 'needs_review') ?? []

  return (
    <AppShell user={user} onLogout={handleLogout}>
      <section className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Tahap 3</p>
            <h1 className="mt-2 text-3xl font-bold">Kasir</h1>
            <p className="mt-2 max-w-2xl text-base-content/70">Pilih barang dan jumlah. Harga akhir dan stok selalu diperiksa kembali di server.</p>
          </div>
          <Link to="/barang" className="btn btn-outline min-h-11">Lihat Daftar Barang</Link>
        </div>

        {notice ? <div role={noticeKind === 'error' ? 'alert' : 'status'} className={`alert ${noticeKind === 'success' ? 'alert-success' : noticeKind === 'error' ? 'alert-error' : 'alert-warning'} text-sm`}><span>{notice}</span></div> : null}
        {offlineMode ? <div role="status" className="alert alert-warning text-sm"><span>Mode offline. Harga dan stok yang terlihat berasal dari cache dan mungkin sudah berubah. Transaksi Lunas hanya akan masuk antrean; server belum mengonfirmasi.</span></div> : null}
        {productsData?.offline ? <div role="status" className="alert alert-warning text-sm"><span>Daftar barang dibaca dari perangkat, terakhir disimpan {formatDateTime(productsData.lastUpdated)}. Harga dan stok mungkin kedaluwarsa.</span></div> : null}
        {pendingQueue.length > 0 ? <div role="status" className="alert alert-info text-sm"><div><span>{pendingQueue.length} transaksi Lunas menunggu koneksi/server. Belum menjadi transaksi berhasil sampai server mengonfirmasi.</span>{isOnline ? <button type="button" className="btn btn-sm btn-outline mt-2" onClick={() => window.dispatchEvent(new Event('online'))}>Coba sinkronkan sekarang</button> : null}</div></div> : null}
        {reviewQueue.length > 0 ? <div role="alert" className="alert alert-error text-sm"><div className="w-full"><p className="font-bold">Ada transaksi antrean yang perlu ditinjau. Server menolaknya; transaksi belum berhasil.</p>{reviewQueue.map((item) => <div key={item.idempotencyKey} className="mt-3 border-t border-error/20 pt-3"><p>{item.lastError ?? 'Server menolak transaksi.'} (dibuat {formatDateTime(item.createdAt)}).</p><p className="mt-1">Barang: {item.payload.items.map((line) => `${products.find((product) => product.id === line.productId)?.name ?? line.productId} × ${formatQuantity(line.quantity)}`).join(', ')}.</p><button type="button" className="btn btn-sm btn-outline mt-2" onClick={async () => { await removeQueuedSale(item.idempotencyKey); await queryClient.invalidateQueries({ queryKey: ['offline-sales-queue', user.id] }) }}>Hapus antrean lokal setelah ditinjau</button></div>)}</div></div> : null}
        {productsQuery.error ? <div role="alert" className="alert alert-error text-sm"><span>{productsQuery.error instanceof Error ? productsQuery.error.message : 'Daftar barang tidak dapat dimuat.'}</span></div> : null}
        {cartError ? <div role="alert" className="alert alert-error text-sm"><span>{cartError}</span></div> : null}

        <div className="grid items-start gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border border-base-300 bg-base-100 shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-base-200 px-5 py-4">
              <div>
                <h2 className="text-xl font-bold">Pilih Barang</h2>
                <p className="mt-1 text-sm text-base-content/65">{productsData?.offline ? 'Harga dan stok tersimpan di perangkat (mungkin kedaluwarsa)' : 'Harga jual dan stok terkini'}</p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void productsQuery.refetch()} disabled={productsQuery.isFetching}>Muat ulang</button>
            </div>
            {productsQuery.isPending ? (
              <div className="flex items-center gap-3 px-5 py-10 text-sm text-base-content/65"><span className="loading loading-spinner loading-sm" /> Memuat daftar barang...</div>
            ) : products.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-base-content/65">Belum ada barang. <Link to="/barang" className="font-semibold text-primary underline">Tambahkan barang terlebih dahulu</Link>.</div>
            ) : (
              <div className="divide-y divide-base-200">
                {products.map((product) => (
                  <article key={product.id} className="space-y-3 px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold">{product.name}</h3>
                        <p className="text-sm text-base-content/60">{formatRupiah(product.sellPrice)} per {product.unit}</p>
                      </div>
                      <span className={`badge ${product.stock > 0 ? 'badge-success' : 'badge-warning'}`}>
                        {product.stock > 0 ? `Stok ${formatQuantity(product.stock)} ${product.unit}` : 'Habis'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <label className="form-control w-full sm:max-w-44">
                        <span className="label-text mb-1 text-xs font-semibold">Jumlah ({product.unit})</span>
                        <input
                          aria-label={`Jumlah ${product.name}`}
                          type="number"
                          min="0.001"
                          step="0.001"
                          inputMode="decimal"
                          className="input input-bordered min-h-11 w-full"
                          value={quantityInputs[product.id] ?? '1'}
                          onChange={(event) => setQuantityInputs((values) => ({ ...values, [product.id]: event.currentTarget.value }))}
                        />
                      </label>
                      <button type="button" className="btn btn-primary min-h-11 flex-1 self-end" onClick={() => addProduct(product)}>
                        Tambahkan ke keranjang
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-5 rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Keranjang</h2>
                <p className="mt-1 text-sm text-base-content/65">{cartItems.length} jenis barang</p>
              </div>
              {cartItems.length > 0 ? <button type="button" className="btn btn-ghost btn-sm text-error" onClick={clearCart}>Kosongkan</button> : null}
            </div>

            {cartItems.length === 0 ? (
              <p className="rounded-xl bg-base-200 px-4 py-6 text-center text-sm text-base-content/65">Keranjang masih kosong. Tambahkan barang dari daftar.</p>
            ) : (
              <div className="divide-y divide-base-200 rounded-xl border border-base-200">
                {cartItems.map((item) => {
                  const product = products.find((option) => option.id === item.productId)
                  const lineSubtotal = product && Number.isFinite(item.quantity) && item.quantity > 0
                    ? safeLineTotal(product.sellPrice, item.quantity)
                    : null
                  return (
                    <article key={item.productId} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{product?.name ?? 'Barang tidak ditemukan'}</h3>
                          <p className="text-sm text-base-content/60">{product ? `${formatRupiah(product.sellPrice)} per ${product.unit}` : 'Muat ulang daftar barang'}</p>
                        </div>
                        <button type="button" className="btn btn-ghost btn-sm text-error" onClick={() => removeCartItem(item.productId)} aria-label={`Hapus ${product?.name ?? 'barang'} dari keranjang`}>Hapus</button>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <label className="form-control w-36">
                          <span className="label-text mb-1 text-xs font-semibold">Jumlah {product?.unit ?? ''}</span>
                          <input
                            aria-label={`Jumlah keranjang ${product?.name ?? ''}`}
                            type="number"
                            min="0.001"
                            step="0.001"
                            inputMode="decimal"
                            className="input input-bordered min-h-11 w-full"
                            value={Number.isFinite(item.quantity) ? item.quantity : ''}
                            onChange={(event) => setCartItemQuantity(item.productId, event.currentTarget.value === '' ? Number.NaN : Number(event.currentTarget.value))}
                          />
                        </label>
                        <div className="text-right">
                          <p className="text-xs text-base-content/55">Subtotal baris</p>
                          <p className="font-bold">{lineSubtotal === null ? '—' : formatRupiah(lineSubtotal)}</p>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}

            <div className="rounded-xl bg-primary/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">Perkiraan total</span>
                <span className="text-xl font-black">{previewTotal === null ? '—' : formatRupiah(previewTotal)}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-base-content/65">Perkiraan ini hanya untuk membantu. Server menghitung ulang harga dan total saat transaksi disimpan; total server menjadi hasil akhir.</p>
            </div>

            <Form of={checkoutForm} onSubmit={submitCheckout} className="space-y-4 border-t border-base-200 pt-5">
              {formError ? <div role="alert" className="alert alert-error text-sm"><span>{formError}</span></div> : null}
              <Field of={checkoutForm} path={['paymentMethod']}>
                {(field) => (
                  <label className="form-control w-full">
                    <span className="label-text mb-2 font-semibold">Metode pembayaran</span>
                    <select
                      {...field.props}
                      value={field.input ?? 'lunas'}
                      onChange={(event) => {
                        const value = event.currentTarget.value as 'lunas' | 'utang'
                        field.props.onChange(event)
                        setPaymentMethod(value)
                      }}
                      className="select select-bordered min-h-11 w-full"
                    >
                      <option value="lunas">Lunas</option>
                          <option value="utang" disabled={offlineMode}>Utang{offlineMode ? ' (perlu internet)' : ''}</option>
                    </select>
                    {field.errors?.[0] ? <span className="mt-1 text-sm text-error">{field.errors[0]}</span> : null}
                  </label>
                )}
              </Field>

              {paymentMethod === 'utang' ? (
                <div className="space-y-4 rounded-xl border border-warning/40 bg-warning/5 p-4">
                  <div>
                    <h3 className="font-bold">Data pembeli</h3>
                    <p className="mt-1 text-xs leading-5 text-base-content/65">Nama dan kontak disimpan bersama transaksi. Pencatatan saldo dan pembayaran utang belum tersedia pada tahap ini.</p>
                  </div>
                  <CustomerField form={checkoutForm} path="customerName" label="Nama pembeli" placeholder="Nama lengkap" />
                  <CustomerField form={checkoutForm} path="customerContact" label="Kontak pembeli" placeholder="Nomor telepon atau kontak lain" />
                </div>
              ) : null}

              <button type="submit" className="btn btn-primary min-h-12 w-full text-base" disabled={saleMutation.isPending || productsQuery.isPending || cartItems.length === 0 || (offlineMode && paymentMethod === 'utang')}>
                {saleMutation.isPending ? <span className="loading loading-spinner loading-sm" /> : null}
                {saleMutation.isPending ? 'Menyimpan transaksi...' : offlineMode ? 'Antrekan Transaksi Lunas' : 'Simpan Transaksi'}
              </button>
            </Form>
          </section>
        </div>
      </section>
    </AppShell>
  )
}

function useCheckoutForm() {
  return useForm({ schema: saleCheckoutSchema, initialInput: { paymentMethod: 'lunas' as const } })
}

function CustomerField({ form, path, label, placeholder }: { form: ReturnType<typeof useCheckoutForm>; path: 'customerName' | 'customerContact'; label: string; placeholder: string }) {
  return (
    <Field of={form} path={[path]}>
      {(field) => (
        <label className="form-control w-full">
          <span className="label-text mb-2 font-semibold">{label}</span>
          <input {...field.props} value={field.input ?? ''} className="input input-bordered min-h-11 w-full" placeholder={placeholder} />
          {field.errors?.[0] ? <span className="mt-1 text-sm text-error">{field.errors[0]}</span> : null}
        </label>
      )}
    </Field>
  )
}

type ProductCatalogData = {
  products: ProductOption[]
  offline: boolean
  lastUpdated: string
}

async function fetchProducts(): Promise<ProductCatalogData> {
  let networkError = 'Daftar barang tidak dapat dimuat.'
  let authorizationRejected = false
  try {
    const response = await fetch('/api/products', { credentials: 'same-origin' })
    const payload = (await response.json().catch(() => null)) as { products?: ProductOption[]; error?: string } | null
    if (response.status === 401 || response.status === 403) {
      authorizationRejected = true
      throw new Error(payload?.error ?? 'Sesi tidak lagi berwenang melihat daftar barang. Sambungkan internet dan masuk kembali.')
    }
    if (!response.ok) throw new Error(payload?.error ?? 'Server belum dapat memuat daftar barang.')
    const safeProducts = (payload?.products ?? []).map(({ id, name, unit, sellPrice, stock }) => ({ id, name, unit, sellPrice, stock }))
    try {
      await saveCachedProducts(safeProducts)
    } catch (error) {
      console.warn('Daftar barang dimuat, tetapi tidak dapat disimpan ke cache perangkat.', error)
    }
    return { products: safeProducts, offline: false, lastUpdated: new Date().toISOString() }
  } catch (error) {
    if (authorizationRejected) throw error
    networkError = error instanceof Error ? error.message : networkError
  }

  const cachedProducts = await readCachedProducts()
  if (cachedProducts.length === 0) throw new Error(`${networkError} Tidak ada daftar barang tersimpan untuk digunakan offline.`)
  const lastUpdated = await readProductsCachedAt() ?? new Date(0).toISOString()
  return {
    products: cachedProducts.map(({ id, name, unit, sellPrice, stock }) => ({ id, name, unit, sellPrice, stock })),
    offline: true,
    lastUpdated,
  }
}

function getCartTotal(items: readonly { productId: string; quantity: number }[], products: ProductOption[]): number | null {
  if (items.length === 0) return 0
  const prices = new Map(products.map((product) => [product.id, product.sellPrice]))
  try {
    return calculateSaleTotal(items.map((item) => {
      const unitPrice = prices.get(item.productId)
      if (unitPrice === undefined) throw new RangeError('Barang tidak ditemukan.')
      return { unitPrice, quantity: item.quantity }
    }))
  } catch {
    return null
  }
}

function safeLineTotal(unitPrice: number, quantity: number): number | null {
  try {
    return calculateSaleLineSubtotal(unitPrice, quantity)
  } catch {
    return null
  }
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(value)
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function getUtangRetryKey(userId: string): string {
  const storageKey = `kasier:utang-retry:${userId}`
  if (typeof sessionStorage === 'undefined') return crypto.randomUUID()
  const existing = sessionStorage.getItem(storageKey)
  if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing)) return existing
  const next = crypto.randomUUID()
  sessionStorage.setItem(storageKey, next)
  return next
}

function clearUtangRetryKey(userId: string): void {
  if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(`kasier:utang-retry:${userId}`)
}
