import { and, eq } from 'drizzle-orm'

import type { Database } from '../../db/index'
import {
  battles,
  phaseCheckpoints,
  rooms,
  rounds,
  solves,
} from '../../db/schema'
import { type RoomSettings } from '../../lib/room-settings'
import { currentRoomChannel, publishToRoom } from './channel'
import {
  applyReady,
  applySubmit,
  canAdvance,
  nextPhase,
  phaseDeadline,
  type Phase,
  type RuntimeState,
} from './phase-machine'
import { computeRoundStandings, computeStandings } from './standings'
import {
  safeParseClientMessage,
  type BattleStateMessage,
  type CompletedRound,
  type ServerMessage,
} from './protocol'
import { publishRoomState } from './room-snapshot'

/** Where a runtime publishes its snapshots: its room's live channel. */
export type Publisher = (roomId: string, message: ServerMessage) => void

/** Key the runtime map by room: one process owns a room's live state. */
const runtimes = new Map<string, RoomRuntime>()
/** In-flight builds, so two concurrent connects never build two runtimes. */
const building = new Map<string, Promise<RoomRuntime | null>>()

/** Build a `RuntimeState` from durable database rows. */
export async function buildRuntimeState(
  db: Database,
  battleId: string,
): Promise<RuntimeState | null> {
  const battle = await db.query.battles.findFirst({
    where: eq(battles.id, battleId),
    with: {
      participants: { with: { user: true } },
      rounds: {
        orderBy: rounds.roundNumber,
        with: { solves: true },
      },
      checkpoint: true,
    },
  })
  if (!battle) return null

  const participants = battle.participants.map((p) => p.userId)
  const participantNames: Record<string, string> = {}
  for (const p of battle.participants) {
    participantNames[p.userId] = p.user.displayName
  }

  const roundsMap: Record<string, { roundNumber: number; scramble: string }> = {}
  const roundOrder: string[] = []
  for (const round of battle.rounds) {
    roundsMap[round.id] = { roundNumber: round.roundNumber, scramble: round.scramble }
    roundOrder.push(round.id)
  }

  const solves: Record<string, Record<string, { timeMs: number; penalty: 'none' | 'plus_two' | 'dnf' }>> = {}
  for (const round of battle.rounds) {
    solves[round.id] = {}
    for (const solve of round.solves) {
      solves[round.id][solve.userId] = {
        timeMs: solve.timeMs,
        penalty: solve.penalty,
      }
    }
  }

  const settings = battle.settings as unknown as RoomSettings
  const config = {
    roundCount: settings.roundCount,
    inspectionSeconds: settings.inspectionSeconds,
    readyTimeoutSeconds: settings.readyTimeoutSeconds,
  }

  let phase: Phase = 'scramble'
  let roundNumber = 1
  let roundId = roundOrder[0] ?? ''
  let deadlineAt: string | null = null
  let readyUserIds: string[] = []
  let submittedUserIds: string[] = []

  if (battle.checkpoint) {
    // Restore from checkpoint: round, phase, deadline. Ready state resets;
    // submitted solves are durable and stay intact.
    phase = battle.checkpoint.phase as Phase
    roundId = battle.checkpoint.roundId
    const roundRow = battle.rounds.find((r) => r.id === roundId)
    roundNumber = roundRow?.roundNumber ?? 1
    deadlineAt = battle.checkpoint.deadlineAt
      ? battle.checkpoint.deadlineAt.toISOString()
      : null
    submittedUserIds = Object.keys(solves[roundId] ?? {}).sort()
  }

  const state: RuntimeState = {
    battleId: battle.id,
    roomId: battle.roomId,
    phase,
    roundNumber,
    roundId,
    deadlineAt,
    readyUserIds,
    submittedUserIds,
    solves,
    rounds: roundsMap,
    roundOrder,
    participants,
    participantNames,
    hostUserId: '', // filled by caller from room
    config,
    battleEnded: false,
    standings: null,
  }
  return state
}

/**
 * The in-memory authority for a room's live battle state. Holds the mutable
 * runtime state and phase timers, persists durable facts, and publishes full
 * `battleState` snapshots into the room's channel. It never holds peers:
 * connections live only in the room channel registry.
 */
export class RoomRuntime {
  private state: RuntimeState
  private timer: ReturnType<typeof setTimeout> | null = null
  private advancing = false

  constructor(
    private readonly db: Database,
    state: RuntimeState,
    hostUserId: string,
    private readonly publish: Publisher = publishToRoom,
  ) {
    this.state = { ...state, hostUserId }
    this.scheduleDeadline()
  }

  get snapshot(): RuntimeState {
    return this.state
  }

  /** The full battle snapshot every client applies by replacement. */
  toBattleState(): BattleStateMessage {
    return {
      type: 'battleState',
      battleId: this.state.battleId,
      phase: this.state.phase,
      roundId: this.state.roundId || null,
      roundNumber: this.state.roundNumber,
      deadlineAt: this.state.deadlineAt,
      scramble: this.currentScramble(),
      participants: this.participantViews(),
      readyUserIds: this.state.readyUserIds,
      submittedUserIds: this.state.submittedUserIds,
      roundResults: this.completedRoundResults(),
      battleEnded: this.state.battleEnded,
      standings: this.state.standings,
    }
  }

  /** Route an inbound client message (already JSON-parsed) to its handler. */
  async handleMessage(userId: string, payload: unknown): Promise<void> {
    const parsed = safeParseClientMessage(payload)
    if (!parsed.success) {
      this.sendError(userId, 'malformed message')
      return
    }

    switch (parsed.data.type) {
      case 'ready':
        await this.handleReady(userId)
        break
      case 'submit':
        await this.handleSubmit(userId, parsed.data.timeMs, parsed.data.penalty)
        break
      case 'forceStart':
        await this.handleForceStart(userId)
        break
    }
  }

  private async handleReady(userId: string): Promise<void> {
    if (!this.state.participants.includes(userId)) {
      this.sendError(userId, 'you are not a participant in this battle')
      return
    }
    if (this.state.phase !== 'scramble') {
      this.sendError(userId, 'ready is only accepted during the scramble phase')
      return
    }

    this.state = applyReady(this.state, userId)

    if (canAdvance(this.state, Date.now())) {
      await this.advancePhase()
    } else {
      this.publishBattleState()
    }
  }

  private async handleSubmit(
    userId: string,
    timeMs: number,
    penalty: 'none' | 'plus_two' | 'dnf',
  ): Promise<void> {
    if (this.state.phase !== 'solving') {
      this.sendError(userId, 'submissions are only accepted during the solving phase')
      return
    }
    if (!this.state.participants.includes(userId)) {
      this.sendError(userId, 'you are not a participant in this battle')
      return
    }
    if (this.state.submittedUserIds.includes(userId)) {
      this.sendError(userId, 'you have already submitted a solve for this round')
      return
    }

    this.state = applySubmit(this.state, userId, timeMs, penalty)
    // A submitted solve is a durable fact: persist it alongside the runtime.
    await this.db.insert(solves).values({
      roundId: this.state.roundId,
      userId,
      timeMs,
      penalty,
    })

    if (canAdvance(this.state, Date.now())) {
      await this.advancePhase()
    } else {
      this.publishBattleState()
    }
  }

  /**
   * Host force-start: fires the current gate immediately. On a forced solving
   * end, writes DNF solves for unsubmitted participants before advancing.
   */
  private async handleForceStart(userId: string): Promise<void> {
    if (userId !== this.state.hostUserId) {
      this.sendError(userId, 'only the host can force-start')
      return
    }

    if (this.state.phase === 'solving') {
      await this.writeDnfSolves()
    }

    await this.advancePhase()
  }

  /**
   * Write DNF solves for participants who haven't submitted, then mark all as
   * submitted so the solving gate fires.
   */
  private async writeDnfSolves(): Promise<void> {
    const unsubmitted = this.state.participants.filter(
      (pid) => !this.state.submittedUserIds.includes(pid),
    )
    if (unsubmitted.length === 0) return

    const roundSolves = { ...(this.state.solves[this.state.roundId] ?? {}) }
    for (const pid of unsubmitted) {
      roundSolves[pid] = { timeMs: 0, penalty: 'dnf' }
      await this.db.insert(solves).values({
        roundId: this.state.roundId,
        userId: pid,
        timeMs: 0,
        penalty: 'dnf',
      })
    }

    this.state = {
      ...this.state,
      solves: { ...this.state.solves, [this.state.roundId]: roundSolves },
      submittedUserIds: [...this.state.participants].sort(),
    }
  }

  /**
   * Advance to the next phase: persist the checkpoint, broadcast the full
   * `battleState` snapshot with its new absolute deadline, and schedule the
   * next timer. If the final round's results gate fires, end the battle.
   */
  async advancePhase(): Promise<void> {
    if (this.advancing) return
    this.advancing = true
    try {
      // Final round results -> battle ends.
      if (
        this.state.phase === 'results' &&
        this.state.roundNumber >= this.state.config.roundCount
      ) {
        await this.endBattle()
        return
      }

      const next = nextPhase(this.state)
      const now = Date.now()

      let newRoundId = this.state.roundId
      let newRoundNumber = this.state.roundNumber
      if (next === 'scramble') {
        newRoundNumber += 1
        const nextRound = this.state.roundOrder.find(
          (id) => this.state.rounds[id]?.roundNumber === newRoundNumber,
        )
        newRoundId = nextRound ?? this.state.roundId
      }

      const newSubmitted =
        next === 'scramble' ? [] : [...this.state.submittedUserIds]

      const newState: RuntimeState = {
        ...this.state,
        phase: next,
        roundNumber: newRoundNumber,
        roundId: newRoundId,
        deadlineAt: null,
        readyUserIds: [],
        submittedUserIds: newSubmitted,
      }
      const deadlineMs = phaseDeadline(next, now, this.state.config)
      newState.deadlineAt =
        deadlineMs !== null ? new Date(deadlineMs).toISOString() : null

      this.state = newState
      await this.persistCheckpoint()
      this.scheduleDeadline()
      this.publishBattleState()
    } finally {
      this.advancing = false
    }
  }

  /**
   * End the battle: mark it ended in one transaction, publish the final
   * `battleState` with standings, then a fresh `roomState` with the battle
   * gone, and evict the runtime so the room admits its next battle.
   */
  private async endBattle(): Promise<void> {
    const standings = computeStandings(
      this.state.solves,
      this.state.roundOrder,
      this.state.participants,
      this.state.participantNames,
    )

    await this.db.transaction(async (tx) => {
      await tx
        .update(battles)
        .set({ status: 'ended', endedAt: new Date() })
        .where(eq(battles.id, this.state.battleId))
    })

    this.state = { ...this.state, battleEnded: true, standings }
    this.publishBattleState()
    await publishRoomState(this.db, this.state.roomId)
    RoomRuntime.evict(this.state.roomId)
  }

  /** Upsert the battle's single checkpoint row on every transition. */
  private async persistCheckpoint(): Promise<void> {
    await this.db
      .insert(phaseCheckpoints)
      .values({
        battleId: this.state.battleId,
        roundId: this.state.roundId,
        phase: this.state.phase,
        deadlineAt: this.state.deadlineAt ? new Date(this.state.deadlineAt) : null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: phaseCheckpoints.battleId,
        set: {
          roundId: this.state.roundId,
          phase: this.state.phase,
          deadlineAt: this.state.deadlineAt ? new Date(this.state.deadlineAt) : null,
          updatedAt: new Date(),
        },
      })
  }

  /** Schedule a timer to fire when the current phase deadline passes. */
  private scheduleDeadline(): void {
    this.clearTimer()
    if (!this.state.deadlineAt) return
    const ms = new Date(this.state.deadlineAt).getTime() - Date.now()
    if (ms <= 0) {
      void this.advancePhase()
    } else {
      this.timer = setTimeout(() => void this.advancePhase(), ms)
    }
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  /* ------------------------------------------------------------------ */
  /* Publishing                                                         */
  /* ------------------------------------------------------------------ */

  private publishBattleState(): void {
    this.publish(this.state.roomId, this.toBattleState())
  }

  private sendError(userId: string, message: string): void {
    currentRoomChannel(this.state.roomId)?.sendToUser(userId, {
      type: 'error',
      message,
    })
  }

  /** The current round's scramble, or null between battles. */
  private currentScramble(): string | null {
    return this.state.rounds[this.state.roundId]?.scramble ?? null
  }

  /** The frozen participant set with display names. */
  private participantViews(): Array<{ userId: string; displayName: string }> {
    return this.state.participants.map((userId) => ({
      userId,
      displayName: this.state.participantNames[userId] ?? '',
    }))
  }

  /**
   * Ranked results for completed rounds only. The current round's solves stay
   * hidden until its results phase opens, so nobody sees times mid-round.
   */
  private completedRoundResults(): CompletedRound[] {
    const results: CompletedRound[] = []
    for (const roundId of this.state.roundOrder) {
      const round = this.state.rounds[roundId]
      if (!round) continue
      const isCurrent = roundId === this.state.roundId
      const isComplete =
        round.roundNumber < this.state.roundNumber ||
        (isCurrent && this.state.phase === 'results') ||
        this.state.battleEnded
      if (!isComplete) continue

      const roundSolves = this.state.solves[roundId]
      if (!roundSolves || Object.keys(roundSolves).length === 0) continue
      results.push({ roundId, results: this.roundResultsFor(roundId) })
    }
    return results
  }

  /** Ranked solves for one round: fastest first, DNFs last, ties shared. */
  private roundResultsFor(roundId: string): Array<{
    userId: string
    timeMs: number
    penalty: 'none' | 'plus_two' | 'dnf'
    placement: number
  }> {
    const roundSolves = this.state.solves[roundId] ?? {}
    return computeRoundStandings(roundSolves, this.state.participants).map(
      (entry) => ({
        userId: entry.userId,
        timeMs: roundSolves[entry.userId]?.timeMs ?? 0,
        penalty: roundSolves[entry.userId]?.penalty ?? 'dnf',
        placement: entry.placement,
      }),
    )
  }

  /* ------------------------------------------------------------------ */
  /* Lifecycle                                                          */
  /* ------------------------------------------------------------------ */

  static async getOrBuild(db: Database, roomId: string): Promise<RoomRuntime | null> {
    const existing = runtimes.get(roomId)
    if (existing) return existing

    const pending = building.get(roomId)
    if (pending) return pending

    const promise = (async () => {
      try {
        const roomBattle = await db.query.battles.findFirst({
          where: and(eq(battles.roomId, roomId), eq(battles.status, 'active')),
        })
        if (!roomBattle) return null

        const [roomRow] = await db
          .select({ hostId: rooms.hostId })
          .from(rooms)
          .where(eq(rooms.id, roomId))
          .limit(1)
        if (!roomRow) return null

        const state = await buildRuntimeState(db, roomBattle.id)
        if (!state) return null

        const runtime = new RoomRuntime(db, state, roomRow.hostId)
        runtimes.set(roomId, runtime)
        return runtime
      } finally {
        building.delete(roomId)
      }
    })()
    building.set(roomId, promise)
    return promise
  }

  /** The live runtime for a room, if one is cached (never builds). */
  static current(roomId: string): RoomRuntime | undefined {
    return runtimes.get(roomId)
  }

  static evict(roomId: string): void {
    const runtime = runtimes.get(roomId)
    if (runtime) {
      runtime.clearTimer()
      runtimes.delete(roomId)
    }
  }

  static has(roomId: string): boolean {
    return runtimes.has(roomId)
  }
}
