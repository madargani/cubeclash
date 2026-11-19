import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createTestDatabase, type TestDatabase } from '../../db/test-helper'
import * as schema from '../../db/schema'
import { createGuestIdentity } from '../identity'
import { createRoom, joinRoom } from '../rooms'
import { startBattle } from '../battles'
import { buildRuntimeState, RoomRuntime } from './runtime'
import type { RuntimeState } from './phase-machine'

let testDb: TestDatabase

beforeAll(async () => {
  testDb = await createTestDatabase()
})

afterAll(async () => {
  await testDb.close()
})

/** A room with a host and one member, with a started battle. */
async function battleFixture(settings: unknown = {}) {
  const db = testDb.database
  const host = await createGuestIdentity(db, 'Host')
  const room = await createRoom(db, host.id, settings)
  const guest = await createGuestIdentity(db, 'Guest')
  await joinRoom(db, guest.id, room.inviteCode)
  const battle = await startBattle(db, host.id, room.id)
  return { db, host, guest, room, battle }
}

describe('runtime builder: cold start', () => {
  it('starts a fresh battle in the scramble phase of round 1', async () => {
    const { db, battle } = await battleFixture({
      roundCount: 3,
      inspectionSeconds: 15,
      readyTimeoutSeconds: 30,
    })

    const state = await buildRuntimeState(db, battle.id)
    expect(state).not.toBeNull()
    expect(state?.phase).toBe('scramble')
    expect(state?.roundNumber).toBe(1)
    expect(state?.roundId).toBe(state?.roundOrder[0])
    expect(state?.readyUserIds).toEqual([])
    expect(state?.submittedUserIds).toEqual([])
    expect(state?.participants).toHaveLength(2)
    expect(state?.config.roundCount).toBe(3)
    expect(state?.config.inspectionSeconds).toBe(15)
    expect(state?.config.readyTimeoutSeconds).toBe(30)
  })

  it('carries every round with its scramble', async () => {
    const { db, battle } = await battleFixture({ roundCount: 3 })

    const state = await buildRuntimeState(db, battle.id)
    expect(state?.roundOrder).toHaveLength(3)
    for (const roundId of state?.roundOrder ?? []) {
      expect(state?.rounds[roundId]?.scramble.length).toBeGreaterThan(0)
    }
  })
})

describe('runtime builder: mid-battle restart resync', () => {
  it('resumes at the checkpointed round and phase with solves intact and ready reset', async () => {
    const { db, guest, battle } = await battleFixture({
      roundCount: 3,
      inspectionSeconds: 15,
      readyTimeoutSeconds: 30,
    })

    // Simulate a mid-battle checkpoint: round 2, solving phase.
    const round2 = db
      .select()
      .from(schema.rounds)
      .where(eq(schema.rounds.battleId, battle.id))
      .orderBy(schema.rounds.roundNumber)
      .then((rows) => rows[1])
    const checkpointRound = await round2
    expect(checkpointRound).toBeDefined()

    // A solve recorded in the checkpointed round survives the restart.
    await db.insert(schema.solves).values({
      roundId: checkpointRound.id,
      userId: guest.id,
      timeMs: 12_345,
      penalty: 'none',
    })

    await db.insert(schema.phaseCheckpoints).values({
      battleId: battle.id,
      roundId: checkpointRound.id,
      phase: 'solving',
      deadlineAt: null,
    })

    const state = await buildRuntimeState(db, battle.id)
    expect(state?.phase).toBe('solving')
    expect(state?.roundNumber).toBe(2)
    expect(state?.roundId).toBe(checkpointRound.id)
    // Ready state deliberately resets.
    expect(state?.readyUserIds).toEqual([])
    // Submitted solves remain.
    expect(state?.submittedUserIds).toEqual([guest.id])
    expect(state?.solves[checkpointRound.id]?.[guest.id]).toEqual({
      timeMs: 12_345,
      penalty: 'none',
    })
  })
})

describe('runtime builder: expired-deadline fire', () => {
  it('fires a gate whose deadline already passed instead of waiting', async () => {
    const { db, host, battle } = await battleFixture({
      roundCount: 3,
      inspectionSeconds: 15,
      readyTimeoutSeconds: 30,
    })

    // Checkpoint in the scramble phase with a deadline long past.
    const round1 = await db
      .select()
      .from(schema.rounds)
      .where(eq(schema.rounds.battleId, battle.id))
      .orderBy(schema.rounds.roundNumber)
      .then((rows) => rows[0])
    expect(round1).toBeDefined()

    await db.insert(schema.phaseCheckpoints).values({
      battleId: battle.id,
      roundId: round1.id,
      phase: 'scramble',
      deadlineAt: new Date(Date.now() - 60_000),
    })

    const state = await buildRuntimeState(db, battle.id)
    expect(state?.phase).toBe('scramble')
    expect(state?.deadlineAt).not.toBeNull()

    // Building the runtime fires the expired gate: the phase advances to
    // countdown and the checkpoint is rewritten.
    const runtime = new RoomRuntime(db, state as RuntimeState, host.id)
    // Give the async advance a moment to complete.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(runtime.snapshot.phase).toBe('countdown')
    expect(runtime.snapshot.roundNumber).toBe(1)

    const [checkpoint] = await db
      .select()
      .from(schema.phaseCheckpoints)
      .where(eq(schema.phaseCheckpoints.battleId, battle.id))
    expect(checkpoint?.phase).toBe('countdown')
  })
})

describe('runtime: lifecycle', () => {
  it('getOrBuild caches one runtime per room', async () => {
    const { db, room } = await battleFixture({ roundCount: 2 })

    const first = await RoomRuntime.getOrBuild(db, room.id)
    expect(first).not.toBeNull()
    expect(RoomRuntime.has(room.id)).toBe(true)

    const second = await RoomRuntime.getOrBuild(db, room.id)
    expect(second).toBe(first)
  })

  it('returns null when the room has no active battle', async () => {
    const db = testDb.database
    const host = await createGuestIdentity(db, 'NoBattle Host')
    const room = await createRoom(db, host.id, {})
    const runtime = await RoomRuntime.getOrBuild(db, room.id)
    expect(runtime).toBeNull()
    expect(RoomRuntime.has(room.id)).toBe(false)
  })

  it('evicting frees the room for the next runtime build', async () => {
    const { db, room } = await battleFixture({ roundCount: 2 })

    await RoomRuntime.getOrBuild(db, room.id)
    expect(RoomRuntime.has(room.id)).toBe(true)

    RoomRuntime.evict(room.id)
    expect(RoomRuntime.has(room.id)).toBe(false)

    const rebuilt = await RoomRuntime.getOrBuild(db, room.id)
    expect(rebuilt).not.toBeNull()
  })
})
