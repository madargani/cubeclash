import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createTestDatabase, type TestDatabase } from '../db/test-helper'
import * as schema from '../db/schema'
import { defaultRoomSettings } from '../lib/room-settings'
import { createGuestIdentity } from './identity'
import { createRoom, getRoomState, joinRoom, updateRoomSettings } from './rooms'

let testDb: TestDatabase

beforeAll(async () => {
  testDb = await createTestDatabase()
})

afterAll(async () => {
  await testDb.close()
})

async function newHost(name: string) {
  const identity = await createGuestIdentity(testDb.database, name)
  return identity.id
}

describe('createRoom', () => {
  it('records the creator as host and first member', async () => {
    const hostId = await newHost('Host One')
    const room = await createRoom(testDb.database, hostId, {})

    expect(room.hostId).toBe(hostId)

    const members = await testDb.database
      .select()
      .from(schema.roomMembers)
      .where(eq(schema.roomMembers.roomId, room.id))
    expect(members).toHaveLength(1)
    expect(members[0].userId).toBe(hostId)
  })

  it('stores submitted settings parsed through the schema', async () => {
    const hostId = await newHost('Host Two')
    const room = await createRoom(testDb.database, hostId, {
      eventType: '222',
      roundCount: 3,
    })

    expect(room.settings).toEqual({
      eventType: '222',
      roundCount: 3,
      inspectionSeconds: defaultRoomSettings.inspectionSeconds,
      readyTimeoutSeconds: defaultRoomSettings.readyTimeoutSeconds,
    })

    // The stored JSON column round-trips as the parsed values.
    const [stored] = await testDb.database
      .select()
      .from(schema.rooms)
      .where(eq(schema.rooms.id, room.id))
    expect(stored.settings).toEqual(room.settings)
  })

  it('defaults settings when none are submitted', async () => {
    const hostId = await newHost('Host Three')
    const room = await createRoom(testDb.database, hostId, undefined)
    expect(room.settings).toEqual(defaultRoomSettings)
  })

  it('rejects invalid settings naming the field', async () => {
    const hostId = await newHost('Host Four')
    await expect(
      createRoom(testDb.database, hostId, { roundCount: 99 }),
    ).rejects.toThrow(/roundCount/)
  })

  it('assigns a six-character invite code from the unambiguous alphabet', async () => {
    const hostId = await newHost('Host Five')
    const room = await createRoom(testDb.database, hostId, {})

    expect(room.inviteCode).toHaveLength(6)
    expect(room.inviteCode).toMatch(/^[23456789abcdefghjkmnpqrstuvwxyz]+$/)
  })

  it('never shares a code between two rooms', async () => {
    const hostId = await newHost('Host Six')
    const codes = new Set<string>()
    for (let index = 0; index < 30; index += 1) {
      const room = await createRoom(testDb.database, hostId, {})
      codes.add(room.inviteCode)
    }
    expect(codes.size).toBe(30)
  })
})

describe('joinRoom', () => {
  it('a valid code joins the room', async () => {
    const hostId = await newHost('Join Host')
    const room = await createRoom(testDb.database, hostId, {})
    const joiner = await createGuestIdentity(testDb.database, 'Joiner')

    const joinedRoomId = await joinRoom(
      testDb.database,
      joiner.id,
      room.inviteCode,
    )
    expect(joinedRoomId).toBe(room.id)

    const memberships = await testDb.database
      .select()
      .from(schema.roomMembers)
      .where(eq(schema.roomMembers.roomId, room.id))
    expect(memberships.map((m) => m.userId)).toContain(joiner.id)
    expect(memberships).toHaveLength(2)
  })

  it('an unknown code is rejected and adds no membership', async () => {
    const stranger = await createGuestIdentity(testDb.database, 'Stranger')

    await expect(
      joinRoom(testDb.database, stranger.id, '000000'),
    ).rejects.toThrow(/unknown invite code/)

    const memberships = await testDb.database
      .select()
      .from(schema.roomMembers)
      .where(eq(schema.roomMembers.userId, stranger.id))
    expect(memberships).toHaveLength(0)
  })

  it('rejoining is idempotent', async () => {
    const hostId = await newHost('Rejoin Host')
    const room = await createRoom(testDb.database, hostId, {})

    await joinRoom(testDb.database, hostId, room.inviteCode)
    await joinRoom(testDb.database, hostId, room.inviteCode)
    const again = await joinRoom(testDb.database, hostId, room.inviteCode)
    expect(again).toBe(room.id)

    const memberships = await testDb.database
      .select()
      .from(schema.roomMembers)
      .where(eq(schema.roomMembers.roomId, room.id))
    expect(memberships).toHaveLength(1)
    expect(memberships[0].userId).toBe(hostId)
  })
})

describe('updateRoomSettings', () => {
  async function roomWithMember() {
    const hostId = await newHost('Settings Host')
    const room = await createRoom(testDb.database, hostId, {})
    const member = await createGuestIdentity(testDb.database, 'Settings Member')
    await joinRoom(testDb.database, member.id, room.inviteCode)
    return { hostId, room, memberId: member.id }
  }

  async function storedSettings(roomId: string) {
    const [row] = await testDb.database
      .select()
      .from(schema.rooms)
      .where(eq(schema.rooms.id, roomId))
    return row.settings
  }

  it('the host updates settings', async () => {
    const { hostId, room } = await roomWithMember()

    const updated = await updateRoomSettings(testDb.database, hostId, room.id, {
      eventType: '555',
      roundCount: 7,
      inspectionSeconds: 30,
      readyTimeoutSeconds: 60,
    })

    expect(updated).toEqual({
      eventType: '555',
      roundCount: 7,
      inspectionSeconds: 30,
      readyTimeoutSeconds: 60,
    })
    expect(await storedSettings(room.id)).toEqual(updated)
  })

  it('a non-host cannot change settings', async () => {
    const { room, memberId } = await roomWithMember()
    const before = await storedSettings(room.id)

    await expect(
      updateRoomSettings(testDb.database, memberId, room.id, {
        eventType: '222',
        roundCount: 12,
      }),
    ).rejects.toThrow(/host/)

    expect(await storedSettings(room.id)).toEqual(before)
  })

  it('invalid values are rejected naming the offending field', async () => {
    const { hostId, room } = await roomWithMember()
    const before = await storedSettings(room.id)

    await expect(
      updateRoomSettings(testDb.database, hostId, room.id, {
        ...defaultRoomSettings,
        roundCount: 99,
      }),
    ).rejects.toThrow(/roundCount/)

    expect(await storedSettings(room.id)).toEqual(before)
  })

  it('an unknown room is rejected', async () => {
    const hostId = await newHost('No Room Host')
    await expect(
      updateRoomSettings(testDb.database, hostId, 'no-such-room', {}),
    ).rejects.toThrow(/unknown room/)
  })
})

describe('getRoomState', () => {
  it('a member sees invite code, host, members, settings and battle', async () => {
    const host = await createGuestIdentity(testDb.database, 'State Host')
    const room = await createRoom(testDb.database, host.id, {
      eventType: '444',
      roundCount: 4,
    })
    const member = await createGuestIdentity(testDb.database, 'State Member')
    await joinRoom(testDb.database, member.id, room.inviteCode)

    // No battle yet: the absence is part of what a member reads.
    const before = await getRoomState(testDb.database, member.id, room.id)
    expect(before.activeBattle).toBeNull()

    const [battle] = await testDb.database
      .insert(schema.battles)
      .values({ roomId: room.id, settings: room.settings })
      .returning()

    const state = await getRoomState(testDb.database, member.id, room.id)
    expect(state.id).toBe(room.id)
    expect(state.inviteCode).toBe(room.inviteCode)
    expect(state.host).toEqual({ userId: host.id, displayName: 'State Host' })
    expect(state.members).toHaveLength(2)
    expect(state.members).toEqual(
      expect.arrayContaining([
        { userId: host.id, displayName: 'State Host' },
        { userId: member.id, displayName: 'State Member' },
      ]),
    )
    expect(state.settings).toEqual({
      eventType: '444',
      roundCount: 4,
      inspectionSeconds: 15,
      readyTimeoutSeconds: 30,
    })
    expect(state.activeBattle).toEqual({
      id: battle.id,
      status: 'active',
      startedAt: battle.startedAt,
      settings: room.settings,
    })
  })

  it('the host reads the room as a member would', async () => {
    const host = await createGuestIdentity(testDb.database, 'Reader Host')
    const room = await createRoom(testDb.database, host.id, {})

    const state = await getRoomState(testDb.database, host.id, room.id)
    expect(state.members).toHaveLength(1)
    expect(state.host.userId).toBe(host.id)
  })

  it('a cuber outside the room cannot read its state', async () => {
    const host = await createGuestIdentity(testDb.database, 'Closed Host')
    const room = await createRoom(testDb.database, host.id, {})
    const outsider = await createGuestIdentity(testDb.database, 'Outsider')

    await expect(
      getRoomState(testDb.database, outsider.id, room.id),
    ).rejects.toThrow(/not a member/)
  })
})
