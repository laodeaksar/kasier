import { Field, Form, useForm } from '@formisch/react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { loginSchema } from '@/shared/validators/auth'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.session) throw redirect({ to: '/' })
  },
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const loginForm = useForm({ schema: loginSchema })
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submitLogin(data: { email: string; password: string }) {
    setServerError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null)
        setServerError(readErrorMessage(payload) ?? 'Email atau kata sandi salah.')
        return
      }

      await router.invalidate()
      await router.navigate({ to: '/' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-base-200 px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-xl lg:grid-cols-[1fr_0.9fr]">
          <section className="hidden bg-primary p-10 text-primary-content lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="text-2xl font-black tracking-tight">AR Shop</div>
              <p className="mt-1 text-sm text-primary-content/75">Kasier toko sembako</p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-content/70">Kasier</p>
              <h1 className="mt-3 text-4xl font-bold leading-tight">Catatan toko yang rapi, mulai dari sini.</h1>
              <p className="mt-5 max-w-sm text-primary-content/80">Masuk menggunakan akun pemilik atau kasir yang sudah dibuat.</p>
            </div>
          </section>

          <section className="p-6 sm:p-10">
            <div className="mb-8 lg:hidden">
              <p className="text-xl font-black text-primary">AR Shop</p>
              <p className="text-sm text-base-content/60">Kasier toko sembako</p>
            </div>
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Masuk</p>
              <h1 className="mt-2 text-3xl font-bold">Selamat datang kembali</h1>
              <p className="mt-2 text-sm text-base-content/65">Gunakan akun yang diberikan oleh pemilik toko.</p>
            </div>

            {serverError ? (
              <div role="alert" className="alert alert-error mb-5 text-sm">
                <span>{serverError}</span>
              </div>
            ) : null}

            <Form of={loginForm} onSubmit={submitLogin} className="space-y-5">
              <Field of={loginForm} path={['email']}>
                {(field) => (
                  <label className="form-control w-full">
                    <span className="label-text mb-2 font-semibold">Email</span>
                    <input {...field.props} value={field.input ?? ''} type="email" placeholder="nama@arshop.id" className="input input-bordered w-full" autoComplete="email" />
                    {field.errors?.[0] ? <span className="mt-1 text-sm text-error">{field.errors[0]}</span> : null}
                  </label>
                )}
              </Field>

              <Field of={loginForm} path={['password']}>
                {(field) => (
                  <label className="form-control w-full">
                    <span className="label-text mb-2 font-semibold">Kata sandi</span>
                    <input {...field.props} value={field.input ?? ''} type="password" placeholder="Minimal 8 karakter" className="input input-bordered w-full" autoComplete="current-password" />
                    {field.errors?.[0] ? <span className="mt-1 text-sm text-error">{field.errors[0]}</span> : null}
                  </label>
                )}
              </Field>

              <button type="submit" className="btn btn-primary min-h-12 w-full" disabled={isSubmitting}>
                {isSubmitting ? <span className="loading loading-spinner loading-sm" /> : null}
                {isSubmitting ? 'Memeriksa...' : 'Masuk ke Kasier'}
              </button>
            </Form>
          </section>
        </div>
      </div>
    </main>
  )
}

function readErrorMessage(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null
  if ('message' in payload && typeof payload.message === 'string') return payload.message
  if ('error' in payload && typeof payload.error === 'object' && payload.error !== null && 'message' in payload.error && typeof payload.error.message === 'string') {
    return payload.error.message
  }
  return null
}
