import { redirect } from '@tanstack/react-router'
import type { AppRouterContext, AppSession } from '@/routes/__root'

type SessionContext = Pick<AppRouterContext, 'session'>

export function requireRouteSession(context: SessionContext): AppSession {
  if (!context.session) {
    throw redirect({ to: '/login' })
  }
  return context.session
}

export function requireOwnerRoute(context: SessionContext): AppSession {
  const session = requireRouteSession(context)
  if (session.user.role !== 'pemilik') {
    throw redirect({ to: '/' })
  }
  return session
}
