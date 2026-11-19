# Proposal

## Why

A battle can be created today but never fought: `startBattle` writes the battle, its participants, and every round's scramble — and then nothing happens. There is no runtime to drive phases, collect times, or show results, which is the entire product. Worse, the one-active-battle guard in `battle-lifecycle` currently makes every room permanently single-battle, because nothing ever ends a battle.

## What Changes

- Add a WebSocket layer (Nitro + crossws): a per-room live channel that every member holds while viewing their room, plus an in-memory per-room runtime owning live battle state — current phase, phase deadline, ready set — publishing into that channel.
- Room state stays live on every open page: a member joining, the host saving settings, a battle starting, and a battle ending all reach connected members as full room snapshots, with no reload.
- Speak one all-snapshot protocol over the channel: every server state message — `roomState` and `battleState` — is a full snapshot the client applies by replacement; no deltas, no merge logic, and a reconnect heals by construction.
- Drive each round through synchronized phases — scramble, countdown, inspection, solving, results — with server-side transitions fired by gates: all participants ready, the configured timeout, or host force-start.
- Broadcast absolute deadlines once per transition; clients render countdowns locally instead of receiving per-second ticks.
- Accept solve submissions over the socket (raw time + penalty: none / plus-two / DNF), one per round per cuber; when the solving gate is force-closed, non-submitters get DNF solve rows.
- Upsert the single checkpoint row per battle on every transition; build the runtime when a battle starts and rebuild it from the database when a member reconnects after a server restart, so phase position resyncs while ready state cheaply resets.
- Add the battle screen UI on the room page: scramble display, ready-up, 3-2-1 inspection countdown, a csTimer-style spacebar timer with penalty marking, round results, and final standings.
- End the battle after the final round's results gate closes: record the end time and free the room for its next battle, completing the lifecycle.
- Room members who joined after battle start can watch the battle but not act in it — a consequence of participants being frozen at start.

## Capabilities

### New Capabilities
- `realtime-battles`: live coordination of a running battle — battle state delivered over the room's channel, phase progression, ready gates with host override, timed solve submission, restart recovery, round results, and final standings.

### Modified Capabilities
- `room-management`: add live room updates — a member connected to their room receives its current state and every change to it: joins, settings, and the active battle's presence.
- `battle-lifecycle`: add the battle ending — a battle ends when its final round's results gate closes, records its end time, and frees the room for its next battle.

## Impact

- New dependency: `nitro` (the `nitro/vite` plugin with `features.websocket` enabled; it is also the officially recommended deployment adapter for TanStack Start). `zod` and `@cubingcenter/scrambler` are already in place.
- `vite.config.ts` gains the Nitro plugin; the dev/build flow is otherwise unchanged.
- New server code: a WebSocket handler, per-room channel, and room runtime next to the existing service layer in `src/server/`, reusing `getCurrentCuber` for socket authentication. Settings edits and battle starts travel as messages on the room channel (their HTTP server functions are removed); joining stays an HTTP action and announces itself when the joiner's page connects. The service layer stays pure over `(db, inputs)` and never imports the channel or runtime registries — the socket side alone owns live state.
- No schema changes — every table this needs already exists, including `phase_checkpoints` and `solves`; final times and standings stay derived, never stored.
- New UI: the room page holds the live channel for as long as it is open, rendering the lobby or the battle screen from the latest room snapshot.
- Recorded constraint for later changes: the process must be long-lived (in-memory runtime rules out serverless hosting).
- Recorded assumption: final standings rank cubers by per-round placement points (round winner scores the most, a DNF scores zero); sum-of-times is the named alternative if this reads wrong in practice.
