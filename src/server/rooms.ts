import { and, eq } from 'drizzle-orm'

import type { Database } from '../db/index'
import { battles, roomMembers, rooms } from '../db/schema'
import {
  parseRoomSettings,
  type RoomSettings,
} from '../lib/room-settings'

/** A room row with its settings parsed back through the Zod schema. */
export type RoomRecord = Omit<typeof rooms.$inferSelect, 'settings'> & {
  settings: RoomSettings
}

/**
 * Six characters, no `0/o`, `1/l/i` — short enough to read aloud,
 * unambiguous enough to type (~887M combinations).
 */
const INVITE_CODE_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'
const INVITE_CODE_LENGTH = 6
/** After enough short-code collisions, fall back to a longer code. */
const FALLBACK_CODE_LENGTH = 10
const MAX_CODE_ATTEMPTS = 10

function generateInviteCode(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  let code = ''
  for (const byte of bytes) {
    code += INVITE_CODE_ALPHABET[byte % INVITE_CODE_ALPHABET.length]
  }
  return code
}

/**
 * Drizzle wraps libsql errors and keeps the SQLite rejection in `cause`,
 * so the constraint text is matched across the chain.
 */
function isUniqueViolation(error: unknown): boolean {
  for (let cause: unknown = error; cause instanceof Error; cause = cause.cause) {
    if (cause.message.includes('UNIQUE constraint failed')) return true
  }
  return false
}

/**
 * Create a room: settings validated through the Zod schema, a unique invite
 * code assigned with bounded collision retry, and the creator recorded as
 * host and first member in the same transaction.
 */
export async function createRoom(
  db: Database,
  hostId: string,
  settingsInput: unknown,
): Promise<RoomRecord> {
  const settings = parseRoomSettings(settingsInput)

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const length =
      attempt < MAX_CODE_ATTEMPTS / 2
        ? INVITE_CODE_LENGTH
        : FALLBACK_CODE_LENGTH
    const inviteCode = generateInviteCode(length)
    try {
      return await db.transaction(async (tx) => {
        const [room] = await tx
          .insert(rooms)
          .values({ inviteCode, hostId, settings })
          .returning()
        await tx.insert(roomMembers).values({ roomId: room.id, userId: hostId })
        return { ...room, settings }
      })
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
    }
  }

  throw new Error('could not allocate a unique invite code')
}

/**
 * Join a room by invite code. First join creates the membership, rejoining
 * is a no-op, and an unknown code is an error. Returns the room's id so the
 * caller can redirect into the room.
 */
export async function joinRoom(
  db: Database,
  userId: string,
  inviteCode: string,
): Promise<string> {
  const rows = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(eq(rooms.inviteCode, inviteCode))
    .limit(1)
  const roomId = rows[0]?.id
  if (!roomId) {
    throw new Error(`unknown invite code "${inviteCode}"`)
  }

  // First join inserts the membership; rejoining hits the primary key and
  // absorbs into a no-op (including a concurrent first join's row).
  await db
    .insert(roomMembers)
    .values({ roomId, userId })
    .onConflictDoNothing()
  return roomId
}

/**
 * Update a room's battle settings: host-only, validated through the same
 * Zod schema as creation. Invalid values are rejected naming the field;
 * non-host submissions never touch the stored settings.
 */
export async function updateRoomSettings(
  db: Database,
  userId: string,
  roomId: string,
  settingsInput: unknown,
): Promise<RoomSettings> {
  const rows = await db
    .select({ hostId: rooms.hostId })
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1)
  const room = rows[0]
  if (!room) {
    throw new Error(`unknown room "${roomId}"`)
  }
  if (room.hostId !== userId) {
    throw new Error('only the host can change room settings')
  }

  const settings = parseRoomSettings(settingsInput)
  await db.update(rooms).set({ settings }).where(eq(rooms.id, roomId))
  return settings
}

export interface RoomMemberView {
  userId: string
  displayName: string
}

export interface RoomState {
  id: string
  inviteCode: string
  host: RoomMemberView
  members: RoomMemberView[]
  settings: RoomSettings
  activeBattle: {
    id: string
    status: string
    startedAt: Date
    settings: RoomSettings
  } | null
}

/**
 * Member-only read of a room's current state: invite code, host, members
 * with display names, settings, and the active battle if one exists.
 * Cubers outside the room are rejected.
 */
export async function getRoomState(
  db: Database,
  userId: string,
  roomId: string,
): Promise<RoomState> {
  const membership = await db
    .select({ roomId: roomMembers.roomId })
    .from(roomMembers)
    .where(
      and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)),
    )
    .limit(1)
  if (membership.length === 0) {
    throw new Error('you are not a member of this room')
  }

  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, roomId),
    with: {
      host: true,
      members: { with: { user: true } },
      battles: {
        where: eq(battles.status, 'active'),
        limit: 1,
      },
    },
  })
  if (!room) {
    throw new Error(`unknown room "${roomId}"`)
  }

  const activeBattle = room.battles[0]
  return {
    id: room.id,
    inviteCode: room.inviteCode,
    host: { userId: room.host.id, displayName: room.host.displayName },
    members: room.members.map((member) => ({
      userId: member.userId,
      displayName: member.user.displayName,
    })),
    settings: parseRoomSettings(room.settings),
    activeBattle: activeBattle
      ? {
          id: activeBattle.id,
          status: activeBattle.status,
          startedAt: activeBattle.startedAt,
          settings: parseRoomSettings(activeBattle.settings),
        }
      : null,
  }
}
