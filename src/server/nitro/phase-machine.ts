import { type Penalty, type Phase } from './protocol'

/**
 * The phase sequence for each round: scramble -> countdown -> inspection ->
 * solving -> results. Each transition is decided once on the server and
 * applied to all cubers at the same moment.
 */
export type { Phase }

/** Fixed length of the pre-inspection countdown, in seconds. */
export const COUNTDOWN_SECONDS = 3

/** How long the results phase is shown before advancing to the next round. */
export const RESULTS_DISPLAY_SECONDS = 5

/** Battle settings relevant to the phase machine. */
export interface BattleConfig {
  roundCount: number
  inspectionSeconds: number
  readyTimeoutSeconds: number
}

/** A competitor's accumulated standing in a battle. */
export interface Standing {
  userId: string
  displayName: string
  points: number
}

/**
 * The full live state of a running battle. All fields are plain JSON data so
 * the state can be serialized to clients, persisted to the checkpoint row, and
 * rebuilt from the database after a restart.
 */
export interface RuntimeState {
  battleId: string
  roomId: string
  phase: Phase
  roundNumber: number
  roundId: string
  deadlineAt: string | null
  readyUserIds: string[]
  submittedUserIds: string[]
  /** roundId -> userId -> solve */
  solves: Record<string, Record<string, { timeMs: number; penalty: Penalty }>>
  /** roundId -> { roundNumber, scramble } */
  rounds: Record<string, { roundNumber: number; scramble: string }>
  /** Round ids in order. */
  roundOrder: string[]
  participants: string[]
  participantNames: Record<string, string>
  hostUserId: string
  config: BattleConfig
  battleEnded: boolean
  standings: Standing[] | null
}

/** Whether every participant has readied for the current gate. */
export function isAllReady(state: RuntimeState): boolean {
  return state.participants.every((pid) => state.readyUserIds.includes(pid))
}

/** Whether every participant has submitted a solve for the current round. */
export function isAllSubmitted(state: RuntimeState): boolean {
  return state.participants.every((pid) => state.submittedUserIds.includes(pid))
}

/** The phase that follows the current one. */
export function nextPhase(state: RuntimeState): Phase {
  switch (state.phase) {
    case 'scramble':
      return 'countdown'
    case 'countdown':
      return state.config.inspectionSeconds > 0 ? 'inspection' : 'solving'
    case 'inspection':
      return 'solving'
    case 'solving':
      return 'results'
    case 'results':
      return 'scramble'
  }
}

/** Absolute deadline (epoch ms) for entering a phase, or null for none. */
export function phaseDeadline(
  phase: Phase,
  now: number,
  config: BattleConfig,
): number | null {
  switch (phase) {
    case 'scramble':
      return now + config.readyTimeoutSeconds * 1000
    case 'countdown':
      return now + COUNTDOWN_SECONDS * 1000
    case 'inspection':
      return config.inspectionSeconds > 0 ? now + config.inspectionSeconds * 1000 : null
    case 'solving':
      return null
    case 'results':
      return now + RESULTS_DISPLAY_SECONDS * 1000
  }
}

/**
 * Whether the current phase can advance: its deadline has passed, its gate is
 * satisfied (all ready in scramble, all submitted in solving), or the host has
 * forced (handled by the caller).
 */
export function canAdvance(state: RuntimeState, now: number): boolean {
  if (state.deadlineAt && now >= new Date(state.deadlineAt).getTime()) return true
  if (state.phase === 'scramble' && isAllReady(state)) return true
  if (state.phase === 'solving' && isAllSubmitted(state)) return true
  return false
}

/** Return state with the given user added to the ready set (idempotent). */
export function applyReady(state: RuntimeState, userId: string): RuntimeState {
  if (state.readyUserIds.includes(userId)) return state
  return { ...state, readyUserIds: [...state.readyUserIds, userId].sort() }
}

/**
 * Return state with the given user's solve recorded for the current round and
 * the user added to the submitted set (idempotent). Rejects repeats: a user
 * who already submitted is unchanged.
 */
export function applySubmit(
  state: RuntimeState,
  userId: string,
  timeMs: number,
  penalty: Penalty,
): RuntimeState {
  if (state.submittedUserIds.includes(userId)) return state
  const roundSolves = { ...(state.solves[state.roundId] ?? {}) }
  roundSolves[userId] = { timeMs, penalty }
  const solves = { ...state.solves, [state.roundId]: roundSolves }
  return {
    ...state,
    submittedUserIds: [...state.submittedUserIds, userId].sort(),
    solves,
  }
}

export { computeStandings } from './standings'
