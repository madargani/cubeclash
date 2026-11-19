import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'

import {
  type BattleClientState,
  type RoundResultEntry,
  type SocketStatus,
  type StandingEntry,
} from '../hooks/use-room-socket'
import type { ClientMessage, Penalty } from '../server/nitro/protocol'

const cardClass =
  'flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl'
const errorClass =
  'rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300'
const buttonClass =
  'rounded-lg bg-indigo-500 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60'
const ghostButtonClass =
  'rounded-lg border border-slate-700 px-4 py-2.5 font-semibold text-slate-300 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60'
const scrambleClass =
  'rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-lg leading-relaxed tracking-wide text-emerald-200 select-all'
const finishedChipClass =
  'rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300'

export interface BattleScreenProps {
  battle: BattleClientState | null
  status: SocketStatus
  error: string | null
  send: (message: ClientMessage) => void
  currentUserId: string
  isHost: boolean
  roundCount: number
}

/**
 * The live battle screen: the room page's socket hook owns the connection and
 * passes the latest `battleState` snapshot here. The current phase selects the
 * view; countdowns render locally against the server's absolute deadlines, so
 * every tab reaches zero at the same moment.
 */
export function BattleScreen({
  battle,
  status,
  error,
  send,
  currentUserId,
  isHost,
  roundCount,
}: BattleScreenProps) {
  if (!battle) {
    return (
      <section className={cardClass}>
        <p className="text-sm text-slate-400">Connecting to the battle…</p>
      </section>
    )
  }

  const isParticipant = battle.participants.some(
    (participant) => participant.userId === currentUserId,
  )
  const iAmReady = battle.readyUserIds.includes(currentUserId)
  const iSubmitted = battle.submittedUserIds.includes(currentUserId)

  const nameOf = (userId: string) =>
    battle.participants.find((p) => p.userId === userId)?.displayName ?? 'Unknown cuber'

  return (
    <section className={cardClass}>
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            {battle.battleEnded && battle.standings
              ? 'Final standings'
              : `Round ${battle.roundNumber} of ${roundCount}`}
          </h2>
          <p className="text-sm capitalize text-slate-400">{battle.phase}</p>
        </div>
        {status !== 'open' ? (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
            {status === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
          </span>
        ) : null}
      </header>

      {error ? <p className={errorClass}>{error}</p> : null}

      {!isParticipant && !battle.battleEnded ? (
        <p className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
          You joined after this battle started, so you are watching it.
        </p>
      ) : null}

      {battle.battleEnded && battle.standings ? (
        <StandingsView standings={battle.standings} currentUserId={currentUserId} />
      ) : battle.phase === 'scramble' ? (
        <ScrambleView
          battle={battle}
          isParticipant={isParticipant}
          iAmReady={iAmReady}
          isHost={isHost}
          send={send}
        />
      ) : battle.phase === 'countdown' ? (
        <CountdownView deadlineAt={battle.deadlineAt} />
      ) : battle.phase === 'inspection' ? (
        <InspectionView deadlineAt={battle.deadlineAt} scramble={battle.scramble} />
      ) : battle.phase === 'solving' ? (
        <SolvingView
          battle={battle}
          currentUserId={currentUserId}
          isHost={isHost}
          iSubmitted={iSubmitted}
          send={send}
        />
      ) : (
        <ResultsView
          battle={battle}
          currentUserId={currentUserId}
          nameOf={nameOf}
        />
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

/** Tick ~10x per second while a deadline is being counted down. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [active])
  return now
}

function remainingMs(deadlineAt: string | null, now: number): number | null {
  if (!deadlineAt) return null
  return new Date(deadlineAt).getTime() - now
}

/** 12_345 -> "12.345"; 75_500 -> "1:15.500". */
function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const fraction = Math.floor(ms % 1000).toString().padStart(3, '0')
  if (totalSeconds < 60) {
    return `${totalSeconds}.${fraction}`
  }
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}.${fraction}`
}

/** A solve's final time as shown in results: plus-two adjusted, DNF unsolved. */
function finalTimeText(timeMs: number, penalty: Penalty): string {
  if (penalty === 'dnf') return 'DNF'
  const adjusted = timeMs + (penalty === 'plus_two' ? 2_000 : 0)
  return penalty === 'plus_two' ? `${formatMs(adjusted)} (+2)` : formatMs(adjusted)
}

function ParticipantList({
  battle,
  markedUserIds,
  markedLabel,
}: {
  battle: BattleClientState
  markedUserIds: string[]
  markedLabel: string
}) {
  return (
    <ul className="flex flex-col gap-2">
      {battle.participants.map((participant) => {
        const marked = markedUserIds.includes(participant.userId)
        return (
          <li
            key={participant.userId}
            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-2.5"
          >
            <span className="font-medium text-slate-200">
              {participant.displayName}
            </span>
            {marked ? (
              <span className={finishedChipClass}>{markedLabel}</span>
            ) : (
              <span className="text-xs text-slate-500">waiting</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function ForceButton({
  label,
  visible,
  send,
}: {
  label: string
  visible: boolean
  send: (message: ClientMessage) => void
}) {
  if (!visible) return null
  return (
    <button
      className={ghostButtonClass}
      type="button"
      onClick={(event) => {
        event.currentTarget.blur()
        send({ type: 'forceStart' })
      }}
    >
      {label}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Scramble + ready-up                                                 */
/* ------------------------------------------------------------------ */

function ScrambleView({
  battle,
  isParticipant,
  iAmReady,
  isHost,
  send,
}: {
  battle: BattleClientState
  isParticipant: boolean
  iAmReady: boolean
  isHost: boolean
  send: (message: ClientMessage) => void
}) {
  const now = useNow(battle.deadlineAt !== null)
  const remaining = remainingMs(battle.deadlineAt, now)
  const unready = battle.participants.length - battle.readyUserIds.length

  return (
    <div className="flex flex-col gap-4">
      {battle.scramble ? <pre className={scrambleClass}>{battle.scramble}</pre> : null}

      {remaining !== null && remaining > 0 ? (
        <p className="text-sm text-slate-400">
          Auto-starts in {Math.ceil(remaining / 1000)}s
        </p>
      ) : null}

      <ParticipantList
        battle={battle}
        markedUserIds={battle.readyUserIds}
        markedLabel="ready"
      />
      {isParticipant ? (
        iAmReady ? (
          <p className="text-sm text-emerald-300">
            You are ready — waiting for {Math.max(unready, 0)} more.
          </p>
        ) : (
          <button
            className={buttonClass}
            type="button"
            onClick={(event) => {
              event.currentTarget.blur()
              send({ type: 'ready' })
            }}
          >
            I&apos;m ready
          </button>
        )
      ) : null}

      <ForceButton
        label={isHost ? 'Force start now' : 'Force start (host only)'}
        visible={isHost}
        send={send}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Countdown + inspection                                              */
/* ------------------------------------------------------------------ */

function CountdownView({ deadlineAt }: { deadlineAt: string | null }) {
  const now = useNow(deadlineAt !== null)
  const remaining = remainingMs(deadlineAt, now)
  const seconds = remaining === null ? 3 : Math.max(0, Math.ceil(remaining / 1000))

  return (
    <div className="flex flex-col items-center gap-2 py-8">
      <p className="text-sm uppercase tracking-widest text-slate-400">
        Get ready
      </p>
      <p
        className={`text-8xl font-black tabular-nums ${
          seconds > 0 ? 'text-indigo-300' : 'text-slate-600'
        }`}
      >
        {seconds}
      </p>
    </div>
  )
}

function InspectionView({
  deadlineAt,
  scramble,
}: {
  deadlineAt: string | null
  scramble: string | null
}) {
  const now = useNow(deadlineAt !== null)
  const remaining = remainingMs(deadlineAt, now)
  const seconds = remaining === null ? 0 : Math.max(0, Math.ceil(remaining / 1000))
  const colorClass =
    seconds > 5
      ? 'text-emerald-300'
      : seconds > 2
        ? 'text-amber-300'
        : 'text-red-400'

  return (
    <div className="flex flex-col gap-4">
      {scramble ? <pre className={scrambleClass}>{scramble}</pre> : null}
      <div className="flex flex-col items-center gap-2 py-4">
        <p className="text-sm uppercase tracking-widest text-slate-400">
          Inspection
        </p>
        <p className={`text-8xl font-black tabular-nums ${colorClass}`}>
          {seconds}
        </p>
        <p className="text-sm text-slate-400">
          Start your timer when inspection ends — spacebar or tap.
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Solving: spacebar timer + penalty marking + submit                  */
/* ------------------------------------------------------------------ */

const penaltyOptions: Array<{ value: Penalty; label: string }> = [
  { value: 'none', label: 'Clean' },
  { value: 'plus_two', label: '+2' },
  { value: 'dnf', label: 'DNF' },
]

/**
 * csTimer-style local timer: spacebar (or tap) starts, pressing again stops.
 * The server never measures time — it only records what is submitted.
 */
function SolveTimer({
  onSubmit,
}: {
  onSubmit: (timeMs: number, penalty: Penalty) => void
}) {
  const [stage, setStage] = useState<'idle' | 'running' | 'stopped'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [penalty, setPenalty] = useState<Penalty>('none')
  const stageRef = useRef(stage)
  const startRef = useRef(0)

  const toggle = () => {
    if (stageRef.current === 'idle') {
      stageRef.current = 'running'
      startRef.current = performance.now()
      setElapsed(0)
      setStage('running')
    } else if (stageRef.current === 'running') {
      stageRef.current = 'stopped'
      setElapsed(Math.round(performance.now() - startRef.current))
      setStage('stopped')
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== 'Space') return
      // Space otherwise scrolls the page and re-clicks focused buttons.
      event.preventDefault()
      if (event.repeat) return
      if (stageRef.current === 'idle' || stageRef.current === 'running') {
        toggle()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (stage !== 'running') return
    const id = setInterval(() => {
      setElapsed(performance.now() - startRef.current)
    }, 53)
    return () => clearInterval(id)
  }, [stage])

  const reset = () => {
    stageRef.current = 'idle'
    setElapsed(0)
    setPenalty('none')
    setStage('idle')
  }

  const submit = () => {
    onSubmit(Math.round(elapsed), penalty)
    reset()
  }

  if (stage === 'stopped') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-center text-6xl font-black tabular-nums text-indigo-300">
          {formatMs(elapsed)}
        </p>
        <div className="flex justify-center gap-2">
          {penaltyOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={(event) => {
                event.currentTarget.blur()
                setPenalty(option.value)
              }}
              className={`rounded-lg border px-4 py-2 font-semibold transition ${
                penalty === option.value
                  ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                  : 'border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex justify-center gap-3">
          <button className={buttonClass} type="button" onClick={submit}>
            Submit solve
          </button>
          <button className={ghostButtonClass} type="button" onClick={reset}>
            Redo timing
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex flex-col items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 py-10 text-slate-100 outline-none transition hover:border-slate-600"
    >
      {stage === 'idle' ? (
        <>
          <span className="text-5xl font-black">Ready</span>
          <span className="text-sm text-slate-400">
            Press space or tap to start the timer
          </span>
        </>
      ) : (
        <span className="text-7xl font-black tabular-nums text-emerald-300">
          {formatMs(elapsed)}
        </span>
      )}
    </button>
  )
}

function SolvingView({
  battle,
  currentUserId,
  isHost,
  iSubmitted,
  send,
}: {
  battle: BattleClientState
  currentUserId: string
  isHost: boolean
  iSubmitted: boolean
  send: (message: ClientMessage) => void
}) {
  const isParticipant = battle.participants.some(
    (participant) => participant.userId === currentUserId,
  )

  return (
    <div className="flex flex-col gap-4">
      {battle.scramble ? <pre className={scrambleClass}>{battle.scramble}</pre> : null}

      {isParticipant && !iSubmitted ? (
        <SolveTimer
          onSubmit={(timeMs, penalty) => send({ type: 'submit', timeMs, penalty })}
        />
      ) : (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-center text-sm text-emerald-300">
          {iSubmitted
            ? 'Solve submitted — waiting for the others to finish.'
            : 'You are watching this round.'}
        </p>
      )}

      <ParticipantList
        battle={battle}
        markedUserIds={battle.submittedUserIds}
        markedLabel="finished"
      />

      <ForceButton
        label="Force end round (missing solves get DNF)"
        visible={isHost}
        send={send}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Round results                                                       */
/* ------------------------------------------------------------------ */

function ResultsView({
  battle,
  currentUserId,
  nameOf,
}: {
  battle: BattleClientState
  currentUserId: string
  nameOf: (userId: string) => string
}) {
  const results: RoundResultEntry[] = battle.roundId
    ? (battle.roundResults.find((round) => round.roundId === battle.roundId)?.results ?? [])
    : []

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-slate-400">Round results</p>
      {results.length === 0 ? (
        <p className="text-sm text-slate-500">No solves recorded for this round.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {results.map((entry) => (
            <li
              key={entry.userId}
              className={`flex items-center justify-between rounded-lg border px-4 py-2.5 ${
                entry.userId === currentUserId
                  ? 'border-indigo-500/60 bg-indigo-500/10'
                  : 'border-slate-800 bg-slate-950/60'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="w-8 text-sm font-bold text-slate-500">
                  #{entry.placement}
                </span>
                <span className="font-medium text-slate-200">{nameOf(entry.userId)}</span>
              </span>
              <span
                className={`font-mono tabular-nums ${
                  entry.penalty === 'dnf' ? 'text-red-400' : 'text-emerald-300'
                }`}
              >
                {finalTimeText(entry.timeMs, entry.penalty)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-slate-500">Next round starts shortly…</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Final standings                                                     */
/* ------------------------------------------------------------------ */

function StandingsView({
  standings,
  currentUserId,
}: {
  standings: StandingEntry[]
  currentUserId: string
}) {
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {standings.map((standing, index) => (
          <li
            key={standing.userId}
            className={`flex items-center justify-between rounded-lg border px-4 py-2.5 ${
              standing.userId === currentUserId
                ? 'border-indigo-500/60 bg-indigo-500/10'
                : 'border-slate-800 bg-slate-950/60'
            }`}
          >
            <span className="flex items-center gap-3">
              <span className="w-8 text-sm font-bold text-slate-500">
                #{index + 1}
              </span>
              <span className="font-medium text-slate-200">
                {standing.displayName}
              </span>
            </span>
            <span className="font-mono tabular-nums text-emerald-300">
              {standing.points} pts
            </span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-slate-400">
        The battle is over — the room is free for its next battle.
      </p>
      <div className="flex gap-3">
        <button
          className={buttonClass}
          type="button"
          onClick={() => window.location.reload()}
        >
          Reload room
        </button>
        <Link to="/" className={ghostButtonClass}>
          Back to the lobby
        </Link>
      </div>
    </div>
  )
}
