import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { requireRouteSession } from '@/shared/route-access'
import { clearCachedCashierPage } from '@/shared/pwa'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => ({ session: requireRouteSession(context) }),
  component: DashboardPage,
})

function DashboardPage() {
  const router = useRouter()
  const { session } = Route.useRouteContext()
  const user = session!.user

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

  return (
    <AppShell user={user} onLogout={handleLogout}>
      <section className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Tahap 3</p>
          <h1 className="mt-2 text-3xl font-bold text-base-content">Kasir dan inventaris</h1>
          <p className="mt-2 max-w-2xl text-base-content/70">
            Catat transaksi dengan harga dari server. Stok berubah bersama transaksi dan tidak dapat menjadi minus.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Link to="/kasir" className="rounded-2xl border border-primary/30 bg-base-100 p-5 shadow-sm transition hover:border-primary">
            <h2 className="font-bold">Kasir</h2>
            <p className="mt-2 text-sm font-semibold text-primary">Catat transaksi</p>
            <p className="mt-2 text-sm text-base-content/65">Pilih barang dan jumlah, lalu simpan pembayaran Lunas atau data pembeli Utang.</p>
          </Link>
          <Link to="/barang" className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm transition hover:border-primary/50">
            <h2 className="font-bold">Daftar Barang</h2>
            <p className="mt-2 text-sm font-semibold text-primary">Buka daftar barang</p>
            <p className="mt-2 text-sm text-base-content/65">Lihat stok dan harga. Pemilik dapat menambah barang serta mengubah harga.</p>
          </Link>
          <Link to="/barang-masuk" className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm transition hover:border-primary/50">
            <h2 className="font-bold">Barang Masuk</h2>
            <p className="mt-2 text-sm font-semibold text-primary">Catat stok bertambah</p>
            <p className="mt-2 text-sm text-base-content/65">Pilih barang, isi jumlah, harga beli, dan tanggal barang masuk.</p>
          </Link>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <h2 className="font-bold">Catatan keamanan</h2>
          <p className="mt-2 text-sm leading-6 text-base-content/70">
            Kasir dapat melihat barang dan mencatat barang masuk. Hanya pemilik yang dapat menambah barang atau mengubah harga. Pemeriksaan ini berjalan di server, bukan hanya dengan menyembunyikan tombol.
          </p>
        </div>
      </section>
    </AppShell>
  )
}
