import { type Penalty } from './protocol'

/** A competitor's accumulated standing in a battle. */
export interface Standing {
  userId: string
  displayName: string
  points: number
}

/** A participant's ranked result within a single round. */
export interface RoundResult {
  userId: string
  placement: number
  /** null for DNF / unsubmitted. */
  finalTimeMs: number | null
  isDnf: boolean
}

/**
 * Rank a single round's solves. Non-DNF solves rank fastest-first (plus-two
 * adjusted), DNFs are last. Competition ranking: ties share the better
 * placement, and the next placement skips accordingly.
 */
export function computeRoundStandings(
  roundSolves: Record<string, { timeMs: number; penalty: Penalty }>,
  participants: string[],
): RoundResult[] {
  const entries = participants.map((userId) => {
    const solve = roundSolves[userId]
    if (!solve) return { userId, finalTimeMs: null, isDnf: true, placement: 0 }
    const finalTimeMs =
      solve.penalty === 'dnf'
        ? null
        : solve.timeMs + (solve.penalty === 'plus_two' ? 2000 : 0)
    return { userId, finalTimeMs, isDnf: solve.penalty === 'dnf', placement: 0 }
  })

  // Non-DNF by final time ascending, DNFs last.
  entries.sort((a, b) => {
    if (a.isDnf && b.isDnf) return 0
    if (a.isDnf) return 1
    if (b.isDnf) return -1
    const at = a.finalTimeMs ?? 0
    const bt = b.finalTimeMs ?? 0
    return at - bt
  })

  // Competition ranking for non-DNF entries.
  let rank = 0
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    if (entry.isDnf) {
      entry.placement = i + 1
      continue
    }
    if (i === 0 || entry.finalTimeMs !== entries[i - 1].finalTimeMs) {
      rank = i + 1
    }
    entry.placement = rank
  }

  return entries
}

/**
 * Accumulate placement-points standings across all rounds. Winner of a round
 * scores the participant count; each next placement scores one fewer; DNF
 * scores zero; ties share the better placement's points.
 */
export function computeStandings(
  solves: Record<string, Record<string, { timeMs: number; penalty: Penalty }>>,
  roundOrder: string[],
  participants: string[],
  participantNames: Record<string, string>,
): Standing[] {
  const points: Record<string, number> = {}
  for (const pid of participants) points[pid] = 0

  const n = participants.length
  for (const roundId of roundOrder) {
    const ranked = computeRoundStandings(solves[roundId] ?? {}, participants)
    for (const entry of ranked) {
      if (!entry.isDnf) {
        points[entry.userId] += n - entry.placement + 1
      }
      // DNF: zero points for the round.
    }
  }

  return participants
    .map((pid) => ({
      userId: pid,
      displayName: participantNames[pid] ?? '',
      points: points[pid],
    }))
    .sort((a, b) => b.points - a.points || a.displayName.localeCompare(b.displayName))
}
