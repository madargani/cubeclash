import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'

import { BattleScreen } from '../../components/battle-screen'
import { useRoomSocket } from '../../hooks/use-room-socket'
import { getLobbyConfigFn, getRoomStateFn } from '../../server/fns'

export const Route = createFileRoute('/rooms/$roomId')({
  loader: async ({ params }) => {
    const [state, config] = await Promise.all([
      getRoomStateFn({ data: { roomId: params.roomId } }),
      getLobbyConfigFn(),
    ])
    return { state, config }
  },
  errorComponent: RoomError,
  component: RoomPage,
})

/** Non-members land here as a rejection: membership is checked server-side. */
function RoomError({ error }: { error: unknown }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-8 text-slate-100">
      <p className="text-3xl font-black text-indigo-400">Room unavailable</p>
      <p className="max-w-md text-center text-lg text-slate-400">
        {error instanceof Error
          ? error.message
          : 'This room could not be opened.'}
      </p>
      <Link
        to="/"
        className="text-indigo-300 underline underline-offset-4 hover:text-indigo-200"
      >
        Back to the lobby
      </Link>
    </main>
  )
}

const cardClass =
  'flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl'
const labelClass = 'flex flex-col gap-1.5 text-sm font-medium text-slate-300'
const inputClass =
  'rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500'
const buttonClass =
  'rounded-lg bg-indigo-500 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60'
const errorClass =
  'rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300'

function RoomPage() {
  const { state, config } = Route.useLoaderData()
  const { room, battle, status, error: socketError, send } = useRoomSocket(state.id)

  // The loader paints the first state; every later change — a join, a
  // settings save, the battle start and end — arrives as a room snapshot.
  const live = room ?? {
    id: state.id,
    inviteCode: state.inviteCode,
    host: state.host,
    members: state.members,
    settings: state.settings,
    activeBattle: state.activeBattle,
  }
  const isHost = state.currentUserId === live.host.userId
  const { settings, activeBattle, members, host, inviteCode } = live

  const [pending, setPending] = useState(false)

  const [eventType, setEventType] = useState(settings.eventType)
  const [roundCount, setRoundCount] = useState(String(settings.roundCount))
  const [inspectionSeconds, setInspectionSeconds] = useState(
    String(settings.inspectionSeconds),
  )
  const [readyTimeoutSeconds, setReadyTimeoutSeconds] = useState(
    String(settings.readyTimeoutSeconds),
  )

  // A live settings save (from another tab of the host) refreshes the form.
  useEffect(() => {
    setEventType(settings.eventType)
    setRoundCount(String(settings.roundCount))
    setInspectionSeconds(String(settings.inspectionSeconds))
    setReadyTimeoutSeconds(String(settings.readyTimeoutSeconds))
  }, [
    settings.eventType,
    settings.roundCount,
    settings.inspectionSeconds,
    settings.readyTimeoutSeconds,
  ])

  const eventName = (eventId: string) =>
    config.events.find((event) => event.eventId === eventId)?.name ?? eventId

  // A room-level mutation settles when its `roomState` snapshot arrives, or
  // when the socket answers with an error.
  useEffect(() => {
    setPending(false)
  }, [room, socketError])

  function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Raw form values travel loose; `parseRoomSettings` validates them on the
    // socket side with the same schema the service uses.
    const sent = send({
      type: 'updateSettings',
      settings: { eventType, roundCount, inspectionSeconds, readyTimeoutSeconds },
    })
    if (sent) setPending(true)
  }

  function handleStartBattle() {
    if (send({ type: 'startBattle' })) setPending(true)
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-950 p-8 text-slate-100">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Room</h1>
            <p className="text-slate-400">
              Share the invite code so friends can join.
            </p>
          </div>
          <Link
            to="/"
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500"
          >
            Lobby
          </Link>
        </header>

        <section className={`${cardClass} items-center`}>
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Invite code
          </span>
          <code className="text-4xl font-black tracking-[0.25em] text-indigo-300">
            {inviteCode}
          </code>
        </section>

        {activeBattle ? (
          <BattleScreen
            battle={battle?.battleId === activeBattle.id ? battle : null}
            status={status}
            error={socketError}
            send={send}
            currentUserId={state.currentUserId}
            isHost={isHost}
            roundCount={activeBattle.settings.roundCount}
          />
        ) : (
          <>
            <section className={cardClass}>
              <h2 className="text-xl font-semibold">
                Members <span className="text-slate-400">({members.length})</span>
              </h2>
              <ul className="flex flex-col gap-2">
                {members.map((member) => (
                  <li
                    key={member.userId}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-2.5"
                  >
                    <span className="font-medium text-slate-200">
                      {member.displayName}
                    </span>
                    {member.userId === host.userId ? (
                      <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-semibold text-fuchsia-300">
                        host
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>

            <section className={cardClass}>
              <h2 className="text-xl font-semibold">Settings</h2>
              {isHost ? (
                <form className="flex flex-col gap-4" onSubmit={handleSaveSettings}>
                  <label className={labelClass}>
                    Event
                    <select
                      className={inputClass}
                      value={eventType}
                      onChange={(event) => setEventType(event.target.value)}
                    >
                      {config.events.map((event) => (
                        <option key={event.eventId} value={event.eventId}>
                          {event.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <label className={labelClass}>
                      Rounds
                      <input
                        className={inputClass}
                        type="number"
                        required
                        min={1}
                        max={20}
                        value={roundCount}
                        onChange={(event) => setRoundCount(event.target.value)}
                      />
                    </label>
                    <label className={labelClass}>
                      Inspection (s)
                      <input
                        className={inputClass}
                        type="number"
                        required
                        min={0}
                        max={60}
                        value={inspectionSeconds}
                        onChange={(event) =>
                          setInspectionSeconds(event.target.value)
                        }
                      />
                    </label>
                    <label className={labelClass}>
                      Ready timeout (s)
                      <input
                        className={inputClass}
                        type="number"
                        required
                        min={5}
                        max={120}
                        value={readyTimeoutSeconds}
                        onChange={(event) =>
                          setReadyTimeoutSeconds(event.target.value)
                        }
                      />
                    </label>
                  </div>
                  {socketError ? (
                    <p className={errorClass}>{socketError}</p>
                  ) : null}
                  <button
                    className={buttonClass}
                    type="submit"
                    disabled={pending}
                  >
                    {pending ? 'Saving…' : 'Save settings'}
                  </button>
                </form>
              ) : (
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-slate-300">
                  <dt className="text-slate-400">Event</dt>
                  <dd>{eventName(settings.eventType)}</dd>
                  <dt className="text-slate-400">Rounds</dt>
                  <dd>{settings.roundCount}</dd>
                  <dt className="text-slate-400">Inspection</dt>
                  <dd>{settings.inspectionSeconds}s</dd>
                  <dt className="text-slate-400">Ready timeout</dt>
                  <dd>{settings.readyTimeoutSeconds}s</dd>
                </dl>
              )}
            </section>

            <section className={cardClass}>
              <h2 className="text-xl font-semibold">Battle</h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-slate-300">
                <dt className="text-slate-400">Event</dt>
                <dd>{eventName(settings.eventType)}</dd>
                <dt className="text-slate-400">Rounds</dt>
                <dd>{settings.roundCount}</dd>
              </dl>
              {isHost ? (
                <div className="flex flex-col gap-3">
                  {socketError ? <p className={errorClass}>{socketError}</p> : null}
                  <button
                    className={buttonClass}
                    type="button"
                    disabled={pending}
                    onClick={handleStartBattle}
                  >
                    {pending ? 'Starting…' : 'Start battle'}
                  </button>
                </div>
              ) : (
                <p className="text-slate-400">
                  No battle yet — rounds and scrambles are prepared the moment
                  the host starts one.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}
