import type { Context, Next } from 'hono'
import { getSessionFromRequest } from '@/server/auth'
import { ApiError } from '@/server/api/errors'
import type { Role } from '@/shared/roles'

export type ApiEnv = {
  Variables: {
    session: Awaited<ReturnType<typeof getSessionFromRequest>>
  }
}

export async function loadSessionContext(context: Context<ApiEnv>, next: Next) {
  const session = await getSessionFromRequest(context.req.raw)
  context.set('session', session)
  await next()
}

export function requireSession(context: Context<ApiEnv>) {
  const session = context.get('session')
  if (!session) {
    throw new ApiError(401, 'Anda harus login terlebih dahulu.')
  }
  return session
}

export function requireRole(context: Context<ApiEnv>, allowedRoles: readonly Role[]) {
  const session = requireSession(context)
  const role = session.user.role === 'pemilik' ? 'pemilik' : 'kasir'
  if (!allowedRoles.includes(role)) {
    throw new ApiError(403, 'Anda tidak memiliki izin untuk melakukan tindakan ini.')
  }
  return session
}
