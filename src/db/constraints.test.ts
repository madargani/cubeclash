import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import * as schema from './schema'
import { createTestDatabase, type TestDatabase } from './test-helper'

let testDb: TestDatabase

beforeAll(async () => {
  testDb = await createTestDatabase()
})

afterAll(async () => {
  await testDb.close()
})

/**
 * Drizzle wraps libsql errors ("Failed query: ...") and keeps the SQLite
 * rejection in `cause`, so the constraint text is matched across the chain.
 */
async function expectConstraintViolation(promise: Promise<unknown>) {
  try {
    await promise
    expect.unreachable('expected the database to reject the write')
  } catch (error) {
    const messages: string[] = []
    for (let cause: unknown = error; cause instanceof Error; cause = cause.cause) {
      messages.push(cause.message)
    }
    expect(messages.join('\n')).toMatch(
      /UNIQUE constraint failed|FOREIGN KEY constraint failed/,
    )
  }
}

describe('identity', () => {
  it('rejects a duplicate token write', async () => {
    const { database } = testDb
    const [first, second] = await database
      .insert(schema.users)
      .values([
        { displayName: 'Cuber One', token: 'shared-token' },
        { displayName: 'Cuber Two', token: 'unique-token' },
      ])
      .returning()

    await expectConstraintViolation(
      database.insert(schema.users).values({ displayName: 'Impostor', token: 'shared-token' }),
    )
    await expectConstraintViolation(
      database
        .update(schema.users)
        .set({ token: 'shared-token' })
        .where(eq(schema.users.id, second.id)),
    )

    const rows = await database
      .select()
      .from(schema.users)
      .where(eq(schema.users.token, 'shared-token'))
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(first.id)
  })

  it('keeps the identifier and links of a row that is later claimed', async () => {
    const { database } = testDb
    const [user] = await database
      .insert(schema.users)
      .values({ displayName: 'Guest', token: 'claimable-token' })
      .returning()

    const [room] = await database
      .insert(schema.rooms)
      .values({
        inviteCode: 'CLAIM',
        hostId: user.id,
        settings: { events: ['333'] },
      })
      .returning()
    await database
      .insert(schema.roomMembers)
      .values({ roomId: room.id, userId: user.id })

    const claimedAt = new Date()
    await database
      .update(schema.users)
      .set({ claimedAt })
      .where(eq(schema.users.id, user.id))

    const [claimed] = await database
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
    expect(claimed.id).toBe(user.id)
    // timestamps are stored as whole seconds
    expect(claimed.claimedAt?.getTime()).toBe(
      Math.floor(claimedAt.getTime() / 1000) * 1000,
    )

    const memberships = await database
      .select()
      .from(schema.roomMembers)
      .where(eq(schema.roomMembers.userId, user.id))
    expect(memberships).toHaveLength(1)
    expect(memberships[0].roomId).toBe(room.id)

    const hosted = await database
      .select()
      .from(schema.rooms)
      .where(eq(schema.rooms.hostId, user.id))
    expect(hosted).toHaveLength(1)
  })
})

describe('relational constraints', () => {
  let user: typeof schema.users.$inferSelect
  let room: typeof schema.rooms.$inferSelect
  let battle: typeof schema.battles.$inferSelect
  let round: typeof schema.rounds.$inferSelect

  beforeAll(async () => {
    const { database } = testDb
    ;[user] = await database
      .insert(schema.users)
      .values({ displayName: 'Constraint Cuber', token: 'constraint-token' })
      .returning()
    ;[room] = await database
      .insert(schema.rooms)
      .values({ inviteCode: 'CONST', hostId: user.id, settings: {} })
      .returning()
    ;[battle] = await database
      .insert(schema.battles)
      .values({ roomId: room.id, settings: room.settings })
      .returning()
    ;[round] = await database
      .insert(schema.rounds)
      .values({ battleId: battle.id, roundNumber: 1, scramble: 'R U R U' })
      .returning()
  })

  it('rejects a membership row referencing a missing room', async () => {
    await expectConstraintViolation(
      testDb.database
        .insert(schema.roomMembers)
        .values({ roomId: 'missing-room', userId: user.id }),
    )
  })

  it('rejects a membership row referencing a missing identity', async () => {
    await expectConstraintViolation(
      testDb.database
        .insert(schema.roomMembers)
        .values({ roomId: room.id, userId: 'missing-user' }),
    )
  })

  it('rejects duplicate participants of one battle', async () => {
    const { database } = testDb
    await database
      .insert(schema.battleParticipants)
      .values({ battleId: battle.id, userId: user.id })
    await expectConstraintViolation(
      database
        .insert(schema.battleParticipants)
        .values({ battleId: battle.id, userId: user.id }),
    )
  })

  it('rejects two rounds of one battle with the same round number', async () => {
    await expectConstraintViolation(
      testDb.database
        .insert(schema.rounds)
        .values({ battleId: battle.id, roundNumber: 1, scramble: 'other' }),
    )
  })

  it('rejects duplicate solves for one round of one cuber', async () => {
    const { database } = testDb
    await database
      .insert(schema.solves)
      .values({ roundId: round.id, userId: user.id, timeMs: 12_345 })
    await expectConstraintViolation(
      database
        .insert(schema.solves)
        .values({ roundId: round.id, userId: user.id, timeMs: 23_456 }),
    )
  })

  it('rejects a solve row referencing a missing round', async () => {
    await expectConstraintViolation(
      testDb.database
        .insert(schema.solves)
        .values({ roundId: 'missing-round', userId: user.id, timeMs: 10_000 }),
    )
  })

  it('rejects a solve row referencing a missing identity', async () => {
    await expectConstraintViolation(
      testDb.database
        .insert(schema.solves)
        .values({ roundId: round.id, userId: 'missing-user', timeMs: 10_000 }),
    )
  })
})
