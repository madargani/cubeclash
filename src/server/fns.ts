import { getSupportedEvents } from '@cubingcenter/scrambler'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { db } from '../db/index'
import { RoomSettingsSchema, defaultRoomSettings } from '../lib/room-settings'
import { createGuestIdentity } from './identity'
import { createRoom, getRoomState, joinRoom } from './rooms'
import { getCurrentCuber, issueIdentityCookie } from './session'

/**
 * Thin TanStack Start wrappers over the service layer: Zod parse, cookie
 * identity resolution (creating a guest identity on first need), service
 * call, response. Services stay pure over `(db, inputs)` and are tested
 * directly; these exist only to bridge HTTP.
 */

/** Parse with Zod, rejecting with one readable line that names the field. */
function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (result.success) return result.data
  const messages = result.error.issues.map((issue) => {
    const field = issue.path.join('.')
    return field ? `${field}: ${issue.message}` : issue.message
  })
  throw new Error(messages.join('; '))
}

const DisplayNameSchema = z
  .string()
  .trim()
  .min(1, 'a display name is required')
  .max(64, 'display name must be 64 characters or fewer')

const CreateRoomInputSchema = z.object({
  displayName: DisplayNameSchema.optional(),
  settings: RoomSettingsSchema.optional(),
})

const JoinRoomInputSchema = z.object({
  displayName: DisplayNameSchema.optional(),
  inviteCode: z
    .string()
    .trim()
    .min(1, 'an invite code is required')
    .max(32, 'invite code is too long'),
})

const RoomIdInputSchema = z.object({
  roomId: z.string().min(1, 'a room is required'),
})

/**
 * The current cuber from the identity cookie; a visitor with no recognized
 * identity gets a guest identity created here (on their first action that
 * needs one) and the httpOnly cookie that recognizes them later. An
 * already-recognized cuber's submitted name is ignored — identity is the
 * token, not the name.
 */
async function resolveOrCreateCuber(displayName: string | undefined) {
  const existing = await getCurrentCuber(db)
  if (existing) return existing
  if (!displayName) {
    throw new Error('a display name is required to continue')
  }
  const cuber = await createGuestIdentity(db, displayName)
  issueIdentityCookie(cuber.token)
  return cuber
}

/** Everything the lobby pages need before anyone acts: who am I, what can I play. */
export const getLobbyConfigFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const cuber = await getCurrentCuber(db)
    return {
      displayName: cuber?.displayName ?? null,
      events: getSupportedEvents().map(({ eventId, name }) => ({
        eventId,
        name,
      })),
      defaults: defaultRoomSettings,
    }
  },
)

export const createRoomFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => parseOrThrow(CreateRoomInputSchema, input))
  .handler(async ({ data }) => {
    const cuber = await resolveOrCreateCuber(data.displayName)
    const room = await createRoom(db, cuber.id, data.settings)
    return { roomId: room.id, inviteCode: room.inviteCode }
  })

export const joinRoomFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => parseOrThrow(JoinRoomInputSchema, input))
  .handler(async ({ data }) => {
    const cuber = await resolveOrCreateCuber(data.displayName)
    // Joining publishes nothing from here: the joiner has no channel yet, so
    // the room announces them when their page connects (the open handler).
    const roomId = await joinRoom(db, cuber.id, data.inviteCode)
    return { roomId }
  })

/** Member-only room read; the rejection travels as a thrown loader error. */
export const getRoomStateFn = createServerFn({ method: 'GET' })
  .validator((input: unknown) => parseOrThrow(RoomIdInputSchema, input))
  .handler(async ({ data }) => {
    const cuber = await getCurrentCuber(db)
    if (!cuber) throw new Error('you are not a member of this room')
    const state = await getRoomState(db, cuber.id, data.roomId)
    return {
      ...state,
      isHost: cuber.id === state.host.userId,
      currentUserId: cuber.id,
    }
  })
