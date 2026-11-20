import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import type { Role } from '@/shared/roles'

type AppShellProps = {
  user: {
    name: string
    email: string
    role: Role
  }
  onLogout: () => Promise<void>
  children: ReactNode
}

export function AppShell({ user, onLogout, children }: AppShellProps) {
  const roleLabel = user.role === 'pemilik' ? 'Pemilik' : 'Kasir'

  return (
    <div className="min-h-screen bg-base-200">
      <header className="border-b border-base-300 bg-base-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="shrink-0">
            <p className="text-lg font-black tracking-tight text-primary">AR Shop</p>
            <p className="text-xs text-base-content/60">Kasier toko sembako</p>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-base-content/60">{roleLabel}</p>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={onLogout}>
              Keluar
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8" aria-label="Menu utama">
          <Link to="/" className="btn btn-ghost btn-sm shrink-0">
            Ringkasan
          </Link>
          <Link to="/barang" className="btn btn-ghost btn-sm shrink-0">
            Daftar Barang
          </Link>
          <Link to="/barang-masuk" className="btn btn-ghost btn-sm shrink-0">
            Barang Masuk
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
