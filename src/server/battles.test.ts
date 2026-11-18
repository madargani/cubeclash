import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createTestDatabase, type TestDatabase } from '../db/test-helper'
import * as schema from '../db/schema'
import { createGuestIdentity } from './identity'
import { createRoom, joinRoom, updateRoomSettings } from './rooms'
import { startBattle } from './battles'

let testDb: TestDatabase

beforeAll(async () => {
  testDb = await createTestDatabase()
})

afterAll(async () => {
  await testDb.close()
})

/** A room with a host and two members, ready to start a battle. */
async function roomWithPlayers(settingsInput: unknown = {}) {
  const db = testDb.database
  const host = await createGuestIdentity(db, 'Battle Host')
  const room = await createRoom(db, host.id, settingsInput)
  const alice = await createGuestIdentity(db, 'Alice')
  await joinRoom(db, alice.id, room.inviteCode)
  const bob = await createGuestIdentity(db, 'Bob')
  await joinRoom(db, bob.id, room.inviteCode)
  return { host, room, alice, bob }
}

async function battleRows(roomId: string) {
  return testDb.database
    .select()
    .from(schema.battles)
    .where(eq(schema.battles.roomId, roomId))
}

async function roundsOf(battleId: string) {
  return testDb.database
    .select()
    .from(schema.rounds)
    .where(eq(schema.rounds.battleId, battleId))
    .orderBy(schema.rounds.roundNumber)
}

describe('startBattle: freezing configuration and participants', () => {
  it('snapshots the room settings as they are at start', async () => {
    const { host, room } = await roomWithPlayers({
      eventType: '333',
      roundCount: 3,
      inspectionSeconds: 10,
      readyTimeoutSeconds: 20,
    })
    // Change the room after creation: the battle must freeze the new values.
    const changed = await updateRoomSettings(
      testDb.database,
      host.id,
      room.id,
      {
        eventType: '333',
        roundCount: 4,
        inspectionSeconds: 45,
        readyTimeoutSeconds: 90,
      },
    )

    const battle = await startBattle(testDb.database, host.id, room.id)

    expect(battle.settings).toEqual(changed)
    const [stored] = await battleRows(room.id)
    expect(stored.settings).toEqual(changed)
    expect(stored.status).toBe('active')
  })

  it('records every room member as a participant', async () => {
    const { host, room, alice, bob } = await roomWithPlayers()

    const battle = await startBattle(testDb.database, host.id, room.id)

    const participants = await testDb.database
      .select()
      .from(schema.battleParticipants)
      .where(eq(schema.battleParticipants.battleId, battle.id))
    expect(participants.map((p) => p.userId).sort()).toEqual(
      [host.id, alice.id, bob.id].sort(),
    )
  })
})

describe('startBattle: rounds and scrambles upfront', () => {
  it('creates N numbered rounds before any solving begins', async () => {
    const { host, room } = await roomWithPlayers({ roundCount: 3 })

    const battle = await startBattle(testDb.database, host.id, room.id)

    expect(battle.rounds).toBe(3)
    const rows = await roundsOf(battle.id)
    expect(rows.map((r) => r.roundNumber)).toEqual([1, 2, 3])
    for (const row of rows) {
      expect(row.scramble.length).toBeGreaterThan(0)
    }
  })

  it('gives no two rounds the same scramble', async () => {
    const { host, room } = await roomWithPlayers({ roundCount: 5 })

    const battle = await startBattle(testDb.database, host.id, room.id)

    const rows = await roundsOf(battle.id)
    const scrambles = rows.map((r) => r.scramble)
    expect(new Set(scrambles).size).toBe(5)
  })

  it('generates scrambles for the configured event', async () => {
    const { host, room } = await roomWithPlayers({
      eventType: 'mgmx',
      roundCount: 2,
    })

    const battle = await startBattle(testDb.database, host.id, room.id)

    // Megaminx scrambles are seven-line Pochmann notation; the line breaks
    // are what distinguishes them from any other event's single-line output.
    const rows = await roundsOf(battle.id)
    expect(rows).toHaveLength(2)
    for (const row of rows) {
      expect(row.scramble).toContain('\n')
    }
  })
})

describe('startBattle: guards', () => {
  it('a non-host start creates nothing', async () => {
    const { room, alice } = await roomWithPlayers({ roundCount: 2 })

    await expect(
      startBattle(testDb.database, alice.id, room.id),
    ).rejects.toThrow(/only the host/)

    expect(await battleRows(room.id)).toHaveLength(0)
    const members = await testDb.database
      .select()
      .from(schema.battleParticipants)
      .innerJoin(
        schema.battles,
        eq(schema.battleParticipants.battleId, schema.battles.id),
      )
      .where(eq(schema.battles.roomId, room.id))
    expect(members).toHaveLength(0)
  })

  it('a second start is refused while a battle is active', async () => {
    const { host, room } = await roomWithPlayers({ roundCount: 3 })

    const first = await startBattle(testDb.database, host.id, room.id)

    await expect(
      startBattle(testDb.database, host.id, room.id),
    ).rejects.toThrow(/already has an active battle/)

    const rows = await battleRows(room.id)
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(first.id)
    expect(rows[0].status).toBe('active')
    expect(rows[0].startedAt).toEqual(first.startedAt)
    expect(await roundsOf(first.id)).toHaveLength(3)
  })

  it('an unknown room is rejected', async () => {
    const host = await createGuestIdentity(testDb.database, 'Ghost Host')
    await expect(
      startBattle(testDb.database, host.id, 'no-such-room'),
    ).rejects.toThrow(/unknown room/)
  })
})
