import { describe, expect, it } from 'vitest'

import {
  applyReady,
  applySubmit,
  canAdvance,
  isAllReady,
  isAllSubmitted,
  nextPhase,
  phaseDeadline,
  type BattleConfig,
  type RuntimeState,
} from './phase-machine'

const config: BattleConfig = {
  roundCount: 3,
  inspectionSeconds: 15,
  readyTimeoutSeconds: 30,
}

/** A two-participant battle in the scramble phase of round 1. */
function makeState(overrides: Partial<RuntimeState> = {}): RuntimeState {
  return {
    battleId: 'battle-1',
    roomId: 'room-1',
    phase: 'scramble',
    roundNumber: 1,
    roundId: 'round-1',
    deadlineAt: null,
    readyUserIds: [],
    submittedUserIds: [],
    solves: {},
    rounds: {
      'round-1': { roundNumber: 1, scramble: 'S1' },
      'round-2': { roundNumber: 2, scramble: 'S2' },
      'round-3': { roundNumber: 3, scramble: 'S3' },
    },
    roundOrder: ['round-1', 'round-2', 'round-3'],
    participants: ['alice', 'bob'],
    participantNames: { alice: 'Alice', bob: 'Bob' },
    hostUserId: 'alice',
    config,
    battleEnded: false,
    standings: null,
    ...overrides,
  }
}

describe('phase machine: the round sequence', () => {
  it('walks scramble -> countdown -> inspection -> solving -> results', () => {
    let state = makeState()

    expect(state.phase).toBe('scramble')
    state = { ...state, phase: nextPhase(state) }
    expect(state.phase).toBe('countdown')

    state = { ...state, phase: nextPhase(state) }
    expect(state.phase).toBe('inspection')

    state = { ...state, phase: nextPhase(state) }
    expect(state.phase).toBe('solving')

    state = { ...state, phase: nextPhase(state) }
    expect(state.phase).toBe('results')

    state = { ...state, phase: nextPhase(state) }
    expect(state.phase).toBe('scramble')
  })

  it('a zero-inspection battle skips straight from countdown to solving', () => {
    const zero = makeState({
      config: { ...config, inspectionSeconds: 0 },
      phase: 'countdown',
    })
    expect(nextPhase(zero)).toBe('solving')
  })

  it('countdown still leads into inspection when inspection time is configured', () => {
    const state = makeState({ phase: 'countdown' })
    expect(nextPhase(state)).toBe('inspection')
  })
})

describe('phase machine: deadlines', () => {
  const now = 1_000_000

  it('scramble deadlines on the ready timeout', () => {
    expect(phaseDeadline('scramble', now, config)).toBe(now + 30_000)
  })

  it('countdown deadlines on the fixed 3-second countdown', () => {
    expect(phaseDeadline('countdown', now, config)).toBe(now + 3_000)
  })

  it('inspection deadlines on the configured inspection seconds', () => {
    expect(phaseDeadline('inspection', now, config)).toBe(now + 15_000)
  })

  it('solving has no deadline', () => {
    expect(phaseDeadline('solving', now, config)).toBeNull()
  })

  it('results has a short display deadline', () => {
    expect(phaseDeadline('results', now, config)).toBe(now + 5_000)
  })

  it('zero inspection has no inspection deadline (phase is skipped)', () => {
    const zero: BattleConfig = { ...config, inspectionSeconds: 0 }
    expect(phaseDeadline('inspection', now, zero)).toBeNull()
  })
})

describe('phase machine: canAdvance', () => {
  it('advances scramble when every participant has readied', () => {
    const state = makeState({ readyUserIds: ['alice', 'bob'] })
    expect(isAllReady(state)).toBe(true)
    expect(canAdvance(state, Date.now())).toBe(true)
  })

  it('does not advance scramble while someone has not readied', () => {
    const state = makeState({ readyUserIds: ['alice'] })
    expect(canAdvance(state, Date.now())).toBe(false)
  })

  it('advances scramble when the ready deadline has passed', () => {
    const state = makeState({ deadlineAt: new Date(1_000).toISOString() })
    expect(canAdvance(state, 2_000)).toBe(true)
  })

  it('advances solving when every participant has submitted', () => {
    const state = makeState({
      phase: 'solving',
      deadlineAt: null,
      submittedUserIds: ['alice', 'bob'],
    })
    expect(isAllSubmitted(state)).toBe(true)
    expect(canAdvance(state, Date.now())).toBe(true)
  })

  it('does not advance solving while someone has not submitted', () => {
    const state = makeState({
      phase: 'solving',
      deadlineAt: null,
      submittedUserIds: ['alice'],
    })
    expect(canAdvance(state, Date.now())).toBe(false)
  })

  it('does not advance when the deadline is in the future', () => {
    const state = makeState({ deadlineAt: new Date(2_000).toISOString() })
    expect(canAdvance(state, 1_000)).toBe(false)
  })
})

describe('phase machine: ready and submit application', () => {
  it('applyReady adds the user to the ready set', () => {
    const state = applyReady(makeState(), 'alice')
    expect(state.readyUserIds).toEqual(['alice'])
  })

  it('applyReady is idempotent', () => {
    const state = applyReady(applyReady(makeState(), 'alice'), 'alice')
    expect(state.readyUserIds).toEqual(['alice'])
  })

  it('applySubmit records the solve and adds the user to the submitted set', () => {
    const state = applySubmit(makeState(), 'alice', 12_345, 'plus_two')
    expect(state.submittedUserIds).toEqual(['alice'])
    expect(state.solves['round-1']?.alice).toEqual({ timeMs: 12_345, penalty: 'plus_two' })
  })

  it('applySubmit is idempotent: a repeat does not overwrite the recorded solve', () => {
    const first = applySubmit(makeState(), 'alice', 12_345, 'plus_two')
    const second = applySubmit(first, 'alice', 99_999, 'dnf')
    expect(second.solves['round-1']?.alice).toEqual({ timeMs: 12_345, penalty: 'plus_two' })
    expect(second.submittedUserIds).toEqual(['alice'])
  })

  it('applySubmit does not mutate the input state', () => {
    const original = makeState()
    applySubmit(original, 'alice', 1_000, 'none')
    expect(original.submittedUserIds).toEqual([])
    expect(original.solves).toEqual({})
  })
})
