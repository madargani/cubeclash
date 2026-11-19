# Design

## Context

The lobby is complete: `startBattle` freezes config and participants and pre-generates every round's scramble; the schema already carries `phase_checkpoints` for exactly this change; the room page reads its first state over server functions and nothing updates it live — members join, hosts save settings, battles start, and open pages stay stale until a reload. What is missing is the process that runs a battle and the channel that keeps rooms live. The build has no Nitro plugin yet — WebSocket support arrives with it.

Two durable constraints from earlier decisions shape everything below: live state lives in memory, durable facts live in the database, and the gate denominator is the participant set frozen at battle start (strict, with host force-start).

## Goals / Non-Goals

**Goals:**

- One live channel per room, with an in-memory runtime as the single authority for live state and the database as the single authority for durable facts.
- Runtime construction from the database in exactly one code path, so a cold start and a post-restart resync are the same operation.
- A small pure core — gates, transitions, standings — testable without sockets.

**Non-Goals:**

- No schema changes or migrations; every needed table exists.
- No horizontal scaling: one process owns a room's runtime. A multi-node bus (Redis or similar) is a later change if ever needed.
- No solve-timeout setting: the solving gate has no deadline, host force-start is the escape hatch. A setting can be added later without schema damage.
- No persisted ready state, no accounts, no judging of other cubers' penalties (self-marked only), no browsing of past battles' results.

## Decisions

**1. Nitro WebSocket via crossws, not a separate gateway.**
Add the `nitro/vite` plugin with `features.websocket` and a WebSocket handler in a separate Nitro server dir, mounted alongside the app's routes. Rationale: Nitro is the officially recommended deployment adapter for TanStack Start anyway, and our design only needs the hook surface (`upgrade`/`open`/`message`/`close` plus a peer send) — not framework-managed pub/sub, which is where its experimental rough edges live. Alternatives: a standalone `ws` process (kept as the documented fallback if the plumbing fights us — same runtime design, different host), and SSE + HTTP POST (rejected: bidirectional gates want one transport and sub-second round-trips).

**2. Two room-keyed registries: a channel for connections, a runtime for live battle state.**
`Map<roomId, RoomChannel>` owns connections — one entry per socket, peer-keyed so multiple tabs of one cuber are independent — created when the first member connects to the room and alive as long as any member's page is open. `Map<roomId, RoomRuntime>` owns phase, deadline, ready set, submitted set, and pending timers — no connections — and publishes into the room's channel. The runtime is built only in the `startBattle` message handler — with every member already connected — and never from the server-function side; a room connect that finds an active battle with no runtime — the post-restart case — rebuilds from durable rows through the same `buildRuntimeState` path as a cold start, with the checkpoint restoring round, phase, and deadline unchanged. When the battle ends, the runtime is evicted; the channel stays.

**3. A tiny gate abstraction.**
A gate is `{ check(state) -> bool, deadlineAt, onFire() }`. Two gate types — ready and submitted — plus one plain timer (inspection). Strict denominator: the battle's participant rows. Host force marks a gate satisfied; the submitted gate's forced fire writes DNF solve rows for unsubmitted participants inside one transaction before broadcasting results. The ready timeout comes from battle settings; the submitted gate deliberately has none (see Non-Goals). The 3-second pre-inspection countdown is its own short phase with a deadline, so clients render it like any other countdown.

**4. Absolute deadlines, never per-second ticks.**
Every phase transition broadcasts `{ phase, roundId, deadlineAt }` once. Clients render countdowns from their own clocks against the server deadline, so a laggy socket cannot drift a countdown and the server sends nothing per second.

**5. Ready and submitted state keyed by user, not by socket.**
Multiple tabs per cuber are allowed; the ready and submitted sets dedupe by userId, so a refresh keeps the cuber's state. On runtime rebuild the checkpoint restores round, phase, and deadline; the ready set starts empty by design, and a restored deadline already in the past fires the gate immediately instead of waiting.

**6. Socket auth reuses the guest identity cookie.**
The WebSocket upgrade is a same-origin request carrying the existing httpOnly token; resolve the cuber with the existing session helper, reject non-members. The channel is open whenever a member views the room — an active battle is not required to connect. No new credential surface. Members who are not battle participants watch as spectators: they receive battle state, and their `ready`/`submit` are rejected.

**7. An all-snapshot Zod-validated message protocol.**
Client to server: `ready`, `submit { timeMs, penalty }`, `forceStart`, `updateSettings { settings }`, `startBattle`. Server to client: exactly two state messages, each a full snapshot — `roomState` (invite code, host, members, settings, active battle; published on connect and whenever a room fact changes) and `battleState` (phase, round, deadline, scramble, ready set, submitted set, completed rounds' results, and standings once ended; sent on connect when a battle is active and after every battle event) — plus `error`. No deltas anywhere: the client applies each snapshot by replacement, a reconnect heals by construction, and there is no merge-drift class of bug. The trade — every ready click and submit re-sends the full battle state — is a kilobyte or two at invite-code room sizes, accepted. Zod parses in both directions, mirroring the `parseOrThrow` style of the existing server functions. Scrambles travel only inside the current battle snapshot — later rounds are never sent early.

**8. One socket for the room page's whole lifetime.**
The room page opens the channel on mount and holds it until unmount — not just during a battle. The loader paints the first state; `roomState` snapshots keep it live (joins, settings saves, the lobby-to-battle flip), and the battle screen consumes `battleState` snapshots through per-phase views: scramble + ready, countdown, inspection cues, spacebar timer with penalty marking after stop, results with ready-up, final standings. Timer mechanics are local (keydown/keyup timestamps) — the server never measures time, it only records.

**9. Standings by placement points.**
Winner of a round scores points equal to the participant count, each next placement one fewer, DNF scores zero; ties share the better placement's points. Computed at battle end from solves and sent in `battleEnded`; nothing is stored, so the model can be swapped by changing one pure function. Alternative considered — sum of final times — rejected for MVP because DNFs distort sums and per-round placement reads better in a battle format. This pins the assumption recorded in the proposal; if it feels wrong in play, it is a one-function change.

**10. Ending the battle.**
When the final round's results gate fires, one transaction marks the battle ended with its end time and writes no further checkpoint; the server publishes the final `battleState` (with standings) and then a fresh `roomState` (battle gone) so every member's page returns to the room, and evicts the runtime. The existing one-active-battle guard then admits the room's next battle — this is the piece that completes `battle-lifecycle`.

**11. The socket context alone owns live-state publishing.**
The WebSocket hooks run in the nitro serverDir worker while the TanStack server functions run in the app's SSR bundle — two module contexts, so any registry imported by both is duplicated and a publish from the function side lands in an empty copy. Publishing and runtime construction therefore live only on the socket side. Mutations by connected members ride the channel they already hold: `updateSettings` and `startBattle` are socket messages handled like `forceStart` — host-checked, calling the same pure services, publishing from the socket's context. A join is the one mutation that comes from outside (the joiner has no channel yet), so the room announces it when the joiner's page connects: the open handler broadcasts a fresh room snapshot to existing peers alongside the newcomer's own. Replace-semantics snapshots make the spurious re-publishes from refreshes and second tabs harmless by construction. Services and server functions stay pure over `(db, inputs)` and never import the channel or runtime registries.

## Risks / Trade-offs

- [Nitro's WebSocket support is still marked experimental] → Our usage stays on the hook surface, which works in dev and the node-server preset; the standalone-gateway fallback is documented above and needs no runtime redesign.
- [One process owns all live state] → Restart resets ready state (accepted; the spec requires exactly that) and multi-node deployment is out until an external bus exists. Mitigated by: the runtime is fully rebuildable from durable rows at any moment.
- [Gate fire racing a late submission] → Both run on the Node event loop, so ordering is deterministic: a submission arriving after the results transition is simply rejected, and the database unique constraint on (round, cuber) backs the runtime's dedupe.
- [Times are self-reported and trusted] → Accepted for friend battles; the server only enforces that submissions happen inside the solving phase. Plausibility bounds are a later, isolated addition.
- [Every battle event re-sends the full battle state] → Accepted: at invite-code room sizes a snapshot is a kilobyte or two, and uniform replace semantics buy idempotent clients and self-healing reconnects. Revisit only if rooms grow much larger.
- [Multiple tabs per cuber] → Allowed by design; connections are peer-keyed so tabs are independent sockets, ready/submitted dedupe is by user, and the solve unique constraint makes a double-submit harmless.
- [Two module contexts: socket side vs server-function side] → Any in-memory registry imported by both is duplicated, and the failure is silent — a broadcast into an empty map. Guard: publishing and runtime construction exist only behind the socket route; a server function importing the channel or runtime modules is a review-time bug.

## Migration Plan

Dependency and plugin addition plus new code only — no schema change, so rollback is trivial: remove the Nitro plugin flag and the new routes; the lobby keeps working untouched. Deployment remains a single long-lived Node process, which the Nitro node-server preset already provides; serverless presets are explicitly not supported by this design.

## Open Questions

- Penalty marking UX (buttons after the timer vs. csTimer-style keys) — a UI choice during implementation; the protocol already carries the penalty either way.
- Socket keepalive strategy (crossws ping interval) — tuning detail, no behavior impact.
- Whether the countdown length stays fixed at 3 seconds or becomes a room setting — the spec says only "a short countdown", so this can move to settings later without a spec change.
