import { Field, Form, reset, useField, useForm } from '@formisch/react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { clearCachedCashierPage } from '@/shared/pwa'
import { requireRouteSession } from '@/shared/route-access'
import { stockInCreateSchema, type StockInCreateInput } from '@/shared/validators/stock-ins'

type ProductOption = {
  id: string
  name: string
  unit: string
  buyPrice: number
  stock: number
}

type StockIn = {
  id: string
  productId: string
  productName: string
  unit: string
  quantity: number
  buyPrice: number
  receivedDate: string
  createdBy: string
  createdAt: string
}

export const Route = createFileRoute('/barang-masuk')({
  beforeLoad: ({ context }) => ({ session: requireRouteSession(context) }),
  component: StockInPage,
})

function StockInPage() {
  const router = useRouter()
  const { session } = Route.useRouteContext()
  const user = session!.user
  const [products, setProducts] = useState<ProductOption[]>([])
  const [stockIns, setStockIns] = useState<StockIn[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const stockInForm = useForm({
    schema: stockInCreateSchema,
    initialInput: { receivedDate: today() },
  })
  const buyPriceField = useField(stockInForm, { path: ['buyPrice'] })

  async function loadData() {
    setIsLoading(true)
    setPageError(null)
    try {
      const [productsResponse, stockInsResponse] = await Promise.all([
        fetch('/api/products', { credentials: 'same-origin' }),
        fetch('/api/stock-ins', { credentials: 'same-origin' }),
      ])
      const productsPayload = (await productsResponse.json().catch(() => null)) as { products?: ProductOption[]; error?: string }
      const stockInsPayload = (await stockInsResponse.json().catch(() => null)) as { stockIns?: StockIn[]; error?: string }
      if (!productsResponse.ok) throw new Error(productsPayload.error ?? 'Daftar barang tidak dapat dimuat.')
      if (!stockInsResponse.ok) throw new Error(stockInsPayload.error ?? 'Riwayat barang masuk tidak dapat dimuat.')
      setProducts(productsPayload.products ?? [])
      setStockIns(stockInsPayload.stockIns ?? [])
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Data barang masuk tidak dapat dimuat.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

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

  async function submitStockIn(data: StockInCreateInput) {
    setFormError(null)
    setNotice(null)
    setIsSaving(true)
    try {
      const response = await fetch('/api/stock-ins', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const payload = (await response.json().catch(() => null)) as { error?: string }
      if (!response.ok) {
        setFormError(payload.error ?? 'Barang masuk gagal disimpan.')
        return
      }
      reset(stockInForm, { initialInput: { receivedDate: today() } })
      setNotice('Barang masuk berhasil disimpan dan stok bertambah.')
      await loadData()
    } catch {
      setFormError('Server tidak dapat dihubungi. Coba lagi.')
    } finally {
      setIsSaving(false)
    }
  }

  function chooseProduct(productId: string) {
    const product = products.find((item) => item.id === productId)
    if (product) buyPriceField.onChange(product.buyPrice)
  }

  return (
    <AppShell user={user} onLogout={handleLogout}>
      <section className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Tahap 2</p>
            <h1 className="mt-2 text-3xl font-bold">Barang Masuk</h1>
            <p className="mt-2 max-w-2xl text-base-content/70">Catat stok yang baru datang agar jumlah stok barang bertambah otomatis.</p>
          </div>
          <Link to="/barang" className="btn btn-outline min-h-11">Lihat Daftar Barang</Link>
        </div>

        {notice ? <div className="alert alert-success text-sm"><span>{notice}</span></div> : null}
        {pageError ? <div role="alert" className="alert alert-error text-sm"><span>{pageError}</span></div> : null}

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-bold">Catat Barang Masuk</h2>
              <p className="mt-1 text-sm text-base-content/65">Simpan jumlah, harga beli saat datang, dan tanggal penerimaan.</p>
            </div>
            {formError ? <div role="alert" className="alert alert-error mb-4 text-sm"><span>{formError}</span></div> : null}
            {products.length === 0 && !isLoading ? (
              <div className="alert alert-warning text-sm">
                <span>Belum ada barang untuk dipilih. <Link to="/barang" className="font-semibold underline">Tambah barang dulu</Link>.</span>
              </div>
            ) : (
              <Form of={stockInForm} onSubmit={submitStockIn} className="space-y-4">
                <Field of={stockInForm} path={['productId']}>
                  {(field) => (
                    <label className="form-control w-full">
                      <span className="label-text mb-2 font-semibold">Barang</span>
                      <select {...field.props} value={field.input ?? ''} onChange={(event) => { field.props.onChange(event); chooseProduct(event.currentTarget.value) }} className="select select-bordered w-full">
                        <option value="">Pilih barang</option>
                        {products.map((product) => <option key={product.id} value={product.id}>{product.name} — stok {formatQuantity(product.stock)} {product.unit}</option>)}
                      </select>
                      {field.errors?.[0] ? <span className="mt-1 text-sm text-error">{field.errors[0]}</span> : null}
                    </label>
                  )}
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField form={stockInForm} path="quantity" label="Jumlah masuk" step="0.001" placeholder="Contoh: 10 atau 2,5" suffix="Maksimal 3 angka desimal" />
                  <NumberField form={stockInForm} path="buyPrice" label="Harga beli saat datang" step="1" placeholder="Contoh: 14000" suffix="Bilangan bulat Rupiah" />
                </div>
                <Field of={stockInForm} path={['receivedDate']}>
                  {(field) => (
                    <label className="form-control w-full">
                      <span className="label-text mb-2 font-semibold">Tanggal barang masuk</span>
                      <input {...field.props} value={field.input ?? ''} type="date" className="input input-bordered w-full" />
                      {field.errors?.[0] ? <span className="mt-1 text-sm text-error">{field.errors[0]}</span> : null}
                    </label>
                  )}
                </Field>
                <button type="submit" className="btn btn-primary min-h-11 w-full" disabled={isSaving || products.length === 0}>
                  {isSaving ? <span className="loading loading-spinner loading-sm" /> : null}
                  Simpan Barang Masuk
                </button>
              </Form>
            )}
          </section>

          <section className="rounded-2xl border border-base-300 bg-base-100 shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-base-200 px-5 py-4">
              <div><h2 className="text-xl font-bold">Riwayat Barang Masuk</h2><p className="mt-1 text-sm text-base-content/65">Semua pencatatan stok yang tersimpan</p></div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void loadData()} disabled={isLoading}>Muat ulang</button>
            </div>
            {isLoading ? (
              <div className="flex items-center gap-3 px-5 py-10 text-sm text-base-content/65"><span className="loading loading-spinner loading-sm" /> Memuat riwayat...</div>
            ) : stockIns.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-base-content/65">Belum ada catatan barang masuk.</div>
            ) : (
              <>
                <div className="divide-y divide-base-200 md:hidden">
                  {stockIns.map((stockIn) => <StockInCard key={stockIn.id} stockIn={stockIn} />)}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="table">
                    <thead><tr><th>Tanggal</th><th>Barang</th><th>Jumlah</th><th>Harga beli</th><th>Dicatat oleh</th></tr></thead>
                    <tbody>{stockIns.map((stockIn) => <tr key={stockIn.id}><td>{formatDate(stockIn.receivedDate)}</td><td><div className="font-semibold">{stockIn.productName}</div><div className="text-xs text-base-content/60">per {stockIn.unit}</div></td><td>{formatQuantity(stockIn.quantity)} {stockIn.unit}</td><td>{formatRupiah(stockIn.buyPrice)}</td><td>{stockIn.createdBy}</td></tr>)}</tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      </section>
    </AppShell>
  )
}

function NumberField({ form, path, label, step, placeholder, suffix }: { form: ReturnType<typeof useForm>; path: 'quantity' | 'buyPrice'; label: string; step: string; placeholder: string; suffix: string }) {
  return (
    <Field of={form} path={[path]}>
      {(field) => (
        <label className="form-control w-full">
          <span className="label-text mb-2 font-semibold">{label}</span>
          <input {...field.props} value={typeof field.input === 'number' && Number.isFinite(field.input) ? field.input : ''} onChange={(event) => field.onChange(event.currentTarget.value === '' ? Number.NaN : Number(event.currentTarget.value))} type="number" min="0" step={step} inputMode="decimal" className="input input-bordered w-full" placeholder={placeholder} />
          <span className="mt-1 text-xs text-base-content/55">{suffix}</span>
          {field.errors?.[0] ? <span className="mt-1 text-sm text-error">{field.errors[0]}</span> : null}
        </label>
      )}
    </Field>
  )
}

function StockInCard({ stockIn }: { stockIn: StockIn }) {
  return <article className="space-y-3 px-5 py-4"><div className="flex items-start justify-between gap-4"><div><h3 className="font-bold">{stockIn.productName}</h3><p className="text-sm text-base-content/60">{formatDate(stockIn.receivedDate)} · dicatat oleh {stockIn.createdBy}</p></div><span className="badge badge-success">Stok masuk</span></div><div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-base-content/55">Jumlah</p><p className="mt-1 font-semibold">{formatQuantity(stockIn.quantity)} {stockIn.unit}</p></div><div><p className="text-base-content/55">Harga beli</p><p className="mt-1 font-semibold">{formatRupiah(stockIn.buyPrice)}</p></div></div></article>
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(value)
}
