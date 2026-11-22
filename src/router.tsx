import { createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import type { AppRouterContext } from '@/routes/__root'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
    },
  })

  return createRouter({
    routeTree,
    context: { session: null, queryClient } satisfies AppRouterContext,
    scrollRestoration: true,
    defaultPreload: 'intent',
  })
}
