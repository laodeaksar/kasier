import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { getDb } from '@/db/client'
import * as schema from '@/db/schema'

function createAuth(options?: { allowSignUp?: boolean }) {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) {
    throw new Error('BETTER_AUTH_SECRET belum diatur. Isi file .env sebelum menjalankan aplikasi.')
  }

  const secureCookies = process.env.BETTER_AUTH_URL?.startsWith('https://') ?? false

  return betterAuth({
    secret,
    baseURL: process.env.BETTER_AUTH_URL,
    basePath: '/api/auth',
    database: drizzleAdapter(getDb(), {
      provider: 'pg',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
      transaction: true,
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: options?.allowSignUp !== true,
      autoSignIn: false,
    },
    user: {
      additionalFields: {
        role: {
          type: 'string',
          required: true,
          defaultValue: 'kasir',
          input: false,
        },
      },
    },
    advanced: {
      useSecureCookies: secureCookies,
      defaultCookieAttributes: {
        httpOnly: true,
        secure: secureCookies,
        sameSite: secureCookies ? 'none' : 'lax',
        path: '/',
      },
      cookies: {
        session_token: {
          name: 'webdev_app_session',
        },
      },
    },
  })

}

let authInstance: ReturnType<typeof createAuth> | undefined

export function getAuth() {
  if (authInstance) return authInstance
  const instance = createAuth()
  authInstance = instance
  return instance
}

export function getAuthForSeed() {
  return createAuth({ allowSignUp: true })
}

export function getAuthForAccountCreation() {
  return createAuth({ allowSignUp: true })
}

export async function getSessionFromRequest(request: Request) {
  return getAuth().api.getSession({ headers: request.headers })
}
