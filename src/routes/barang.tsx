import { Field, Form, reset, useForm } from '@formisch/react'
import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { getSessionFromRequest } from '@/server/auth'
import { toRole } from '@/shared/roles'
import {
  productCreateSchema,
  productPriceUpdateSchema,
  type ProductCreateInput,
  type ProductPriceUpdateInput,
} from '@/shared/validators/products'

type Product = {
  id: string
  name: string
  unit: string
  buyPrice: number
  sellPrice: number
  photoUrl: string | null
  stock: number
  showInCatalog: boolean
  createdAt: string
  updatedAt: string
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

export const Route = createFileRoute('/barang')({
  loader: () => loadPrivateSession(),
  component: ProductsPage,
})

function ProductsPage() {
  const router = useRouter()
  const { user } = Route.useLoaderData()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const createForm = useForm({ schema: productCreateSchema })
  const priceForm = useForm({ schema: productPriceUpdateSchema })

  async function loadProducts() {
    setIsLoading(true)
    setPageError(null)
    try {
      const response = await fetch('/api/products', { credentials: 'same-origin' })
      const payload = (await response.json().catch(() => null)) as { products?: Product[]; error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Daftar barang tidak dapat dimuat.')
      }
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

  async function submitCreate(data: ProductCreateInput) {
    setFormError(null)
    setNotice(null)
    setIsSaving(true)
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const payload = (await response.json().catch(() => null)) as { error?: string }
      if (!response.ok) {
        setFormError(payload.error ?? 'Barang gagal disimpan.')
        return
      }
      reset(createForm)
      setNotice('Barang baru berhasil ditambahkan.')
      await loadProducts()
    } catch {
      setFormError('Server tidak dapat dihubungi. Coba lagi.')
    } finally {
      setIsSaving(false)
    }
  }

  function startEditing(product: Product) {
    setEditingProduct(product)
    setFormError(null)
    reset(priceForm, {
      initialInput: {
        buyPrice: product.buyPrice,
        sellPrice: product.sellPrice,
      },
    })
  }

  async function submitPrice(data: ProductPriceUpdateInput) {
    if (!editingProduct) return
    setFormError(null)
    setNotice(null)
    setIsSaving(true)
    try {
      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const payload = (await response.json().catch(() => null)) as { error?: string }
      if (!response.ok) {
        setFormError(payload.error ?? 'Harga gagal diubah.')
        return
      }
      setEditingProduct(null)
      reset(priceForm)
      setNotice('Harga barang berhasil diubah.')
      await loadProducts()
    } catch {
      setFormError('Server tidak dapat dihubungi. Coba lagi.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AppShell user={user} onLogout={handleLogout}>
      <section className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Tahap 2</p>
            <h1 className="mt-2 text-3xl font-bold">Daftar Barang</h1>
            <p className="mt-2 max-w-2xl text-base-content/70">Lihat barang, harga, dan stok yang tersimpan di AR Shop.</p>
          </div>
          <Link to="/barang-masuk" className="btn btn-primary min-h-11">
            Catat Barang Masuk
          </Link>
        </div>

        {notice ? <div className="alert alert-success text-sm"><span>{notice}</span></div> : null}
        {pageError ? <div role="alert" className="alert alert-error text-sm"><span>{pageError}</span></div> : null}

        {user.role === 'pemilik' ? (
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
              <div className="mb-5">
                <h2 className="text-xl font-bold">Tambah Barang</h2>
                <p className="mt-1 text-sm text-base-content/65">Barang baru mulai dengan stok 0. Tambahkan stoknya melalui menu Barang Masuk.</p>
              </div>
              {formError && !editingProduct ? <div role="alert" className="alert alert-error mb-4 text-sm"><span>{formError}</span></div> : null}
              <Form of={createForm} onSubmit={submitCreate} className="space-y-4">
                <Field of={createForm} path={['name']}>
                  {(field) => (
                    <label className="form-control w-full">
                      <span className="label-text mb-2 font-semibold">Nama barang</span>
                      <input {...field.props} value={field.input ?? ''} className="input input-bordered w-full" placeholder="Contoh: Beras Ramos" />
                      {field.errors?.[0] ? <span className="mt-1 text-sm text-error">{field.errors[0]}</span> : null}
                    </label>
                  )}
                </Field>
                <Field of={createForm} path={['unit']}>
                  {(field) => (
                    <label className="form-control w-full">
                      <span className="label-text mb-2 font-semibold">Satuan</span>
                      <input {...field.props} value={field.input ?? ''} className="input input-bordered w-full" placeholder="kg, liter, atau pcs" />
                      {field.errors?.[0] ? <span className="mt-1 text-sm text-error">{field.errors[0]}</span> : null}
                    </label>
                  )}
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <PriceField form={createForm} path="buyPrice" label="Harga beli" />
                  <PriceField form={createForm} path="sellPrice" label="Harga jual" />
                </div>
                <button type="submit" className="btn btn-primary min-h-11 w-full" disabled={isSaving}>
                  {isSaving && !editingProduct ? <span className="loading loading-spinner loading-sm" /> : null}
                  Simpan Barang
                </button>
              </Form>
            </section>

            {editingProduct ? (
              <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-sm">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Ubah harga</p>
                    <h2 className="mt-1 text-xl font-bold">{editingProduct.name}</h2>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingProduct(null)}>Tutup</button>
                </div>
                {formError && editingProduct ? <div role="alert" className="alert alert-error mb-4 text-sm"><span>{formError}</span></div> : null}
                <Form of={priceForm} onSubmit={submitPrice} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <PriceField form={priceForm} path="buyPrice" label="Harga beli" />
                    <PriceField form={priceForm} path="sellPrice" label="Harga jual" />
                  </div>
                  <button type="submit" className="btn btn-primary min-h-11 w-full" disabled={isSaving}>
                    {isSaving && editingProduct ? <span className="loading loading-spinner loading-sm" /> : null}
                    Simpan Perubahan Harga
                  </button>
                </Form>
              </section>
            ) : (
              <section className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
                <h2 className="text-xl font-bold">Petunjuk pemilik</h2>
                <p className="mt-2 text-sm leading-6 text-base-content/70">Pilih tombol <strong>Ubah harga</strong> pada daftar barang untuk memperbarui harga beli dan harga jual.</p>
              </section>
            )}
          </div>
        ) : null}

        <section className="rounded-2xl border border-base-300 bg-base-100 shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-base-200 px-5 py-4">
            <div>
              <h2 className="text-xl font-bold">Semua Barang</h2>
              <p className="mt-1 text-sm text-base-content/65">{products.length} barang tersimpan</p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void loadProducts()} disabled={isLoading}>Muat ulang</button>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-3 px-5 py-10 text-sm text-base-content/65"><span className="loading loading-spinner loading-sm" /> Memuat daftar barang...</div>
          ) : products.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-base-content/65">Belum ada barang. Pemilik dapat menambahkan barang dari formulir di atas.</div>
          ) : (
            <>
              <div className="divide-y divide-base-200 md:hidden">
                {products.map((product) => <ProductCard key={product.id} product={product} canEdit={user.role === 'pemilik'} onEdit={startEditing} />)}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="table">
                  <thead><tr><th>Barang</th><th>Stok</th><th>Harga beli</th><th>Harga jual</th>{user.role === 'pemilik' ? <th /> : null}</tr></thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td><div className="font-semibold">{product.name}</div><div className="text-xs text-base-content/60">per {product.unit}</div></td>
                        <td className="font-semibold">{formatQuantity(product.stock)} {product.unit}</td>
                        <td>{formatRupiah(product.buyPrice)}</td>
                        <td>{formatRupiah(product.sellPrice)}</td>
                        {user.role === 'pemilik' ? <td className="text-right"><button type="button" className="btn btn-outline btn-sm" onClick={() => startEditing(product)}>Ubah harga</button></td> : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </section>
    </AppShell>
  )
}

function PriceField({ form, path, label }: { form: ReturnType<typeof useForm>; path: 'buyPrice' | 'sellPrice'; label: string }) {
  return (
    <Field of={form} path={[path]}>
      {(field) => (
        <label className="form-control w-full">
          <span className="label-text mb-2 font-semibold">{label}</span>
          <input
            {...field.props}
            value={typeof field.input === 'number' && Number.isFinite(field.input) ? field.input : ''}
            onChange={(event) => field.onChange(event.currentTarget.value === '' ? Number.NaN : Number(event.currentTarget.value))}
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            className="input input-bordered w-full"
            placeholder="0"
          />
          {field.errors?.[0] ? <span className="mt-1 text-sm text-error">{field.errors[0]}</span> : null}
        </label>
      )}
    </Field>
  )
}

function ProductCard({ product, canEdit, onEdit }: { product: Product; canEdit: boolean; onEdit: (product: Product) => void }) {
  return (
    <article className="space-y-3 px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div><h3 className="font-bold">{product.name}</h3><p className="text-sm text-base-content/60">per {product.unit}</p></div>
        <span className={`badge ${product.stock > 0 ? 'badge-success' : 'badge-warning'}`}>{product.stock > 0 ? 'Ada stok' : 'Habis'}</span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div><p className="text-base-content/55">Stok</p><p className="mt-1 font-semibold">{formatQuantity(product.stock)} {product.unit}</p></div>
        <div><p className="text-base-content/55">Harga beli</p><p className="mt-1 font-semibold">{formatRupiah(product.buyPrice)}</p></div>
        <div><p className="text-base-content/55">Harga jual</p><p className="mt-1 font-semibold">{formatRupiah(product.sellPrice)}</p></div>
      </div>
      {canEdit ? <button type="button" className="btn btn-outline btn-sm w-full" onClick={() => onEdit(product)}>Ubah harga</button> : null}
    </article>
  )
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(value)
}
