import { Field, Form, reset, useForm } from '@formisch/react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { getSessionFromRequest } from '@/server/auth'
import { toRole } from '@/shared/roles'
import {
  cashierCreateSchema,
  type CashierCreateInput,
} from '@/shared/validators/users'

type CashierAccount = {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

const loadOwnerSession = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getSessionFromRequest(getRequest())
  if (!session) {
    throw redirect({ to: '/login' })
  }
  if (toRole(session.user.role) !== 'pemilik') {
    throw redirect({ to: '/' })
  }

  return {
    user: {
      name: session.user.name,
      email: session.user.email,
      role: 'pemilik' as const,
    },
  }
})

export const Route = createFileRoute('/akun')({
  loader: () => loadOwnerSession(),
  component: AccountsPage,
})

function AccountsPage() {
  const router = useRouter()
  const { user } = Route.useLoaderData()
  const [accounts, setAccounts] = useState<CashierAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const createForm = useForm({ schema: cashierCreateSchema })

  async function loadAccounts() {
    setIsLoading(true)
    setPageError(null)
    try {
      const response = await fetch('/api/users', { credentials: 'same-origin' })
      const payload = (await response.json().catch(() => null)) as {
        users?: CashierAccount[]
        error?: string
      }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Daftar akun kasir tidak dapat dimuat.')
      }
      setAccounts(payload.users ?? [])
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Daftar akun kasir tidak dapat dimuat.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadAccounts()
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

  async function submitCreate(data: CashierCreateInput) {
    setFormError(null)
    setNotice(null)
    setIsSaving(true)
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const payload = (await response.json().catch(() => null)) as { error?: string }
      if (!response.ok) {
        setFormError(payload.error ?? 'Akun kasir gagal dibuat.')
        return
      }
      reset(createForm)
      setNotice('Akun kasir berhasil dibuat. Berikan email dan kata sandi kepada kasir dengan aman.')
      await loadAccounts()
    } catch {
      setFormError('Server tidak dapat dihubungi. Coba lagi.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AppShell user={user} onLogout={handleLogout}>
      <section className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Khusus pemilik</p>
          <h1 className="mt-2 text-3xl font-bold">Kelola Akun Kasir</h1>
          <p className="mt-2 max-w-2xl text-base-content/70">
            Buat akun untuk kasir toko. Akun baru otomatis mendapat peran kasir.
          </p>
        </div>

        {notice ? <div className="alert alert-success text-sm"><span>{notice}</span></div> : null}
        {pageError ? <div role="alert" className="alert alert-error text-sm"><span>{pageError}</span></div> : null}

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-bold">Buat akun kasir</h2>
              <p className="mt-1 text-sm text-base-content/65">Isi nama, email masuk, dan kata sandi awal.</p>
            </div>
            {formError ? <div role="alert" className="alert alert-error mb-4 text-sm"><span>{formError}</span></div> : null}
            <Form of={createForm} onSubmit={submitCreate} className="space-y-4">
              <Field of={createForm} path={['name']}>
                {(field) => (
                  <label className="form-control w-full">
                    <span className="label-text mb-2 font-semibold">Nama kasir</span>
                    <input {...field.props} value={field.input ?? ''} className="input input-bordered w-full" autoComplete="name" />
                    {field.errors?.[0] ? <span className="mt-1 text-sm text-error">{field.errors[0]}</span> : null}
                  </label>
                )}
              </Field>
              <Field of={createForm} path={['email']}>
                {(field) => (
                  <label className="form-control w-full">
                    <span className="label-text mb-2 font-semibold">Email untuk masuk</span>
                    <input {...field.props} value={field.input ?? ''} type="email" className="input input-bordered w-full" autoComplete="email" />
                    {field.errors?.[0] ? <span className="mt-1 text-sm text-error">{field.errors[0]}</span> : null}
                  </label>
                )}
              </Field>
              <Field of={createForm} path={['password']}>
                {(field) => (
                  <label className="form-control w-full">
                    <span className="label-text mb-2 font-semibold">Kata sandi awal</span>
                    <input {...field.props} value={field.input ?? ''} type="password" className="input input-bordered w-full" autoComplete="new-password" />
                    <span className="mt-1 text-xs text-base-content/55">Minimal 8 karakter.</span>
                    {field.errors?.[0] ? <span className="mt-1 text-sm text-error">{field.errors[0]}</span> : null}
                  </label>
                )}
              </Field>
              <button type="submit" className="btn btn-primary min-h-11 w-full" disabled={isSaving}>
                {isSaving ? <span className="loading loading-spinner loading-sm" /> : null}
                Buat Akun Kasir
              </button>
            </Form>
          </section>

          <section className="rounded-2xl border border-base-300 bg-base-100 shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-base-200 px-5 py-4">
              <div>
                <h2 className="text-xl font-bold">Akun kasir</h2>
                <p className="mt-1 text-sm text-base-content/65">{accounts.length} akun terdaftar</p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void loadAccounts()} disabled={isLoading}>
                Muat ulang
              </button>
            </div>
            {isLoading ? (
              <div className="flex items-center gap-3 px-5 py-10 text-sm text-base-content/65"><span className="loading loading-spinner loading-sm" /> Memuat akun...</div>
            ) : accounts.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-base-content/65">Belum ada akun kasir.</div>
            ) : (
              <div className="divide-y divide-base-200">
                {accounts.map((account) => (
                  <article key={account.id} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold">{account.name}</h3>
                      <p className="text-sm text-base-content/65">{account.email}</p>
                    </div>
                    <span className="badge badge-outline self-start sm:self-auto">Kasir</span>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </AppShell>
  )
}
