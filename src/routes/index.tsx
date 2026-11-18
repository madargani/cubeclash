import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'

import { createRoomFn, getLobbyConfigFn, joinRoomFn } from '../server/fns'

export const Route = createFileRoute('/')({
  loader: () => getLobbyConfigFn(),
  component: Home,
})

type LobbyConfig = Awaited<ReturnType<typeof getLobbyConfigFn>>

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.'
}

function Home() {
  const { displayName, events, defaults } = Route.useLoaderData()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-8 text-slate-100">
      <div className="flex w-full max-w-4xl flex-col items-center gap-8">
        <header className="flex flex-col items-center gap-3">
          <div className="grid h-20 w-20 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-4xl font-black shadow-lg">
            ▚
          </div>
          <h1 className="text-4xl font-bold tracking-tight">CubeClash</h1>
          <p className="max-w-md text-center text-lg text-slate-400">
            Create a room, share the invite code, and race your friends.
          </p>
          {displayName ? (
            <span className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
              Playing as {displayName}
            </span>
          ) : (
            <span className="rounded-full border border-slate-700 bg-slate-900 px-4 py-1.5 text-sm font-medium text-slate-400">
              Joining as a guest — pick a display name below
            </span>
          )}
        </header>

        <div className="grid w-full gap-6 md:grid-cols-2">
          <CreateRoomCard
            displayName={displayName}
            events={events}
            defaults={defaults}
          />
          <JoinRoomCard displayName={displayName} />
        </div>
      </div>
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
const errorClass = 'rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300'

function NameField({
  displayName,
  name,
  onNameChange,
}: {
  displayName: string | null
  name: string
  onNameChange: (value: string) => void
}) {
  if (displayName) return null
  return (
    <label className={labelClass}>
      Display name
      <input
        className={inputClass}
        type="text"
        required
        maxLength={64}
        placeholder="e.g. Speedy Sue"
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
      />
    </label>
  )
}

function CreateRoomCard({ displayName, events, defaults }: LobbyConfig) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [eventType, setEventType] = useState<string>(defaults.eventType)
  const [roundCount, setRoundCount] = useState(String(defaults.roundCount))
  const [inspectionSeconds, setInspectionSeconds] = useState(
    String(defaults.inspectionSeconds),
  )
  const [readyTimeoutSeconds, setReadyTimeoutSeconds] = useState(
    String(defaults.readyTimeoutSeconds),
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      const { roomId } = await createRoomFn({
        data: {
          displayName: displayName ? undefined : name,
          settings: {
            eventType,
            roundCount,
            inspectionSeconds,
            readyTimeoutSeconds,
          },
        },
      })
      await navigate({ to: '/rooms/$roomId', params: { roomId } })
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <form className={cardClass} onSubmit={handleSubmit}>
      <h2 className="text-xl font-semibold">Create a room</h2>
      <NameField
        displayName={displayName}
        name={name}
        onNameChange={setName}
      />
      <label className={labelClass}>
        Event
        <select
          className={inputClass}
          value={eventType}
          onChange={(event) => setEventType(event.target.value)}
        >
          {events.map((event) => (
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
            onChange={(event) => setInspectionSeconds(event.target.value)}
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
            onChange={(event) => setReadyTimeoutSeconds(event.target.value)}
          />
        </label>
      </div>
      {error ? <p className={errorClass}>{error}</p> : null}
      <button className={buttonClass} type="submit" disabled={pending}>
        {pending ? 'Creating…' : 'Create room'}
      </button>
    </form>
  )
}

function JoinRoomCard({ displayName }: { displayName: string | null }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      const { roomId } = await joinRoomFn({
        data: {
          displayName: displayName ? undefined : name,
          inviteCode: inviteCode.trim().toLowerCase(),
        },
      })
      await navigate({ to: '/rooms/$roomId', params: { roomId } })
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  return (
    <form className={cardClass} onSubmit={handleSubmit}>
      <h2 className="text-xl font-semibold">Join a room</h2>
      <NameField
        displayName={displayName}
        name={name}
        onNameChange={setName}
      />
      <label className={labelClass}>
        Invite code
        <input
          className={inputClass}
          type="text"
          required
          maxLength={32}
          placeholder="e.g. k7m2pq"
          value={inviteCode}
          onChange={(event) => setInviteCode(event.target.value)}
        />
      </label>
      {error ? <p className={errorClass}>{error}</p> : null}
      <button className={buttonClass} type="submit" disabled={pending}>
        {pending ? 'Joining…' : 'Join room'}
      </button>
    </form>
  )
}
