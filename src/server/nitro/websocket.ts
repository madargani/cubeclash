import { defineHooks, type Message, type Peer, type WSError } from 'crossws'
import { z } from 'zod'

import { db, type Database } from '../../db/index'
import { parseRoomSettings } from '../../lib/room-settings'
import { startBattle } from '../battles'
import { getRoomState, updateRoomSettings } from '../rooms'
import { resolveIdentity } from '../identity'
import { currentRoomChannel, getRoomChannel, releaseRoomChannel } from './channel'
import { safeParseClientMessage } from './protocol'
import { publishRoomState, toRoomSnapshot } from './room-snapshot'
import { RoomRuntime } from './runtime'

/**
 * Build the room's live channel hooks against one database. The default
 * export wires the app's database; tests pass a temporary one.
 *
 * The channel itself is process-wide: every member viewing their room holds
 * one socket (independent of whether a battle is active). The room snapshot
 * arrives on connect and after every room change, and the battle snapshot
 * arrives when a battle is active and after every battle event.
 */
export function createRoomHooks(database: Database) {
  return defineHooks({
    async open(peer: Peer) {
      const roomId = roomIdFromUrl(peer.request.url)
      if (!roomId) {
        peer.close(4000, 'room is required')
        return
      }

      // Socket auth reuses the guest identity cookie: the upgrade is a
      // same-origin request carrying the existing httpOnly token.
      const token = tokenFromCookie(peer.request.headers.get('cookie'))
      const cuber = token ? await resolveIdentity(database, token) : null
      if (!cuber) {
        peer.close(4001, 'not authenticated')
        return
      }

      let roomState: Awaited<ReturnType<typeof getRoomState>>
      try {
        roomState = await getRoomState(database, cuber.id, roomId)
      } catch {
        peer.close(4003, 'not a member of this room')
        return
      }

      // The channel is open whenever a member views the room — an active
      // battle is not required to connect. One read feeds both the broadcast
      // and the newcomer's own snapshot.
      const channel = getRoomChannel(roomId)
      const snapshot = toRoomSnapshot(roomState)
      // A join (or a refresh, or a second tab) announces itself: existing
      // peers get a fresh snapshot before the newcomer is registered, so the
      // newcomer receives exactly one copy. Replace semantics make the
      // re-publish harmless.
      channel.broadcast(snapshot)
      channel.open(peer, cuber.id, snapshot)

      // A member connecting mid-battle gets the current battle snapshot. When
      // the runtime is missing (the post-restart case), getOrBuild rebuilds it
      // from durable rows before the snapshot is read.
      if (roomState.activeBattle) {
        const runtime = await RoomRuntime.getOrBuild(database, roomId)
        if (runtime) channel.send(peer, runtime.toBattleState())
      }
    },

    async message(peer: Peer, message: Message) {
      const raw = rawText(message)
      if (!raw) return
      let payload: unknown
      try {
        payload = JSON.parse(raw)
      } catch {
        return
      }

      const roomId = roomIdFromUrl(peer.request.url)
      if (!roomId) return

      const channel = currentRoomChannel(roomId)
      const userId = channel?.userIdOf(peer)
      if (!channel || !userId) return

      const parsed = safeParseClientMessage(payload)
      if (!parsed.success) {
        channel.send(peer, { type: 'error', message: 'malformed message' })
        return
      }

      // Room-level mutations are valid with no battle, so they dispatch
      // before any runtime lookup. Both services enforce the host check and
      // validation themselves; their throws answer only the sender.
      switch (parsed.data.type) {
        case 'updateSettings': {
          try {
            const settings = parseRoomSettings(parsed.data.settings)
            await updateRoomSettings(database, userId, roomId, settings)
            await publishRoomState(database, roomId)
          } catch (error) {
            channel.send(peer, { type: 'error', message: errorText(error) })
          }
          return
        }
        case 'startBattle': {
          try {
            await startBattle(database, userId, roomId)
            // The startBattle handler is the runtime's only build site at
            // battle creation; the open hook rebuilds after a restart.
            const runtime = await RoomRuntime.getOrBuild(database, roomId)
            if (runtime) channel.broadcast(runtime.toBattleState())
            await publishRoomState(database, roomId)
          } catch (error) {
            channel.send(peer, { type: 'error', message: errorText(error) })
          }
          return
        }
        default: {
          // Battle actions route to the live runtime as before. After a
          // battle ends the runtime is evicted, so late messages are dropped.
          const runtime = RoomRuntime.current(roomId)
          if (!runtime) return
          await runtime.handleMessage(userId, payload)
        }
      }
    },

    close(peer: Peer): void {
      const roomId = roomIdFromUrl(peer.request.url)
      if (!roomId) return
      const channel = currentRoomChannel(roomId)
      if (!channel) return
      channel.close(peer)
      releaseRoomChannel(roomId)
    },

    error(_peer: Peer, _error: WSError) {
      // Errors are logged by the adapter; no action needed here.
    },
  })
}

/**
 * The app's hooks. Registered via `src/server/nitro/plugins/battle.ts`, which
 * installs these hooks for every WebSocket upgrade through nitro's `request`
 * hook.
 */
export const hooks = createRoomHooks(db)

export default hooks

/** Extract the `roomId` query param from a WebSocket URL. */
function roomIdFromUrl(url: string): string | null {
  try {
    return new URL(url).searchParams.get('roomId')
  } catch {
    return null
  }
}

/** Extract the `cubeclash_token` value from a Cookie header. */
function tokenFromCookie(cookie: string | null): string | null {
  if (!cookie) return null
  const match = cookie.match(/(?:^|;\s*)cubeclash_token=([^;]+)/)
  return match ? match[1] : null
}

/** One readable line for a rejected room-level message. */
function errorText(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues
      .map((issue) => {
        const field = issue.path.join('.')
        return field ? `${field}: ${issue.message}` : issue.message
      })
      .join('; ')
  }
  return error instanceof Error ? error.message : 'something went wrong'
}

/** Flatten a crossws message into text. */
function rawText(message: Message): string {
  if (typeof message.data === 'string') return message.data
  if (message.data instanceof Uint8Array) return new TextDecoder().decode(message.data)
  return ''
}
