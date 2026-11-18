import { generateScrambles } from '@cubingcenter/scrambler'
import { and, eq } from 'drizzle-orm'

import type { Database } from '../db/index'
import { battleParticipants, battles, rounds, rooms } from '../db/schema'
import { parseRoomSettings, type RoomSettings } from '../lib/room-settings'

/**
 * The batch API derives per-scramble seeds, so collisions (possible in
 * principle for random-move big-cube events) are retried with a new seed —
 * the spec promises distinct rounds, so a batch with any duplicate never
 * reaches the insert.
 */
const MAX_SCRAMBLE_ATTEMPTS = 5

export interface StartedBattle {
  id: string
  roomId: string
  startedAt: Date
  settings: RoomSettings
  rounds: number
}

/** One seeded batch per battle; distinct by check-and-regenerate. */
async function generateDistinctScrambles(
  eventType: string,
  count: number,
  battleId: string,
): Promise<string[]> {
  for (let attempt = 0; attempt < MAX_SCRAMBLE_ATTEMPTS; attempt += 1) {
    const seed = attempt === 0 ? battleId : `${battleId}:${attempt}`
    const batch = await generateScrambles(eventType, count, { seed })
    const scrambles = batch.map(({ scramble }) => scramble)
    if (new Set(scrambles).size === count) return scrambles
  }
  throw new Error('could not generate distinct scrambles for this battle')
}

/**
 * Start a battle in one transaction: read the room's settings and members,
 * check the host and the one-active-battle guard, then write the battle
 * (a settings snapshot), every room member as a participant, and all rounds
 * with their scrambles. All-or-nothing: a failure writes nothing, and the
 * guards run inside the transaction so racing starts cannot both win.
 */
export async function startBattle(
  db: Database,
  userId: string,
  roomId: string,
): Promise<StartedBattle> {
  return db.transaction(async (tx) => {
    const room = await tx.query.rooms.findFirst({
      where: eq(rooms.id, roomId),
      with: { members: true },
    })
    if (!room) {
      throw new Error(`unknown room "${roomId}"`)
    }
    if (room.hostId !== userId) {
      throw new Error('only the host can start a battle')
    }

    const active = await tx
      .select({ id: battles.id })
      .from(battles)
      .where(and(eq(battles.roomId, roomId), eq(battles.status, 'active')))
      .limit(1)
    if (active.length > 0) {
      throw new Error('this room already has an active battle')
    }

    const settings = parseRoomSettings(room.settings)
    const battleId = crypto.randomUUID()
    const scrambles = await generateDistinctScrambles(
      settings.eventType,
      settings.roundCount,
      battleId,
    )

    const [battle] = await tx
      .insert(battles)
      .values({ id: battleId, roomId, settings })
      .returning()

    if (room.members.length > 0) {
      await tx.insert(battleParticipants).values(
        room.members.map((member) => ({ battleId, userId: member.userId })),
      )
    }
    await tx.insert(rounds).values(
      scrambles.map((scramble, index) => ({
        battleId,
        roundNumber: index + 1,
        scramble,
      })),
    )

    return {
      id: battle.id,
      roomId,
      startedAt: battle.startedAt,
      settings,
      rounds: scrambles.length,
    }
  })
}
