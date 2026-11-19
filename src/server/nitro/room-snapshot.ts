import type { Database } from '../../db/index'
import { readRoomState, type RoomState } from '../rooms'
import { publishToRoom } from './channel'
import type { RoomStateMessage } from './protocol'

/**
 * Flatten the room service's `RoomState` into the wire snapshot. The service
 * keeps `Date` objects; the protocol speaks ISO strings.
 */
export function toRoomSnapshot(state: RoomState): RoomStateMessage {
  return {
    type: 'roomState',
    id: state.id,
    inviteCode: state.inviteCode,
    host: state.host,
    members: state.members,
    settings: state.settings,
    activeBattle: state.activeBattle
      ? {
          id: state.activeBattle.id,
          status: state.activeBattle.status,
          startedAt: state.activeBattle.startedAt.toISOString(),
          settings: state.activeBattle.settings,
        }
      : null,
  }
}

/**
 * Read the room's current state once and broadcast it to its channel. The
 * HTTP mutation seam calls this after a successful join, settings save, or
 * battle start; a battle ending calls it from the runtime. It never forwards
 * service return values, so every broadcast is canonical.
 */
export async function publishRoomState(
  db: Database,
  roomId: string,
): Promise<RoomStateMessage> {
  const snapshot = toRoomSnapshot(await readRoomState(db, roomId))
  publishToRoom(roomId, snapshot)
  return snapshot
}
