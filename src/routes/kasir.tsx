import { Field, Form, reset, useForm } from '@formisch/react'
import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { useStore } from '@tanstack/react-store'
import * as v from 'valibot'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { getSessionFromRequest } from '@/server/auth'
import { toRole } from '@/shared/roles'
import { addCartItem, cartStore, clearCart, removeCartItem, setCartItemQuantity } from '@/stores/cart'
import {
  calculateSaleLineSubtotal,
  calculateSaleTotal,
  saleCheckoutSchema,
  saleCreateSchema,
  type SaleCheckoutInput,
} from '@/shared/validators/sales'

type ProductOption = {
  id: string
  name: string
  unit: string
  sellPrice: number
  stock: number
}

type SaleResult = {
  id: string
  total: number
  paymentMethod: 'lunas' | 'utang'
  createdAt: string
  items: Array<{
    productId: string
    productName: string
    unit: string
    quantity: number
    unitPrice: number
    subtotal: number
  }>
}

const loadPrivateSession = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getSessionFromRequest(getRequest())
  if (!session) {
    throw redirect({ to: '/login' })
  }

  return {
    user: {
      name: session.user.name,
      email: session.user.email,
      role: toRole(session.user.role),
    },
  }
})

export const Route = createFileRoute('/kasir')({
  loader: () => loadPrivateSession(),
  component: CashierPage,
})

function CashierPage() {
  const router = useRouter()
  const { user } = Route.useLoaderData()
  const cartItems = useStore(cartStore, (state) => state.items)
  const [products, setProducts] = useState<ProductOption[]>([])
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({})
  const [paymentMethod, setPaymentMethod] = useState<'lunas' | 'utang'>('lunas')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [cartError, setCartError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const checkoutForm = useCheckoutForm()

  async function loadProducts() {
    setIsLoading(true)
    setPageError(null)
    try {
      const response = await fetch('/api/products', { credentials: 'same-origin' })
      const payload = (await response.json().catch(() => null)) as { products?: ProductOption[]; error?: string }
      if (!response.ok) throw new Error(payload.error ?? 'Daftar barang tidak dapat dimuat.')
      setProducts(payload.products ?? [])
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Daftar barang tidak dapat dimuat.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadProducts()
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/sign-out', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
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
    const requestBody = {
      paymentMethod: validatedMethod,
      items: items.map(({ productId, quantity }) => ({ productId, quantity })),
      ...(validatedMethod === 'utang' ? { customerName, customerContact } : {}),
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      const payload = (await response.json().catch(() => null)) as { sale?: SaleResult; error?: string }
      if (!response.ok) {
        setFormError(payload.error ?? 'Transaksi gagal disimpan. Periksa stok lalu coba lagi.')
        return
      }
      if (!payload.sale) {
        setFormError('Transaksi tersimpan tetapi konfirmasi server tidak dapat dibaca. Periksa daftar barang sebelum mencoba lagi.')
        return
      }

      const savedSale = payload.sale
      clearCart()
      setPaymentMethod('lunas')
      reset(checkoutForm, { initialInput: { paymentMethod: 'lunas' } })
      setNotice(`Transaksi berhasil disimpan. Total dari server: ${formatRupiah(savedSale.total)}. Nomor transaksi: ${savedSale.id}.`)
      await loadProducts()
    } catch {
      setFormError('Konfirmasi transaksi tidak diterima karena koneksi terputus. Muat ulang stok dan periksa sebelum mencoba lagi.')
    } finally {
      setIsSaving(false)
    }
  }

  const previewTotal = getCartTotal(cartItems, products)

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

        {notice ? <div role="status" className="alert alert-success text-sm"><span>{notice}</span></div> : null}
        {pageError ? <div role="alert" className="alert alert-error text-sm"><span>{pageError}</span></div> : null}
        {cartError ? <div role="alert" className="alert alert-error text-sm"><span>{cartError}</span></div> : null}

        <div className="grid items-start gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border border-base-300 bg-base-100 shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-base-200 px-5 py-4">
              <div>
                <h2 className="text-xl font-bold">Pilih Barang</h2>
                <p className="mt-1 text-sm text-base-content/65">Harga jual dan stok terkini</p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void loadProducts()} disabled={isLoading}>Muat ulang</button>
            </div>
            {isLoading ? (
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
                      <option value="utang">Utang</option>
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

              <button type="submit" className="btn btn-primary min-h-12 w-full text-base" disabled={isSaving || isLoading || cartItems.length === 0}>
                {isSaving ? <span className="loading loading-spinner loading-sm" /> : null}
                {isSaving ? 'Menyimpan transaksi...' : 'Simpan Transaksi'}
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
