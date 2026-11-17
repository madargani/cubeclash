import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDb } from './index'

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'drizzle',
)

export interface TestDatabase {
  /** Close the client when the test run is done. */
  close: () => Promise<void>
  database: Awaited<ReturnType<typeof createDb>>['database']
}

/**
 * Create a fresh temporary SQLite database, apply the migrations
 * programmatically, and return a Drizzle client wired exactly like the
 * production client (WAL + foreign keys on, via `createDb`).
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const dir = await mkdtemp(path.join(tmpdir(), 'cubeclash-test-'))
  const { client, database } = await createDb(`file:${path.join(dir, 'test.db')}`)
  const { migrate } = await import('drizzle-orm/libsql/migrator')
  await migrate(database, { migrationsFolder })

  return {
    close: async () => {
      await client.close()
      await rm(dir, { recursive: true, force: true })
    },
    database,
  }
}
