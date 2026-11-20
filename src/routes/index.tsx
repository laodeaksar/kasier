import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { AppShell } from '@/components/AppShell'
import { getSessionFromRequest } from '@/server/auth'
import { toRole } from '@/shared/roles'

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

export const Route = createFileRoute('/')({
  loader: () => loadPrivateSession(),
  component: DashboardPage,
})

function DashboardPage() {
  const router = useRouter()
  const { user } = Route.useLoaderData()

  async function handleLogout() {
    await fetch('/api/auth/sign-out', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    await router.navigate({ to: '/login' })
  }

  return (
    <AppShell user={user} onLogout={handleLogout}>
      <section className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Tahap 2</p>
          <h1 className="mt-2 text-3xl font-bold text-base-content">Produk dan inventaris</h1>
          <p className="mt-2 max-w-2xl text-base-content/70">
            Kelola daftar barang dan catat barang masuk. Perubahan stok disimpan di database melalui aturan server.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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
