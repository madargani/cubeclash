import type { RuntimeState } from './phase-machine'

/** The two gate types used by the phase machine. */
export type GateType = 'ready' | 'submitted'

/** The result of evaluating a gate against the current state. */
export interface GateResult {
  type: GateType
  /** Whether the gate's condition is met (all ready / all submitted). */
  satisfied: boolean
  /** Absolute ISO deadline for the gate, or null if none. */
  deadlineAt: string | null
  /** Whether the gate's deadline has already passed. */
  expired: boolean
  /** User id of the host, who may force the gate. */
  hostUserId: string
}

/**
 * Ready gate: advances when every participant has readied, when the ready
 * timeout passes, or when the host forces it. Strict denominator: the
 * participant set frozen at battle start. The deadline is the state's
 * `deadlineAt` (set when the phase was entered).
 */
export function evaluateReadyGate(state: RuntimeState, now: number): GateResult {
  const satisfied = state.participants.every((pid) => state.readyUserIds.includes(pid))
  const deadlineMs = state.deadlineAt ? new Date(state.deadlineAt).getTime() : null
  return {
    type: 'ready',
    satisfied,
    deadlineAt: state.deadlineAt,
    expired: deadlineMs !== null && now >= deadlineMs,
    hostUserId: state.hostUserId,
  }
}

/**
 * Submitted gate: advances when every participant has submitted, or when the
 * host forces it. Deliberately has no deadline (host force-start is the
 * escape hatch).
 */
export function evaluateSubmittedGate(state: RuntimeState): GateResult {
  const satisfied = state.participants.every((pid) => state.submittedUserIds.includes(pid))
  return {
    type: 'submitted',
    satisfied,
    deadlineAt: null,
    expired: false,
    hostUserId: state.hostUserId,
  }
}

/** Whether the given user is the host and may force a gate. */
export function canForceGate(state: RuntimeState, userId: string): boolean {
  return userId === state.hostUserId
}
