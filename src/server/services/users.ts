import { asc, eq } from 'drizzle-orm'
import { ApiError } from '@/server/api/errors'
import { getDb } from '@/db/client'
import { user } from '@/db/schema'
import { getAuthForAccountCreation } from '@/server/auth'
import type { CashierCreateInput } from '@/shared/validators/users'

export type UserDto = {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

export async function listCashierAccounts(): Promise<UserDto[]> {
  const rows = await getDb()
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.role, 'kasir'))
    .orderBy(asc(user.name))

  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))
}

export async function createCashierAccount(input: CashierCreateInput): Promise<UserDto> {
  const email = input.email.toLowerCase()
  const existing = await getDb()
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1)

  if (existing[0]) {
    throw new ApiError(409, 'Email sudah digunakan. Gunakan email lain.')
  }

  try {
    const result = await getAuthForAccountCreation().api.signUpEmail({
      body: { name: input.name, email, password: input.password },
      headers: new Headers(),
    })

    return {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: 'kasir',
      createdAt: result.user.createdAt.toISOString(),
    }
  } catch {
    throw new ApiError(500, 'Akun kasir gagal dibuat. Periksa kembali konfigurasi login dan coba lagi.')
  }
}
