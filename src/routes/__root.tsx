import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { QueryClientProvider } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import appCss from '../styles.css?url'
import { getSessionFromRequest } from '@/server/auth'
import { registerPwaServiceWorker } from '@/shared/pwa'
import { toRole, type Role } from '@/shared/roles'

export type AppSession = {
  user: {
    id: string
    name: string
    email: string
    role: Role
  }
}

export type AppRouterContext = {
  session: AppSession | null
  queryClient: QueryClient
}

const loadAppSession = createServerFn({ method: 'GET' }).handler(async (): Promise<AppSession | null> => {
  const session = await getSessionFromRequest(getRequest())
  if (!session) return null

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: toRole(session.user.role),
    },
  }
})

export const Route = createRootRouteWithContext<AppRouterContext>()({
  beforeLoad: async () => ({ session: await loadAppSession() }),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Kasier — AR Shop' },
      { name: 'description', content: 'Aplikasi kasir dan pencatatan toko AR Shop.' },
      { name: 'theme-color', content: '#0f766e' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'icon', href: '/ar-shop-logo.svg', type: 'image/svg+xml' },
    ],
  }),
  component: RootDocument,
})

function RootDocument() {
  const { queryClient } = Route.useRouteContext()
  useEffect(() => registerPwaServiceWorker(), [])

  return (
    <QueryClientProvider client={queryClient}>
      <html lang="id">
        <head>
          <HeadContent />
        </head>
        <body>
          <Outlet />
          <Scripts />
        </body>
      </html>
    </QueryClientProvider>
  )
}
