import { describe, expect, it } from 'vitest'

import {
  canForceGate,
  evaluateReadyGate,
  evaluateSubmittedGate,
} from './gates'
import type { RuntimeState } from './phase-machine'

const config = {
  roundCount: 3,
  inspectionSeconds: 15,
  readyTimeoutSeconds: 30,
}

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
    rounds: { 'round-1': { roundNumber: 1, scramble: 'S1' } },
    roundOrder: ['round-1'],
    participants: ['alice', 'bob'],
    participantNames: { alice: 'Alice', bob: 'Bob' },
    hostUserId: 'alice',
    config,
    battleEnded: false,
    standings: null,
    ...overrides,
  }
}

describe('ready gate', () => {
  it('is satisfied when every participant has readied', () => {
    const state = makeState({ readyUserIds: ['alice', 'bob'] })
    expect(evaluateReadyGate(state, Date.now()).satisfied).toBe(true)
  })

  it('is not satisfied while a participant has not readied', () => {
    const state = makeState({ readyUserIds: ['alice'] })
    expect(evaluateReadyGate(state, Date.now()).satisfied).toBe(false)
  })

  it('uses the state\'s entered-phase deadline, not a fresh one', () => {
    const state = makeState({ deadlineAt: new Date(5_000).toISOString() })
    const gate = evaluateReadyGate(state, 1_000)
    expect(gate.deadlineAt).toBe(new Date(5_000).toISOString())
  })

  it('is expired when the deadline has passed', () => {
    const state = makeState({ deadlineAt: new Date(1_000).toISOString() })
    const gate = evaluateReadyGate(state, 2_000)
    expect(gate.expired).toBe(true)
  })

  it('is not expired while the deadline is in the future', () => {
    const state = makeState({ deadlineAt: new Date(2_000).toISOString() })
    const gate = evaluateReadyGate(state, 1_000)
    expect(gate.expired).toBe(false)
  })

  it('is never expired without a deadline', () => {
    const gate = evaluateReadyGate(makeState({ deadlineAt: null }), Date.now())
    expect(gate.expired).toBe(false)
  })

  it('carries the strict participant denominator', () => {
    const state = makeState({ participants: ['alice', 'bob'], readyUserIds: ['alice'] })
    // Only two participants: bob still unready, so not satisfied even though
    // a late joiner (carol) is not in the denominator.
    expect(evaluateReadyGate(state, Date.now()).satisfied).toBe(false)
  })
})

describe('submitted gate', () => {
  it('is satisfied when every participant has submitted', () => {
    const state = makeState({
      phase: 'solving',
      submittedUserIds: ['alice', 'bob'],
    })
    expect(evaluateSubmittedGate(state).satisfied).toBe(true)
  })

  it('is not satisfied while a participant has not submitted', () => {
    const state = makeState({ phase: 'solving', submittedUserIds: ['alice'] })
    expect(evaluateSubmittedGate(state).satisfied).toBe(false)
  })

  it('has no deadline — the solving gate deliberately never expires', () => {
    const gate = evaluateSubmittedGate(makeState({ phase: 'solving' }))
    expect(gate.deadlineAt).toBeNull()
    expect(gate.expired).toBe(false)
  })
})

describe('host force', () => {
  it('the host can force a gate', () => {
    const state = makeState({ hostUserId: 'alice' })
    expect(canForceGate(state, 'alice')).toBe(true)
  })

  it('a non-host cannot force a gate', () => {
    const state = makeState({ hostUserId: 'alice' })
    expect(canForceGate(state, 'bob')).toBe(false)
    expect(canForceGate(state, 'spectator')).toBe(false)
  })
})
