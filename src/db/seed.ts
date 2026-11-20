import { eq } from 'drizzle-orm'
import { existsSync } from 'node:fs'
import { closeDb, getDb } from './client'
import { user } from './schema'
import { getAuthForSeed } from '@/server/auth'

if (existsSync('.env')) {
  process.loadEnvFile('.env')
}

const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase()
const ownerPassword = process.env.OWNER_PASSWORD
const ownerName = process.env.OWNER_NAME?.trim()

if (!ownerEmail || !ownerPassword || !ownerName) {
  throw new Error('OWNER_EMAIL, OWNER_PASSWORD, dan OWNER_NAME wajib diisi sebelum seed.')
}

const db = getDb()

try {
  const existingOwner = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.email, ownerEmail))
    .limit(1)

  if (existingOwner[0]) {
    console.log(`Akun ${ownerEmail} sudah ada. Seed tidak menimpa data.`)
    if (existingOwner[0].role !== 'pemilik') {
      await db.update(user).set({ role: 'pemilik', updatedAt: new Date() }).where(eq(user.id, existingOwner[0].id))
      console.log('Role akun yang sudah ada disesuaikan menjadi pemilik.')
    }
  } else {
    const result = await getAuthForSeed().api.signUpEmail({
      body: {
        name: ownerName,
        email: ownerEmail,
        password: ownerPassword,
      },
      headers: new Headers(),
    })

    const createdUserId = result.user?.id
    if (!createdUserId) {
      throw new Error('Better Auth tidak mengembalikan ID akun pemilik.')
    }

    await db
      .update(user)
      .set({ role: 'pemilik', updatedAt: new Date() })
      .where(eq(user.id, createdUserId))

    console.log(`Akun pemilik ${ownerEmail} berhasil dibuat.`)
  }
} finally {
  await closeDb()
}
