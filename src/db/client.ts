import postgres, { type Sql } from 'postgres'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

type Database = PostgresJsDatabase<typeof schema>

let sqlClient: Sql | undefined
let database: Database | undefined

export function getDb(): Database {
  if (database) return database

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL belum diatur. Isi file .env dengan alamat PostgreSQL Neon.')
  }

  sqlClient = postgres(databaseUrl, {
    max: 10,
    prepare: false,
  })
  database = drizzle(sqlClient, { schema })
  return database
}

export async function closeDb(): Promise<void> {
  if (sqlClient) {
    await sqlClient.end({ timeout: 5 })
  }
  sqlClient = undefined
  database = undefined
}
