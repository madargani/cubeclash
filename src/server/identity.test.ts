import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createTestDatabase, type TestDatabase } from '../db/test-helper'
import { createGuestIdentity, resolveIdentity } from './identity'

let testDb: TestDatabase

beforeAll(async () => {
  testDb = await createTestDatabase()
})

afterAll(async () => {
  await testDb.close()
})

describe('guest identity', () => {
  it('resolves a created identity by its token', async () => {
    const identity = await createGuestIdentity(testDb.database, 'Ada')

    expect(identity.displayName).toBe('Ada')
    expect(identity.claimedAt).toBeNull()

    const resolved = await resolveIdentity(testDb.database, identity.token)
    expect(resolved?.id).toBe(identity.id)
    expect(resolved?.displayName).toBe('Ada')
  })

  it('resolves an unknown token to null', async () => {
    expect(await resolveIdentity(testDb.database, 'no-such-token')).toBeNull()
    expect(await resolveIdentity(testDb.database, '')).toBeNull()
  })

  it('never shares a token between two creations', async () => {
    const tokens = new Set<string>()
    for (let index = 0; index < 25; index += 1) {
      const identity = await createGuestIdentity(
        testDb.database,
        `Cuber ${index}`,
      )
      tokens.add(identity.token)
    }
    expect(tokens.size).toBe(25)
  })
})
