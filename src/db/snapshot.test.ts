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

describe('configuration snapshots', () => {
  it("keeps a started battle's settings when the room's settings are edited", async () => {
    const { database } = testDb
    const settingsAtStart = { events: ['333'], timeout: 120 }

    const [user] = await database
      .insert(schema.users)
      .values({ displayName: 'Snapshot Host', token: 'snapshot-token' })
      .returning()
    const [room] = await database
      .insert(schema.rooms)
      .values({
        inviteCode: 'SNAP',
        hostId: user.id,
        settings: settingsAtStart,
      })
      .returning()
    const [battle] = await database
      .insert(schema.battles)
      .values({ roomId: room.id, settings: settingsAtStart })
      .returning()

    const settingsAfterEdit = { events: ['444'], timeout: 300 }
    await database
      .update(schema.rooms)
      .set({ settings: settingsAfterEdit })
      .where(eq(schema.rooms.id, room.id))

    const [unchanged] = await database
      .select()
      .from(schema.battles)
      .where(eq(schema.battles.id, battle.id))
    expect(unchanged.settings).toEqual(settingsAtStart)

    const [edited] = await database
      .select()
      .from(schema.rooms)
      .where(eq(schema.rooms.id, room.id))
    expect(edited.settings).toEqual(settingsAfterEdit)
  })
})

describe('phase checkpoints', () => {
  it('keeps exactly one checkpoint row per battle across repeated upserts', async () => {
    const { database } = testDb
    const [user] = await database
      .insert(schema.users)
      .values({ displayName: 'Checkpoint Cuber', token: 'checkpoint-token' })
      .returning()
    const [room] = await database
      .insert(schema.rooms)
      .values({ inviteCode: 'CHCK', hostId: user.id, settings: {} })
      .returning()
    const [battle] = await database
      .insert(schema.battles)
      .values({ roomId: room.id, settings: room.settings })
      .returning()
    const [roundOne, roundTwo] = await database
      .insert(schema.rounds)
      .values([
        { battleId: battle.id, roundNumber: 1, scramble: 'R' },
        { battleId: battle.id, roundNumber: 2, scramble: 'U' },
      ])
      .returning()

    await database
      .insert(schema.phaseCheckpoints)
      .values({ battleId: battle.id, roundId: roundOne.id, phase: 'scramble' })
    await database
      .insert(schema.phaseCheckpoints)
      .values({ battleId: battle.id, roundId: roundOne.id, phase: 'inspection' })
      .onConflictDoUpdate({
        target: schema.phaseCheckpoints.battleId,
        set: { roundId: roundOne.id, phase: 'inspection' },
      })
    await database
      .insert(schema.phaseCheckpoints)
      .values({ battleId: battle.id, roundId: roundTwo.id, phase: 'solve' })
      .onConflictDoUpdate({
        target: schema.phaseCheckpoints.battleId,
        set: { roundId: roundTwo.id, phase: 'solve' },
      })

    const checkpoints = await database
      .select()
      .from(schema.phaseCheckpoints)
      .where(eq(schema.phaseCheckpoints.battleId, battle.id))
    expect(checkpoints).toHaveLength(1)
    expect(checkpoints[0].roundId).toBe(roundTwo.id)
    expect(checkpoints[0].phase).toBe('solve')
  })
})
