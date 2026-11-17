import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, describe, expect, it } from 'vitest'

import { createTestDatabase } from './test-helper'

const testDb = await createTestDatabase()

afterAll(async () => {
  await testDb.close()
})

const expectedTables = [
  'users',
  'rooms',
  'room_members',
  'battles',
  'battle_participants',
  'rounds',
  'solves',
  'phase_checkpoints',
]

describe('migrations', () => {
  it('creates all battle-domain tables', async () => {
    const result = await testDb.database.run(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle_%'",
    )
    const tableNames = result.rows.map((row) => row.name as string)

    for (const table of expectedTables) {
      expect(tableNames).toContain(table)
    }
  })

  it('is a no-op when applied to an already-migrated database', async () => {
    const before = await testDb.database.run(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle_%'",
    )
    const beforeRows = await testDb.database.run('SELECT COUNT(*) AS count FROM users')

    const { migrate } = await import('drizzle-orm/libsql/migrator')
    await expect(
      migrate(testDb.database, {
        migrationsFolder: path.join(
          path.dirname(fileURLToPath(import.meta.url)),
          '..',
          '..',
          'drizzle',
        ),
      }),
    ).resolves.toBeUndefined()

    const after = await testDb.database.run(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle_%'",
    )
    const afterRows = await testDb.database.run('SELECT COUNT(*) AS count FROM users')
    expect(after.rows.map((row) => row.name)).toEqual(before.rows.map((row) => row.name))
    expect(afterRows.rows).toEqual(beforeRows.rows)
  })
})
