import { describe, expect, it } from 'vitest'

import {
  parseClientMessage,
  parseServerMessage,
  safeParseClientMessage,
  safeParseServerMessage,
  type BattleStateMessage,
  type ClientMessage,
  type RoomStateMessage,
} from './protocol'

const roomSettings = {
  eventType: '333',
  roundCount: 5,
  inspectionSeconds: 15,
  readyTimeoutSeconds: 30,
}

function sampleRoomState(): RoomStateMessage {
  return {
    type: 'roomState',
    id: 'room-1',
    inviteCode: 'abc234',
    host: { userId: 'user-1', displayName: 'Alice' },
    members: [
      { userId: 'user-1', displayName: 'Alice' },
      { userId: 'user-2', displayName: 'Bob' },
    ],
    settings: roomSettings,
    activeBattle: {
      id: 'battle-1',
      status: 'active',
      startedAt: '2026-11-18T12:00:00.000Z',
      settings: roomSettings,
    },
  }
}

function sampleBattleState(): BattleStateMessage {
  return {
    type: 'battleState',
    battleId: 'battle-1',
    phase: 'solving',
    roundId: 'round-1',
    roundNumber: 1,
    deadlineAt: null,
    scramble: "R U R' U'",
    participants: [
      { userId: 'user-1', displayName: 'Alice' },
      { userId: 'user-2', displayName: 'Bob' },
    ],
    readyUserIds: [],
    submittedUserIds: ['user-1'],
    roundResults: [],
    battleEnded: false,
    standings: null,
  }
}

describe('client message protocol', () => {
  it('round-trips a ready message', () => {
    const message: ClientMessage = { type: 'ready' }
    expect(parseClientMessage(message)).toEqual(message)
    expect(safeParseClientMessage(message).success).toBe(true)
  })

  it('round-trips a submit message', () => {
    const message: ClientMessage = { type: 'submit', timeMs: 12345, penalty: 'plus_two' }
    expect(parseClientMessage(message)).toEqual(message)
    expect(safeParseClientMessage(message).success).toBe(true)
  })

  it('round-trips a forceStart message', () => {
    const message: ClientMessage = { type: 'forceStart' }
    expect(parseClientMessage(message)).toEqual(message)
    expect(safeParseClientMessage(message).success).toBe(true)
  })

  it('round-trips an updateSettings message with loose form values', () => {
    const message: ClientMessage = {
      type: 'updateSettings',
      settings: {
        eventType: '333',
        roundCount: '5',
        inspectionSeconds: '15',
        readyTimeoutSeconds: '30',
      },
    }
    expect(parseClientMessage(message)).toEqual(message)
    expect(safeParseClientMessage(message).success).toBe(true)
  })

  it('round-trips a startBattle message', () => {
    const message: ClientMessage = { type: 'startBattle' }
    expect(parseClientMessage(message)).toEqual(message)
    expect(safeParseClientMessage(message).success).toBe(true)
  })

  it('rejects an updateSettings message without settings', () => {
    const result = safeParseClientMessage({ type: 'updateSettings' })
    expect(result.success).toBe(false)
  })

  it('rejects an updateSettings message whose settings are not an object', () => {
    const result = safeParseClientMessage({ type: 'updateSettings', settings: 'nope' })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown client message type', () => {
    const result = safeParseClientMessage({ type: 'nope' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1)
    }
  })

  it('rejects a submit message with a negative timeMs', () => {
    const result = safeParseClientMessage({ type: 'submit', timeMs: -1, penalty: 'none' })
    expect(result.success).toBe(false)
  })

  it('rejects a submit message with a fractional timeMs', () => {
    const result = safeParseClientMessage({ type: 'submit', timeMs: 12.5, penalty: 'none' })
    expect(result.success).toBe(false)
  })

  it('rejects a submit message with an invalid penalty', () => {
    const result = safeParseClientMessage({
      type: 'submit',
      timeMs: 100,
      penalty: 'disqualified',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a submit message missing timeMs', () => {
    const result = safeParseClientMessage({ type: 'submit', penalty: 'none' })
    expect(result.success).toBe(false)
  })
})

describe('roomState message', () => {
  it('round-trips a room snapshot with an active battle', () => {
    const message = sampleRoomState()
    expect(parseServerMessage(message)).toEqual(message)
    expect(safeParseServerMessage(message).success).toBe(true)
  })

  it('round-trips a room snapshot with no active battle', () => {
    const message = { ...sampleRoomState(), activeBattle: null }
    expect(parseServerMessage(message)).toEqual(message)
    expect(safeParseServerMessage(message).success).toBe(true)
  })

  it('rejects a room snapshot with malformed settings', () => {
    const result = safeParseServerMessage({
      ...sampleRoomState(),
      settings: { ...roomSettings, roundCount: 'many' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects a room snapshot missing the member list', () => {
    const { members: _members, ...message } = sampleRoomState()
    expect(safeParseServerMessage(message).success).toBe(false)
  })
})

describe('battleState message', () => {
  it('round-trips a battle snapshot during solving', () => {
    const message = sampleBattleState()
    expect(parseServerMessage(message)).toEqual(message)
    expect(safeParseServerMessage(message).success).toBe(true)
  })

  it('round-trips a snapshot with a deadline and completed rounds', () => {
    const message: BattleStateMessage = {
      ...sampleBattleState(),
      phase: 'results',
      deadlineAt: '2026-11-18T12:00:15.000Z',
      roundResults: [
        {
          roundId: 'round-1',
          results: [
            { userId: 'user-1', timeMs: 12345, penalty: 'none', placement: 1 },
            { userId: 'user-2', timeMs: 14345, penalty: 'plus_two', placement: 2 },
          ],
        },
      ],
    }
    expect(parseServerMessage(message)).toEqual(message)
    expect(safeParseServerMessage(message).success).toBe(true)
  })

  it('round-trips an ended battle snapshot with standings', () => {
    const message: BattleStateMessage = {
      ...sampleBattleState(),
      battleEnded: true,
      standings: [
        { userId: 'user-1', displayName: 'Alice', points: 9 },
        { userId: 'user-2', displayName: 'Bob', points: 6 },
      ],
    }
    expect(parseServerMessage(message)).toEqual(message)
    expect(safeParseServerMessage(message).success).toBe(true)
  })

  it('rejects an unknown phase', () => {
    const result = safeParseServerMessage({ ...sampleBattleState(), phase: 'countdownish' })
    expect(result.success).toBe(false)
  })

  it('rejects a snapshot missing the frozen participant set', () => {
    const { participants: _participants, ...message } = sampleBattleState()
    expect(safeParseServerMessage(message).success).toBe(false)
  })

  it('rejects a round result with a non-positive placement', () => {
    const result = safeParseServerMessage({
      ...sampleBattleState(),
      roundResults: [
        {
          roundId: 'round-1',
          results: [{ userId: 'user-1', timeMs: 1000, penalty: 'none', placement: 0 }],
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects a battleEnded snapshot with non-integer points', () => {
    const result = safeParseServerMessage({
      ...sampleBattleState(),
      battleEnded: true,
      standings: [{ userId: 'user-1', displayName: 'Alice', points: 3.5 }],
    })
    expect(result.success).toBe(false)
  })
})

describe('error message', () => {
  it('round-trips an error message', () => {
    const message = { type: 'error' as const, message: 'not a participant' }
    expect(parseServerMessage(message)).toEqual(message)
    expect(safeParseServerMessage(message).success).toBe(true)
  })

  it('rejects an unknown server message type', () => {
    expect(safeParseServerMessage({ type: 'nope' }).success).toBe(false)
  })

  it('throws when parsing a malformed server message', () => {
    expect(() => parseServerMessage({ type: 'nope' })).toThrow()
  })
})
