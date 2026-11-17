import { createClient, type Client } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

/**
 * Create a libsql client and the Drizzle client bound to the battle-domain
 * schema, with the pragmas the schema's guarantees depend on:
 * - `journal_mode = WAL` avoids "database is locked" under concurrent
 *   server-function access
 * - `foreign_keys = ON` — SQLite ships with FK enforcement off by default
 */
export async function createDb(url: string): Promise<{
  client: Client
  database: ReturnType<typeof drizzle<typeof schema>>
}> {
  const client = createClient({ url })
  await client.executeMultiple(
    'PRAGMA journal_mode = WAL;\nPRAGMA foreign_keys = ON;',
  )
  return { client, database: drizzle(client, { schema }) }
}

const globalForDb = globalThis as unknown as {
  __cubeclashDb?: Promise<Awaited<ReturnType<typeof createDb>>>
}

// Global singleton guard: Vite dev hot-reload re-evaluates this module, but
// must not open a new connection per reload.
const dbPromise = (globalForDb.__cubeclashDb ??= createDb(
  process.env.DATABASE_URL ?? 'file:local.db',
))

export const client = (await dbPromise).client
export const db = (await dbPromise).database

export type Database = typeof db

export { schema }
