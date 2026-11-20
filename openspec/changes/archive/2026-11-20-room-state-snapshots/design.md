# Design

## Context

Today the server emits six delta events (`member_joined`, `member_left`, `start_round`, `round_done`, `game_over`, `settings_changed`) that the client replays into a zustand shadow copy (`useGameStore` + `useSocketListeners` + `useRoom`, ~265 lines of sync plumbing). Members are identified by `socket.id` server-side; `results` is a `Map<socketId, number[]>`; a host disconnect deletes the room; round progression hardcodes 5 rounds in `rooms.ts` (`canStartNextRound`, `incrementRound`) and `gameHandlers.ts` (`room.round === 4`). See proposal.md for why this is being replaced.

Key constraint: the client stays zustand-based in this change (removal is a possible follow-up). Rooms live in server memory only. The client is a Vite/React SPA; server is Express + socket.io; shared types live in `packages/types`.

## Goals / Non-Goals

**Goals:**

- Server becomes the single source of truth; the client's protocol handling reduces to "replace state with the latest snapshot."
- Refresh/reconnect recovery with stable member identity.
- All game-flow values (phase, effective host, leaderboard, round completion) derived at broadcast time — no stored transitions, no timers.
- Preserve existing game rules that aren't changing: average-of-N excluding best/worst when all rounds are done, settings locked while a game is in progress, game start only once, nickname uniqueness.

**Non-Goals:**

- Removing zustand (store shrinks to `room + local` with one `set` action; container swap later is mechanical).
- socket.io `connectionStateRecovery` (deliberately skipped: black-box, short default window, and it would not remove the need for the `connected` flag or derived phase anyway).
- Persisting rooms across server restarts; empty-room retention windows; spectator roles; redacting mid-round results.

## Decisions

### D1: One snapshot event, broadcast after every mutation

Every handler becomes validate → mutate → `io.to(roomId).emit("room_state", snapshotOf(room))`. One event replaces six. Cost is acceptable: a snapshot for an 8-member room is ~2–3 KB and a full game triggers ~60 broadcasts (~180 KB/client/game) — noise for a room-based party game. Alternative rejected: keeping granular events with a diff layer — that re-adds the sync complexity this change exists to delete.

The serializer lives in a new `apps/server/src/snapshot.ts`: `snapshotOf(room)` plus pure derivation helpers. `calculateLeaderboard` moves there from `gameHandlers.ts` unchanged in logic.

### D2: Derived-over-stored

Phase, effective host, and leaderboard are computed inside `snapshotOf(room)` from room facts; none are stored on `Room`:

- `phase`: `lobby` if `round < 0`; `solving` if any connected member's results row is short for the current round; `round_done` if all connected members are done and rounds remain; `game_over` if all done on the final round (`round === settings.rounds - 1`).
- `hostMemberId`: the room's host member if connected, else the first connected member in join order. No migration events, no grace timers — refreshing keeps host status (member id unchanged), abandonment self-heals on the next broadcast, and role return on rejoin is deterministic.
- Round completion (`areAllDone` rewritten): counts **connected** members only. This also fixes the existing soft-lock where a mid-round departure left an orphaned short results row stalling the round forever.

Alternative rejected: storing `phase` on `Room` with explicit transition events — one more stored value that can disagree with facts.

### D3: Stable member identity

`crypto.randomUUID()` issued at `create_room`/`join_room`; `Member { id, nickname, connected }`; `results` keyed by `memberId`; `Room.hostId` becomes `hostMemberId`. Sockets bind `socket.data = { roomId, memberId }` at join/rejoin; every in-room handler resolves the room from the binding (client-supplied `roomId` arguments are removed from `start_game`, `next_round`, `submit_solve`, `update_settings`). In-room actions no longer need a membership re-lookup: `socket.data.memberId` is the actor. Existing guard behavior preserved: settings rejected while a game is in progress, `start_game` ignored if scrambles already exist, host-only actions checked against the derived host.

### D4: Rejoin flow

Client persists `{ roomId, memberId, nickname }` in sessionStorage (`apps/client/src/lib/roomSession.ts`). A module-level "bound" flag tracks whether this client currently holds a live binding: set after a successful create/join/rejoin ack, cleared on socket disconnect. On every socket `connect` event — initial page load and transport-level reconnects alike — if stored credentials exist and the client is not bound, it emits `rejoin_room(roomId, memberId, ack)`. One mechanism covers both refresh recovery and wifi-blip recovery.

- ack success → server rebinds `socket.data`, marks the member `connected: true`, broadcasts; client marks itself bound and navigates to `/room`.
- ack error "already connected" → **keep** credentials, show the error on Home (the other tab owns the session; when it closes, a reload of this tab rejoins successfully). Do not clear storage on this error.
- ack error "room not found" / "member unknown" → clear storage, stay on Home.

Second-tab behavior relies on sessionStorage being per-tab: a new tab inherits a copy of the credentials, its rejoin is rejected while the first tab is alive, and clearing that copy in the rejected tab cannot affect the first tab's storage. A socket binds to at most one room: `join_room` from a socket already bound to a room is rejected with an error.

### D5: Mid-round joins spectate (results row initialization)

When joining a room with `round >= 0`, the joiner's results row is initialized to `round + 1` null entries:

- During `solving`: length `round + 1` counts them as "done" for the current round (round completes without them), and the existing `addResult` guard (`length > round` → ignore) rejects any stray submit for the current round.
- During `round_done`: same length as everyone else — treated as done for the completed round.
- At `next_round`: round increments; their row length now equals the new round → they must solve like everyone else.

One rule covers all three cases, including `game_over` (row of `settings.rounds` nulls). During lobby (`round < 0`) no row is created; `startGame` initializes rows for all members as today.

### D6: Room lifecycle

On disconnect: mark `connected: false`, broadcast. Delete the room only when **zero** members remain connected (prevents unbounded memory; all-disconnect mass refresh is an accepted loss — everyone lands on Home and remakes). Host disconnect no longer deletes the room and no longer force-disconnects other sockets.

### D7: Client store restructure (zustand retained)

`useGameStore` becomes `{ room: RoomSnapshot | null, nickname, homeError, memberId }` with one action `setRoom(snapshot)` plus the existing local setters. Views read snapshot fields via thin selectors: `RoomContainer` switches on `room.phase` (was `stage`), `isHost` is `room.hostMemberId === myMemberId`, current scramble is `room.scrambles[room.round]`, member list/leaderboard/settings come from the snapshot. `useSocketListeners.ts` and `useRoom.ts` are deleted; a single hook (or effect in `App`) wires `socket.on("room_state", setRoom)` and the boot-time rejoin attempt. The stackmat timer state stays in local `useState` (60fps updates must not flow through shared state). The Results screen's "Play Again" button — broken today, it set the client stage to a lobby the server never re-entered — is replaced by "Leave Room": clear the stored session, reset the room state, return to Home. A true server-side play-again is a possible future change.

### D8: Final event inventory

```
Server -> Client:  room_state(snapshot)
Client -> Server:  create_room(nickname, ack { roomId, memberId })
                   join_room(nickname, roomId, ack { memberId })
                   rejoin_room(roomId, memberId, ack)
                   start_game() / next_round() / submit_solve(time) / update_settings(settings)
```

`start_round`/`round_done`/`game_over`/`member_joined`/`member_left`/`settings_changed` are deleted; their information lives in snapshots. `room_closed` is unnecessary: with derived host migration, deletion only happens with zero connected members, so there is no one left to notify.

### D9: Round count from settings

- `rooms.ts` `canStartNextRound`: `round < 4` → `round < room.settings.rounds - 1`.
- `rooms.ts` `incrementRound`: `round >= 4` → `round >= room.settings.rounds - 1`.
- `gameHandlers.ts` `room.round === 4` game-over branch: deleted outright — derived phase covers it.

## Risks / Trade-offs

- [Whole room subtree re-renders per snapshot] → acceptable: the tree is small and the solving view already re-renders at 60fps for the timer. Selectors can be added later if profiling ever demands it.
- [Mass disconnect deletes the room] → accepted; rejoin then fails cleanly to Home. An empty-room retention window is a possible future hardening.
- [Rooms die on server restart/deploy] → unchanged from today; persistence out of scope.
- [Snapshot size grows linearly with members] → negligible at party scale (~2–3 KB at 8 members, ~10 KB at 50).
- [Ghost nickname blocks fresh re-join by nickname] → mitigated by the rejoin path itself (credentials restore membership); nickname-based joins after a full session loss require a different nickname, which is today's behavior too.
- [Home flashes briefly while the rejoin ack is in flight] → accepted for v1; a loading gate is a cosmetic follow-up.
- [Reconnect race: a transport-reconnect rejoin can arrive before the old socket's disconnect has been processed] → the server answers "already connected"; the client keeps credentials and a reload recovers. Rare, accepted.

## Migration Plan

Single coordinated deploy of server and client (BREAKING protocol; old client ↔ new server are incompatible). No data migration — rooms are in-memory and ephemeral. Rollback: redeploy previous versions of both apps; any games in flight are lost either way, same as today's host-disconnect behavior.

## Open Questions

- Should `MemberList` grey out disconnected members or hide them? (Cosmetic; either satisfies the specs.)
- Should the rejoin ack carry the first snapshot, or is the `room_state` broadcast sufficient? (Implementer's choice; broadcast-only is simpler.)
- Should the rejoin-in-flight state show a loading gate instead of a Home flash? (Cosmetic; defer.)
