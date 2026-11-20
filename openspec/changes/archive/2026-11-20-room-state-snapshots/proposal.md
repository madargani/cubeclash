# Proposal

## Why

The client maintains a hand-synced shadow copy of server room state by translating six delta events into fourteen store actions. That replica drifts: the stage machine exists twice (client `stage` vs server `round`), a member joining mid-game is stranded in the lobby with default settings, a member leaving mid-round permanently stalls round completion (`areAllDone` counts their orphaned results row forever), and a page refresh loses the room entirely — no way to ask "what is the state?". Consolidating on server-issued full snapshots deletes the sync layer, and is the prerequisite for making refresh-recovery possible.

## What Changes

- **BREAKING** Replace the six delta events (`member_joined`, `member_left`, `start_round`, `round_done`, `game_over`, `settings_changed`) with a single `room_state` event carrying a full snapshot of the room, broadcast after every mutation.
- Snapshots carry a server-derived `phase` (`lobby` | `solving` | `round_done` | `game_over`) — the client stops running its own stage machine — and a server-derived leaderboard that includes live per-round results (mid-round visibility; clients may ignore).
- **BREAKING** Server-issued stable member ids replace `socket.id` as member identity; results are keyed by member id; sockets are bound to `{ roomId, memberId }` on join/rejoin.
- Reconnect: clients persist `{ roomId, memberId, nickname }` in sessionStorage and rejoin via a new `rejoin_room` flow; a refresh lands back in the correct view with results intact.
- Host role is derived at snapshot time (stable member id if connected, else earliest connected member): refreshing keeps host status, abandonment self-heals without timers.
- **BREAKING** A host disconnect no longer deletes the room; rooms are deleted only when zero members remain connected.
- Members joining mid-round spectate the current round and start solving at the next round.
- **BREAKING** Client→server messages drop the `roomId` argument; the server derives the room from the socket binding.
- Round progression is driven by `settings.rounds` — replaces the hardcoded 5-round logic in `canStartNextRound`, `incrementRound`, and the `game_over` check.
- Client store: server-derived fields collapse into one snapshot object with a single `set(snapshot)` action. Zustand is retained; its removal is explicitly out of scope.

## Capabilities

### New Capabilities

- `room-sync`: how room state reaches clients — one full-snapshot event after every mutation, its contents (members, settings, scrambles, leaderboard, phase), and the server-side derivation of phase and leaderboard.
- `room-membership`: member identity and lifecycle — stable member ids, join with unique nickname, disconnect tracking, rejoin with persisted credentials, effective-host derivation, and room deletion when empty.
- `game-rounds`: round progression — count driven by `settings.rounds`, a round completing when all connected members have submitted, mid-round joiners spectating until the next round, and game over after the final round.

### Modified Capabilities

None — the project has no existing specs.

## Impact

- `packages/types/src/index.ts`: event signatures rewritten (`room_state` only outbound), `RoomSnapshot` type, member view type, ack shapes.
- `apps/server/src`: `rooms.ts` (member ids, connected flag, `hostMemberId`, settings-driven round logic), `handlers/` rewritten to validate → mutate → broadcast, new snapshot serializer module with phase/host/leaderboard derivation, `SocketData` binding, `rejoin_room` handler.
- `apps/client/src`: store restructured to `snapshot + local`, new sessionStorage helper and rejoin-on-connect flow, `useSocketListeners`/`useRoom` deleted (replaced by one `room_state` wiring), views read snapshot fields (`phase` switch, host comparison, member list).
- No dependency changes. Socket.io's built-in `connectionStateRecovery` is deliberately skipped in favor of the explicit member-id design.
- Out of scope: removing zustand, persisting rooms across server restarts, spectator-only roles, redacting mid-round results.
