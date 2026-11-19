import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Peer } from 'crossws'

import { createTestDatabase, type TestDatabase } from '../../db/test-helper'
import { createGuestIdentity } from '../identity'
import { createRoom, joinRoom, readRoomState, updateRoomSettings } from '../rooms'
import { startBattle } from '../battles'
import { getRoomChannel } from './channel'
import { publishRoomState, toRoomSnapshot } from './room-snapshot'
import { RoomRuntime } from './runtime'

let testDb: TestDatabase

beforeAll(async () => {
  testDb = await createTestDatabase()
})

afterAll(async () => {
  await testDb.close()
})

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

/** A room with a host, and a connected host peer already holding a snapshot. */
async function openRoom() {
  const db = testDb.database
  const host = await createGuestIdentity(db, 'Host')
  const room = await createRoom(db, host.id, {})
  const snapshot = toRoomSnapshot(await readRoomState(db, room.id))
  const channel = getRoomChannel(room.id)
  const hostPeer = fakePeer()
  channel.open(hostPeer.peer, host.id, snapshot)
  hostPeer.sent.length = 0
  return { db, host, room, channel, hostPeer }
}

describe('room snapshot publishing', () => {
  it('flattens the active battle start time to an ISO string', async () => {
    const { db, host, room } = await openRoom()
    await startBattle(db, host.id, room.id)
    const snapshot = toRoomSnapshot(await readRoomState(db, room.id))

    expect(snapshot.activeBattle).not.toBeNull()
    expect(typeof snapshot.activeBattle?.startedAt).toBe('string')
    expect(new Date(snapshot.activeBattle?.startedAt as string).getTime()).toBeGreaterThan(
      0,
    )
  })

  it('publishes a fresh room snapshot when a member joins', async () => {
    const { db, room, hostPeer } = await openRoom()
    const guest = await createGuestIdentity(db, 'Guest')

    await joinRoom(db, guest.id, room.inviteCode)
    await publishRoomState(db, room.id)

    expect(hostPeer.sent).toHaveLength(1)
    expect(hostPeer.sent[0].type).toBe('roomState')
    expect(
      (hostPeer.sent[0].members as Array<{ userId: string }>).map(
        (member) => member.userId,
      ),
    ).toContain(guest.id)
  })

  it('publishes a fresh room snapshot when settings change', async () => {
    const { db, host, room, hostPeer } = await openRoom()

    await updateRoomSettings(db, host.id, room.id, { roundCount: 7 })
    await publishRoomState(db, room.id)

    expect(hostPeer.sent).toHaveLength(1)
    expect(hostPeer.sent[0]).toMatchObject({
      type: 'roomState',
      settings: { roundCount: 7 },
    })
  })

  it('publishes the initial battleState then the roomState on battle start', async () => {
    const { db, host, room, hostPeer } = await openRoom()

    await startBattle(db, host.id, room.id)
    const runtime = await RoomRuntime.getOrBuild(db, room.id)
    expect(runtime).not.toBeNull()
    const battleState = (runtime as RoomRuntime).toBattleState()
    getRoomChannel(room.id).broadcast(battleState)
    await publishRoomState(db, room.id)

    expect(hostPeer.sent.map((message) => message.type)).toEqual([
      'battleState',
      'roomState',
    ])
    expect(hostPeer.sent[0]).toMatchObject({ phase: 'scramble', roundNumber: 1 })
    expect(hostPeer.sent[1].activeBattle).not.toBeNull()
  })
})
