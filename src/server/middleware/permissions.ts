import { getSessionFromRequest } from '@/server/auth'
import { ApiError } from '@/server/api/errors'
import type { Role } from '@/shared/roles'

export async function requireSession(request: Request) {
  const session = await getSessionFromRequest(request)
  if (!session) {
    throw new ApiError(401, 'Anda harus login terlebih dahulu.')
  }
  return session
}

export async function requireRole(request: Request, allowedRoles: readonly Role[]) {
  const session = await requireSession(request)
  const role = session.user.role === 'pemilik' ? 'pemilik' : 'kasir'
  if (!allowedRoles.includes(role)) {
    throw new ApiError(403, 'Anda tidak memiliki izin untuk melakukan tindakan ini.')
  }
  return session
}
