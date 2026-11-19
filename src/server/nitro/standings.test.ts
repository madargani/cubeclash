import { describe, expect, it } from 'vitest'

import { computeRoundStandings, computeStandings } from './standings'

const participants = ['alice', 'bob', 'carol']
const names: Record<string, string> = {
  alice: 'Alice',
  bob: 'Bob',
  carol: 'Carol',
}

describe('round standings', () => {
  it('ranks fastest-first', () => {
    const ranked = computeRoundStandings(
      {
        alice: { timeMs: 12_000, penalty: 'none' },
        bob: { timeMs: 10_000, penalty: 'none' },
        carol: { timeMs: 15_000, penalty: 'none' },
      },
      participants,
    )
    expect(ranked.map((r) => r.userId)).toEqual(['bob', 'alice', 'carol'])
    expect(ranked.map((r) => r.placement)).toEqual([1, 2, 3])
  })

  it('adjusts plus-two times and keeps the raw time in the result', () => {
    const ranked = computeRoundStandings(
      {
        alice: { timeMs: 12_000, penalty: 'none' },
        bob: { timeMs: 10_000, penalty: 'plus_two' },
      },
      ['alice', 'bob'],
    )
    expect(ranked.map((r) => r.userId)).toEqual(['alice', 'bob'])
    expect(ranked[1].finalTimeMs).toBe(12_000)
  })

  it('ties share the better placement and skip the next one', () => {
    const ranked = computeRoundStandings(
      {
        alice: { timeMs: 10_000, penalty: 'none' },
        bob: { timeMs: 10_000, penalty: 'none' },
        carol: { timeMs: 12_000, penalty: 'none' },
      },
      participants,
    )
    expect(ranked.map((r) => r.placement)).toEqual([1, 1, 3])
  })

  it('places DNFs last, unsolved', () => {
    const ranked = computeRoundStandings(
      {
        alice: { timeMs: 12_000, penalty: 'none' },
        bob: { timeMs: 0, penalty: 'dnf' },
        carol: { timeMs: 15_000, penalty: 'none' },
      },
      participants,
    )
    expect(ranked.map((r) => r.userId)).toEqual(['alice', 'carol', 'bob'])
    expect(ranked[2].isDnf).toBe(true)
    expect(ranked[2].finalTimeMs).toBeNull()
  })

  it('treats an unsubmitted participant as a DNF', () => {
    const ranked = computeRoundStandings(
      { alice: { timeMs: 12_000, penalty: 'none' } },
      ['alice', 'bob'],
    )
    expect(ranked[1].userId).toBe('bob')
    expect(ranked[1].isDnf).toBe(true)
  })
})

describe('placement points', () => {
  it('winner scores the participant count, each next placement one fewer', () => {
    const standings = computeStandings(
      {
        'round-1': {
          alice: { timeMs: 10_000, penalty: 'none' },
          bob: { timeMs: 12_000, penalty: 'none' },
          carol: { timeMs: 15_000, penalty: 'none' },
        },
      },
      ['round-1'],
      participants,
      names,
    )
    expect(standings).toEqual([
      { userId: 'alice', displayName: 'Alice', points: 3 },
      { userId: 'bob', displayName: 'Bob', points: 2 },
      { userId: 'carol', displayName: 'Carol', points: 1 },
    ])
  })

  it('a DNF round scores zero', () => {
    const standings = computeStandings(
      {
        'round-1': {
          alice: { timeMs: 10_000, penalty: 'none' },
          bob: { timeMs: 0, penalty: 'dnf' },
          carol: { timeMs: 15_000, penalty: 'none' },
        },
      },
      ['round-1'],
      participants,
      names,
    )
    const bob = standings.find((s) => s.userId === 'bob')
    expect(bob?.points).toBe(0)
  })

  it('ties share the better placement\'s points', () => {
    // Five participants, two tie for 1st: both score 5, next scores 3.
    const five = ['a', 'b', 'c', 'd', 'e']
    const fiveNames: Record<string, string> = { a: 'A', b: 'B', c: 'C', d: 'D', e: 'E' }
    const standings = computeStandings(
      {
        'round-1': {
          a: { timeMs: 10_000, penalty: 'none' },
          b: { timeMs: 10_000, penalty: 'none' },
          c: { timeMs: 12_000, penalty: 'none' },
          d: { timeMs: 15_000, penalty: 'none' },
          e: { timeMs: 20_000, penalty: 'none' },
        },
      },
      ['round-1'],
      five,
      fiveNames,
    )
    const byId = Object.fromEntries(standings.map((s) => [s.userId, s.points]))
    expect(byId.a).toBe(5)
    expect(byId.b).toBe(5)
    expect(byId.c).toBe(3)
    expect(byId.d).toBe(2)
    expect(byId.e).toBe(1)
  })

  it('accumulates across rounds', () => {
    const standings = computeStandings(
      {
        'round-1': {
          alice: { timeMs: 10_000, penalty: 'none' },
          bob: { timeMs: 12_000, penalty: 'none' },
          carol: { timeMs: 15_000, penalty: 'none' },
        },
        'round-2': {
          alice: { timeMs: 20_000, penalty: 'none' },
          bob: { timeMs: 11_000, penalty: 'none' },
          carol: { timeMs: 0, penalty: 'dnf' },
        },
      },
      ['round-1', 'round-2'],
      participants,
      names,
    )
    const byId = Object.fromEntries(standings.map((s) => [s.userId, s.points]))
    // Round 1: alice 3, bob 2, carol 1. Round 2: bob 3, alice 2, carol 0.
    expect(byId.alice).toBe(5)
    expect(byId.bob).toBe(5)
    expect(byId.carol).toBe(1)
  })
})
