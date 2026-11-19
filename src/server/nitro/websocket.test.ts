import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Message, Peer } from 'crossws'

import { createTestDatabase, type TestDatabase } from '../../db/test-helper'
import { createGuestIdentity } from '../identity'
import { createRoom, joinRoom } from '../rooms'
import { startBattle } from '../battles'
import { getRoomChannel } from './channel'
import { RoomRuntime } from './runtime'
import { createRoomHooks } from './websocket'

let testDb: TestDatabase
let hooks: ReturnType<typeof createRoomHooks>

beforeAll(async () => {
  testDb = await createTestDatabase()
  hooks = createRoomHooks(testDb.database)
})

afterAll(async () => {
  await testDb.close()
})

/** A socket-shaped fake peer that records sends and close codes. */
function fakePeer(url: string, cookie?: string) {
  const sent: Array<Record<string, unknown>> = []
  const closed: Array<{ code: number; reason: string }> = []
  const headers = new Headers()
  if (cookie) headers.set('cookie', cookie)
  const peer = {
    request: { url, headers },
    send: (data: unknown) => {
      sent.push(JSON.parse(String(data)) as Record<string, unknown>)
    },
    close: (code: number, reason: string) => {
      closed.push({ code, reason })
    },
  } as unknown as Peer
  return { peer, sent, closed }
}

function socketUrl(roomId: string): string {
  return `ws://localhost:3000/ws?roomId=${encodeURIComponent(roomId)}`
}

function cookieFor(token: string): string {
  return `cubeclash_token=${token}`
}

function messageOf(data: unknown): Message {
  return { data: JSON.stringify(data) } as Message
}

async function roomFixture(settings: Record<string, unknown> = {}) {
  const db = testDb.database
  const host = await createGuestIdentity(db, 'Host')
  const room = await createRoom(db, host.id, {
    inspectionSeconds: 0,
    roundCount: 1,
    ...settings,
  })
  const guest = await createGuestIdentity(db, 'Guest')
  await joinRoom(db, guest.id, room.inviteCode)
  return { db, host, guest, room }
}

describe('socket open', () => {
  it('rejects a cuber who is not a member of the room', async () => {
    const fixture = await roomFixture()
    const outsider = await createGuestIdentity(fixture.db, 'Outsider')
    const { peer, closed } = fakePeer(
      socketUrl(fixture.room.id),
      cookieFor(outsider.token),
    )

    await hooks.open(peer)

    expect(closed).toEqual([{ code: 4003, reason: 'not a member of this room' }])
    expect(getRoomChannel(fixture.room.id).size).toBe(0)
  })

  it('rejects a visitor with no identity', async () => {
    const fixture = await roomFixture()
    const { peer, closed } = fakePeer(socketUrl(fixture.room.id))

    await hooks.open(peer)

    expect(closed).toEqual([{ code: 4001, reason: 'not authenticated' }])
  })

  it('opens a channel in a room without an active battle and sends roomState only', async () => {
    const fixture = await roomFixture()
    const { peer, sent } = fakePeer(
      socketUrl(fixture.room.id),
      cookieFor(fixture.host.token),
    )

    await hooks.open(peer)

    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({
      type: 'roomState',
      id: fixture.room.id,
      inviteCode: fixture.room.inviteCode,
      activeBattle: null,
    })
    expect(getRoomChannel(fixture.room.id).size).toBe(1)
    hooks.close(peer)
  })

  it('sends roomState then battleState to a member connecting mid-battle', async () => {
    const fixture = await roomFixture()
    await startBattle(fixture.db, fixture.host.id, fixture.room.id)
    const { peer, sent } = fakePeer(
      socketUrl(fixture.room.id),
      cookieFor(fixture.host.token),
    )

    await hooks.open(peer)

    expect(sent.map((message) => message.type)).toEqual([
      'roomState',
      'battleState',
    ])
    expect(sent[0].activeBattle).not.toBeNull()
    expect(sent[1]).toMatchObject({ phase: 'scramble', roundNumber: 1 })
    hooks.close(peer)
  })

  it('gives two tabs of one cuber identical room snapshots and independent sends', async () => {
    const fixture = await roomFixture()
    const tabOne = fakePeer(socketUrl(fixture.room.id), cookieFor(fixture.host.token))
    const tabTwo = fakePeer(socketUrl(fixture.room.id), cookieFor(fixture.host.token))

    await hooks.open(tabOne.peer)
    await hooks.open(tabTwo.peer)

    // Opening tab two also announces it to tab one; both tabs end on the same
    // canonical snapshot, and the newcomer receives exactly one copy.
    expect(tabTwo.sent).toHaveLength(1)
    expect(tabOne.sent[tabOne.sent.length - 1]).toEqual(tabTwo.sent[0])
    expect(getRoomChannel(fixture.room.id).peersOf(fixture.host.id)).toHaveLength(2)

    hooks.close(tabOne.peer)
    expect(getRoomChannel(fixture.room.id).size).toBe(1)
    hooks.close(tabTwo.peer)
  })

  it('announces a joining member to peers already connected', async () => {
    const fixture = await roomFixture()
    const host = fakePeer(socketUrl(fixture.room.id), cookieFor(fixture.host.token))
    await hooks.open(host.peer)
    host.sent.length = 0

    const guest = fakePeer(socketUrl(fixture.room.id), cookieFor(fixture.guest.token))
    await hooks.open(guest.peer)

    // The host sees the new member without a reload; the newcomer gets one
    // snapshot carrying the same member list.
    const announced = host.sent[host.sent.length - 1]
    expect(announced.type).toBe('roomState')
    expect(announced.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: fixture.guest.id }),
      ]),
    )
    expect(guest.sent).toHaveLength(1)
    expect(guest.sent[0].members).toEqual(announced.members)
    hooks.close(host.peer)
    hooks.close(guest.peer)
  })
})

describe('socket messages', () => {
  it('routes ready to the runtime and broadcasts the full snapshot to every tab', async () => {
    const fixture = await roomFixture()
    await startBattle(fixture.db, fixture.host.id, fixture.room.id)
    const host = fakePeer(socketUrl(fixture.room.id), cookieFor(fixture.host.token))
    const guest = fakePeer(socketUrl(fixture.room.id), cookieFor(fixture.guest.token))
    await hooks.open(host.peer)
    await hooks.open(guest.peer)
    host.sent.length = 0
    guest.sent.length = 0

    await hooks.message(host.peer, messageOf({ type: 'ready' }))

    const expected = {
      type: 'battleState',
      readyUserIds: [fixture.host.id],
    }
    expect(host.sent[0]).toMatchObject(expected)
    expect(guest.sent[0]).toMatchObject(expected)
    hooks.close(host.peer)
    hooks.close(guest.peer)
  })

  it('keeps a cuber’s ready state and deadline across a reconnect', async () => {
    const fixture = await roomFixture({ readyTimeoutSeconds: 60 })
    await startBattle(fixture.db, fixture.host.id, fixture.room.id)
    const first = fakePeer(socketUrl(fixture.room.id), cookieFor(fixture.host.token))
    await hooks.open(first.peer)
    await hooks.message(first.peer, messageOf({ type: 'ready' }))
    const before = first.sent[first.sent.length - 1]
    expect(before.readyUserIds).toEqual([fixture.host.id])
    hooks.close(first.peer)

    // A refresh reconnects with the same cookie; the runtime still keys ready
    // state by cuber, and the absolute deadline is unchanged.
    const refreshed = fakePeer(
      socketUrl(fixture.room.id),
      cookieFor(fixture.host.token),
    )
    await hooks.open(refreshed.peer)
    const battleState = refreshed.sent.find(
      (message) => message.type === 'battleState',
    )
    expect(battleState?.readyUserIds).toEqual([fixture.host.id])
    expect(battleState?.deadlineAt).toBe(before.deadlineAt)
    hooks.close(refreshed.peer)
  })

  it('rebuilds the runtime when a member connects after a restart', async () => {
    const fixture = await roomFixture()
    await startBattle(fixture.db, fixture.host.id, fixture.room.id)
    // Simulate a process restart: the cached runtime is gone, the rows remain.
    RoomRuntime.evict(fixture.room.id)
    expect(RoomRuntime.has(fixture.room.id)).toBe(false)

    const { peer, sent } = fakePeer(
      socketUrl(fixture.room.id),
      cookieFor(fixture.host.token),
    )
    await hooks.open(peer)

    expect(RoomRuntime.has(fixture.room.id)).toBe(true)
    expect(sent.map((message) => message.type)).toEqual([
      'roomState',
      'battleState',
    ])
    hooks.close(peer)
  })

  it('ends the battle through forced gates and returns the room without it', async () => {
    const fixture = await roomFixture()
    await startBattle(fixture.db, fixture.host.id, fixture.room.id)
    const host = fakePeer(socketUrl(fixture.room.id), cookieFor(fixture.host.token))
    const guest = fakePeer(socketUrl(fixture.room.id), cookieFor(fixture.guest.token))
    await hooks.open(host.peer)
    await hooks.open(guest.peer)

    // Ready through the scramble gate; the runtime advances to countdown.
    await hooks.message(host.peer, messageOf({ type: 'ready' }))
    await hooks.message(guest.peer, messageOf({ type: 'ready' }))
    // Zero inspection: countdown force -> solving.
    await hooks.message(host.peer, messageOf({ type: 'forceStart' }))
    // Forced solving end writes DNFs and opens results.
    await hooks.message(host.peer, messageOf({ type: 'forceStart' }))
    // Final round results force -> battle ends.
    await hooks.message(host.peer, messageOf({ type: 'forceStart' }))

    const last = host.sent[host.sent.length - 1]
    expect(last.type).toBe('roomState')
    expect(last.activeBattle).toBeNull()
    expect(
      host.sent.some(
        (message) => message.type === 'battleState' && message.battleEnded === true,
      ),
    ).toBe(true)
    expect(RoomRuntime.has(fixture.room.id)).toBe(false)
    hooks.close(host.peer)
    hooks.close(guest.peer)
  })

  it('drops a message when the room has no active battle', async () => {
    const fixture = await roomFixture()
    const { peer, sent } = fakePeer(
      socketUrl(fixture.room.id),
      cookieFor(fixture.host.token),
    )
    await hooks.open(peer)
    sent.length = 0

    await hooks.message(peer, messageOf({ type: 'ready' }))

    expect(sent).toEqual([])
    hooks.close(peer)
  })
})

describe('room-level messages', () => {
  it('broadcasts a host settings save to every member', async () => {
    const fixture = await roomFixture()
    const host = fakePeer(socketUrl(fixture.room.id), cookieFor(fixture.host.token))
    const guest = fakePeer(socketUrl(fixture.room.id), cookieFor(fixture.guest.token))
    await hooks.open(host.peer)
    await hooks.open(guest.peer)
    host.sent.length = 0
    guest.sent.length = 0

    // Raw form values: the socket side coerces them through parseRoomSettings.
    await hooks.message(
      host.peer,
      messageOf({
        type: 'updateSettings',
        settings: {
          eventType: '333',
          roundCount: '3',
          inspectionSeconds: '5',
          readyTimeoutSeconds: '20',
        },
      }),
    )

    for (const tab of [host, guest]) {
      expect(tab.sent).toHaveLength(1)
      expect(tab.sent[0]).toMatchObject({
        type: 'roomState',
        settings: {
          roundCount: 3,
          inspectionSeconds: 5,
          readyTimeoutSeconds: 20,
        },
      })
    }
    hooks.close(host.peer)
    hooks.close(guest.peer)
  })

  it('rejects a settings save from a non-host', async () => {
    const fixture = await roomFixture()
    const host = fakePeer(socketUrl(fixture.room.id), cookieFor(fixture.host.token))
    const guest = fakePeer(socketUrl(fixture.room.id), cookieFor(fixture.guest.token))
    await hooks.open(host.peer)
    await hooks.open(guest.peer)
    host.sent.length = 0
    guest.sent.length = 0

    await hooks.message(
      guest.peer,
      messageOf({ type: 'updateSettings', settings: { roundCount: '3' } }),
    )

    expect(guest.sent).toEqual([
      { type: 'error', message: 'only the host can change room settings' },
    ])
    expect(host.sent).toEqual([])
    hooks.close(host.peer)
    hooks.close(guest.peer)
  })

  it('rejects invalid settings and publishes nothing', async () => {
    const fixture = await roomFixture()
    const host = fakePeer(socketUrl(fixture.room.id), cookieFor(fixture.host.token))
    await hooks.open(host.peer)
    host.sent.length = 0

    await hooks.message(
      host.peer,
      messageOf({ type: 'updateSettings', settings: { roundCount: 'many' } }),
    )

    expect(host.sent).toHaveLength(1)
    expect(host.sent[0].type).toBe('error')
    expect(String(host.sent[0].message)).toContain('roundCount')
    hooks.close(host.peer)
  })

  it('starts a battle and broadcasts the battle then the room to every member', async () => {
    const fixture = await roomFixture()
    const host = fakePeer(socketUrl(fixture.room.id), cookieFor(fixture.host.token))
    const guest = fakePeer(socketUrl(fixture.room.id), cookieFor(fixture.guest.token))
    await hooks.open(host.peer)
    await hooks.open(guest.peer)
    host.sent.length = 0
    guest.sent.length = 0

    await hooks.message(host.peer, messageOf({ type: 'startBattle' }))

    for (const tab of [host, guest]) {
      expect(tab.sent.map((message) => message.type)).toEqual([
        'battleState',
        'roomState',
      ])
      expect(tab.sent[0]).toMatchObject({ phase: 'scramble', roundNumber: 1 })
      expect(tab.sent[1].activeBattle).not.toBeNull()
    }
    expect(RoomRuntime.has(fixture.room.id)).toBe(true)
    RoomRuntime.evict(fixture.room.id)
    hooks.close(host.peer)
    hooks.close(guest.peer)
  })

  it('rejects a battle start from a non-host', async () => {
    const fixture = await roomFixture()
    const host = fakePeer(socketUrl(fixture.room.id), cookieFor(fixture.host.token))
    const guest = fakePeer(socketUrl(fixture.room.id), cookieFor(fixture.guest.token))
    await hooks.open(host.peer)
    await hooks.open(guest.peer)
    host.sent.length = 0
    guest.sent.length = 0

    await hooks.message(guest.peer, messageOf({ type: 'startBattle' }))

    expect(guest.sent).toEqual([
      { type: 'error', message: 'only the host can start a battle' },
    ])
    expect(host.sent).toEqual([])
    expect(RoomRuntime.has(fixture.room.id)).toBe(false)
    hooks.close(host.peer)
    hooks.close(guest.peer)
  })
})
