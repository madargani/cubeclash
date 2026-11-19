import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Peer } from 'crossws'

import { createTestDatabase, type TestDatabase } from '../../db/test-helper'
import * as schema from '../../db/schema'
import { createGuestIdentity } from '../identity'
import { createRoom, joinRoom } from '../rooms'
import { startBattle } from '../battles'
import { getRoomChannel } from './channel'
import { RoomRuntime } from './runtime'

let testDb: TestDatabase

beforeAll(async () => {
  testDb = await createTestDatabase()
})

afterAll(async () => {
  await testDb.close()
})

/** A recording fake peer: captures every outbound message. */
function fakePeer(): { peer: Peer; sent: Array<Record<string, unknown>> } {
  const sent: Array<Record<string, unknown>> = []
  const peer = {
    request: { url: '', headers: new Headers() },
    send: (data: unknown) => {
      sent.push(JSON.parse(String(data)) as Record<string, unknown>)
    },
    close: () => {},
  } as unknown as Peer
  return { peer, sent }
}

/** A battle with a host and one guest; a spectator joins after battle start. */
async function battleFixture(settings: Record<string, unknown> = {}) {
  const db = testDb.database
  const host = await createGuestIdentity(db, 'Host')
  const room = await createRoom(db, host.id, {
    inspectionSeconds: 0,
    ...settings,
  })
  const guest = await createGuestIdentity(db, 'Guest')
  await joinRoom(db, guest.id, room.inviteCode)
  const battle = await startBattle(db, host.id, room.id)
  // A member who joined after battle start watches but does not act in it:
  // they are not a participant of the frozen participant set.
  const spectator = await createGuestIdentity(db, 'Spectator')
  await joinRoom(db, spectator.id, room.inviteCode)
  return { db, host, guest, spectator, room, battle }
}

/**
 * Connect a fake peer to the room's channel and clear the initial snapshot,
 * so each test inspects only what its own action published.
 */
function connect(
  fixture: Awaited<ReturnType<typeof battleFixture>>,
  runtime: RoomRuntime,
  userId: string,
) {
  const tab = fakePeer()
  getRoomChannel(fixture.room.id).open(tab.peer, userId, runtime.toBattleState())
  tab.sent.length = 0
  return tab
}

/** Build the runtime and walk it to the given phase using forced advances. */
async function runtimeAtPhase(
  fixture: Awaited<ReturnType<typeof battleFixture>>,
  target: 'scramble' | 'countdown' | 'solving' | 'results',
): Promise<RoomRuntime> {
  const runtime = await RoomRuntime.getOrBuild(fixture.db, fixture.room.id)
  expect(runtime).not.toBeNull()
  const r = runtime as RoomRuntime

  while (r.snapshot.phase !== target) {
    if (r.snapshot.phase === 'scramble') {
      for (const participant of r.snapshot.participants) {
        await r.handleMessage(participant, { type: 'ready' })
      }
      continue
    }
    await r.advancePhase()
  }
  return r
}

async function checkpointOf(battleId: string) {
  const [row] = await testDb.database
    .select()
    .from(schema.phaseCheckpoints)
    .where(eq(schema.phaseCheckpoints.battleId, battleId))
  return row
}

describe('snapshot on connect', () => {
  it('builds a full battle snapshot with only the current scramble', async () => {
    const fixture = await battleFixture({ roundCount: 2 })
    const runtime = await RoomRuntime.getOrBuild(fixture.db, fixture.room.id)
    expect(runtime).not.toBeNull()

    const snapshot = (runtime as RoomRuntime).toBattleState()
    expect(snapshot.type).toBe('battleState')
    expect(snapshot.phase).toBe('scramble')
    expect(snapshot.roundId).toBe((runtime as RoomRuntime).snapshot.roundId)
    expect(snapshot.roundNumber).toBe(1)
    expect(snapshot.scramble?.length).toBeGreaterThan(0)
    expect(snapshot.readyUserIds).toEqual([])
    expect(snapshot.submittedUserIds).toEqual([])
    expect(snapshot.roundResults).toEqual([])
    expect(snapshot.battleEnded).toBe(false)
    expect(snapshot.standings).toBeNull()
  })

  it('two tabs of one cuber hold independent connections', async () => {
    const fixture = await battleFixture({ roundCount: 2 })
    const r = (await RoomRuntime.getOrBuild(fixture.db, fixture.room.id)) as RoomRuntime
    const tabOne = connect(fixture, r, fixture.host.id)
    const tabTwo = connect(fixture, r, fixture.host.id)

    const channel = getRoomChannel(fixture.room.id)
    expect(channel.peersOf(fixture.host.id)).toHaveLength(2)

    await r.handleMessage(fixture.host.id, { type: 'ready' })

    // Both tabs receive the same full snapshot.
    expect(tabOne.sent).toEqual(tabTwo.sent)
    expect(tabOne.sent[0]).toMatchObject({
      type: 'battleState',
      readyUserIds: [fixture.host.id],
    })
  })
})

describe('ready messages', () => {
  it('ready broadcasts a full battleState with the ready set', async () => {
    const fixture = await battleFixture({ roundCount: 2 })
    const r = (await RoomRuntime.getOrBuild(fixture.db, fixture.room.id)) as RoomRuntime
    const tab = connect(fixture, r, fixture.host.id)

    await r.handleMessage(fixture.host.id, { type: 'ready' })

    expect(r.snapshot.readyUserIds).toEqual([fixture.host.id])
    expect(tab.sent).toHaveLength(1)
    expect(tab.sent[0]).toMatchObject({
      type: 'battleState',
      phase: 'scramble',
      readyUserIds: [fixture.host.id],
    })
  })

  it('the last ready fires the gate and advances to countdown', async () => {
    const fixture = await battleFixture({ roundCount: 2 })
    const r = (await RoomRuntime.getOrBuild(fixture.db, fixture.room.id)) as RoomRuntime

    await r.handleMessage(fixture.host.id, { type: 'ready' })
    expect(r.snapshot.phase).toBe('scramble')

    await r.handleMessage(fixture.guest.id, { type: 'ready' })
    expect(r.snapshot.phase).toBe('countdown')
    expect(r.snapshot.readyUserIds).toEqual([])
  })

  it('a non-participant ready is rejected', async () => {
    const fixture = await battleFixture({ roundCount: 2 })
    const r = (await RoomRuntime.getOrBuild(fixture.db, fixture.room.id)) as RoomRuntime
    const tab = connect(fixture, r, fixture.spectator.id)

    await r.handleMessage(fixture.spectator.id, { type: 'ready' })

    expect(r.snapshot.readyUserIds).toEqual([])
    expect(tab.sent).toEqual([
      {
        type: 'error',
        message: 'you are not a participant in this battle',
      },
    ])
  })

  it('rejects a malformed message without touching state', async () => {
    const fixture = await battleFixture({ roundCount: 2 })
    const r = (await RoomRuntime.getOrBuild(fixture.db, fixture.room.id)) as RoomRuntime
    const tab = connect(fixture, r, fixture.host.id)

    await r.handleMessage(fixture.host.id, { type: 'nope' })
    await r.handleMessage(fixture.host.id, { type: 'submit', timeMs: -5, penalty: 'none' })

    expect(tab.sent).toEqual([
      { type: 'error', message: 'malformed message' },
      { type: 'error', message: 'malformed message' },
    ])
    expect(r.snapshot.phase).toBe('scramble')
  })
})

describe('submit messages', () => {
  it('submit during solving records the solve and broadcasts the snapshot', async () => {
    const fixture = await battleFixture({ roundCount: 2 })
    const r = await runtimeAtPhase(fixture, 'solving')
    const tab = connect(fixture, r, fixture.host.id)

    await r.handleMessage(
      fixture.host.id,
      { type: 'submit', timeMs: 12_345, penalty: 'none' },
    )

    expect(r.snapshot.submittedUserIds).toEqual([fixture.host.id])
    const solve = r.snapshot.solves[r.snapshot.roundId]?.[fixture.host.id]
    expect(solve).toEqual({ timeMs: 12_345, penalty: 'none' })
    expect(tab.sent[0]).toMatchObject({
      type: 'battleState',
      phase: 'solving',
      submittedUserIds: [fixture.host.id],
      // Times stay hidden while the round is open.
      roundResults: [],
    })

    const rows = await testDb.database
      .select()
      .from(schema.solves)
      .where(eq(schema.solves.roundId, r.snapshot.roundId))
    expect(rows).toHaveLength(1)
    expect(rows[0].userId).toBe(fixture.host.id)
    expect(rows[0].timeMs).toBe(12_345)
  })

  it('a submit outside the solving phase is rejected', async () => {
    const fixture = await battleFixture({ roundCount: 2 })
    const r = (await RoomRuntime.getOrBuild(fixture.db, fixture.room.id)) as RoomRuntime
    const tab = connect(fixture, r, fixture.host.id)

    await r.handleMessage(
      fixture.host.id,
      { type: 'submit', timeMs: 1_000, penalty: 'none' },
    )

    expect(r.snapshot.submittedUserIds).toEqual([])
    expect(tab.sent).toEqual([
      {
        type: 'error',
        message: 'submissions are only accepted during the solving phase',
      },
    ])
  })

  it('a repeated submission is rejected and the recorded solve is unchanged', async () => {
    const fixture = await battleFixture({ roundCount: 2 })
    const r = await runtimeAtPhase(fixture, 'solving')
    const tab = connect(fixture, r, fixture.host.id)

    await r.handleMessage(
      fixture.host.id,
      { type: 'submit', timeMs: 12_345, penalty: 'none' },
    )
    tab.sent.length = 0
    await r.handleMessage(
      fixture.host.id,
      { type: 'submit', timeMs: 99_999, penalty: 'dnf' },
    )

    const solve = r.snapshot.solves[r.snapshot.roundId]?.[fixture.host.id]
    expect(solve).toEqual({ timeMs: 12_345, penalty: 'none' })
    expect(tab.sent).toEqual([
      {
        type: 'error',
        message: 'you have already submitted a solve for this round',
      },
    ])
  })

  it('a spectator submit is rejected', async () => {
    const fixture = await battleFixture({ roundCount: 2 })
    const r = await runtimeAtPhase(fixture, 'solving')
    const tab = connect(fixture, r, fixture.spectator.id)

    await r.handleMessage(
      fixture.spectator.id,
      { type: 'submit', timeMs: 1_000, penalty: 'none' },
    )

    expect(r.snapshot.submittedUserIds).toEqual([])
    expect(tab.sent).toEqual([
      {
        type: 'error',
        message: 'you are not a participant in this battle',
      },
    ])
  })

  it('a full round completes when every participant submits', async () => {
    const fixture = await battleFixture({ roundCount: 2 })
    const r = await runtimeAtPhase(fixture, 'solving')

    await r.handleMessage(
      fixture.host.id,
      { type: 'submit', timeMs: 10_000, penalty: 'none' },
    )
    expect(r.snapshot.phase).toBe('solving')

    await r.handleMessage(
      fixture.guest.id,
      { type: 'submit', timeMs: 11_000, penalty: 'none' },
    )
    // The submitted gate fires: results phase for everyone.
    expect(r.snapshot.phase).toBe('results')

    // The results snapshot ranks the round and reveals times now.
    const results = r.toBattleState().roundResults
    expect(results).toHaveLength(1)
    expect(results[0].roundId).toBe(r.snapshot.roundId)
    expect(results[0].results.map((entry) => entry.userId)).toEqual([
      fixture.host.id,
      fixture.guest.id,
    ])
  })
})

describe('forceStart', () => {
  it('a host force during solving writes DNF rows for unsubmitted cubers', async () => {
    const fixture = await battleFixture({ roundCount: 2 })
    const r = await runtimeAtPhase(fixture, 'solving')

    // Only the host submits; the guest has not.
    await r.handleMessage(
      fixture.host.id,
      { type: 'submit', timeMs: 10_000, penalty: 'none' },
    )

    await r.handleMessage(fixture.host.id, { type: 'forceStart' })

    expect(r.snapshot.phase).toBe('results')
    const solve = r.snapshot.solves[r.snapshot.roundId]?.[fixture.guest.id]
    expect(solve).toEqual({ timeMs: 0, penalty: 'dnf' })

    const rows = await testDb.database
      .select()
      .from(schema.solves)
      .where(eq(schema.solves.roundId, r.snapshot.roundId))
    expect(rows).toHaveLength(2)
    const guestRow = rows.find((row) => row.userId === fixture.guest.id)
    expect(guestRow?.penalty).toBe('dnf')
    expect(guestRow?.timeMs).toBe(0)
  })

  it('a non-host force is rejected and the phase is unchanged', async () => {
    const fixture = await battleFixture({ roundCount: 2 })
    const r = await runtimeAtPhase(fixture, 'solving')
    const tab = connect(fixture, r, fixture.guest.id)

    await r.handleMessage(fixture.guest.id, { type: 'forceStart' })

    expect(r.snapshot.phase).toBe('solving')
    expect(tab.sent).toEqual([
      { type: 'error', message: 'only the host can force-start' },
    ])
  })
})

describe('checkpoint persistence', () => {
  it('the checkpoint row tracks the phase after several transitions', async () => {
    const fixture = await battleFixture({ roundCount: 2 })
    const r = (await RoomRuntime.getOrBuild(fixture.db, fixture.room.id)) as RoomRuntime

    // A ready click is not a transition, so no checkpoint yet.
    await r.handleMessage(fixture.host.id, { type: 'ready' })
    expect(await checkpointOf(fixture.battle.id)).toBeUndefined()

    await r.handleMessage(fixture.guest.id, { type: 'ready' })
    // All ready -> countdown. Checkpoint now says countdown/round 1.
    expect((await checkpointOf(fixture.battle.id))?.phase).toBe('countdown')

    await r.advancePhase() // countdown -> solving (inspection 0)
    expect((await checkpointOf(fixture.battle.id))?.phase).toBe('solving')
  })

  it('the broadcast snapshot carries the checkpointed absolute deadline', async () => {
    const fixture = await battleFixture({
      roundCount: 2,
      readyTimeoutSeconds: 45,
    })
    const r = (await RoomRuntime.getOrBuild(fixture.db, fixture.room.id)) as RoomRuntime
    const tab = connect(fixture, r, fixture.host.id)

    await r.handleMessage(fixture.host.id, { type: 'ready' })
    await r.handleMessage(fixture.guest.id, { type: 'ready' })

    const checkpoint = await checkpointOf(fixture.battle.id)
    expect(checkpoint?.phase).toBe('countdown')
    expect(checkpoint?.deadlineAt).not.toBeNull()

    const transition = tab.sent[tab.sent.length - 1]
    expect(transition.phase).toBe('countdown')
    // The column stores whole seconds; the snapshot keeps the exact deadline,
    // so they agree to the second.
    const snapshotDeadline = new Date(transition.deadlineAt as string).getTime()
    const checkpointDeadline = (checkpoint?.deadlineAt as Date).getTime()
    expect(Math.abs(snapshotDeadline - checkpointDeadline)).toBeLessThan(1_000)
  })
})

describe('battle end', () => {
  it('publishes final standings, then a room without the battle, and admits a new one', async () => {
    const fixture = await battleFixture({ roundCount: 1 })
    const r = await runtimeAtPhase(fixture, 'solving')
    const tab = connect(fixture, r, fixture.host.id)

    await r.handleMessage(
      fixture.host.id,
      { type: 'submit', timeMs: 10_000, penalty: 'none' },
    )
    await r.handleMessage(
      fixture.guest.id,
      { type: 'submit', timeMs: 12_000, penalty: 'none' },
    )
    // All submitted -> results.
    expect(r.snapshot.phase).toBe('results')

    // Results gate on the final round ends the battle.
    await r.advancePhase()

    const [battleRow] = await testDb.database
      .select()
      .from(schema.battles)
      .where(eq(schema.battles.id, fixture.battle.id))
    expect(battleRow?.status).toBe('ended')
    expect(battleRow?.endedAt).not.toBeNull()

    // The final battle snapshot carries the standings: host fastest -> 2
    // points, guest -> 1 point.
    const ended = tab.sent.find(
      (message) => message.type === 'battleState' && message.battleEnded === true,
    )
    expect(ended).toBeDefined()
    expect((ended?.standings as Array<Record<string, unknown>>)[0]).toEqual({
      userId: fixture.host.id,
      displayName: 'Host',
      points: 2,
    })

    // Then a fresh room snapshot with the battle gone.
    const last = tab.sent[tab.sent.length - 1]
    expect(last.type).toBe('roomState')
    expect(last.activeBattle).toBeNull()

    // The runtime was evicted, and the one-active-battle guard now admits a
    // new battle for the same room.
    expect(RoomRuntime.has(fixture.room.id)).toBe(false)
    const next = await startBattle(fixture.db, fixture.host.id, fixture.room.id)
    expect(next.id).not.toBe(fixture.battle.id)
  })
})
