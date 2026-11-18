# Design

## Context

The data layer exists and is constrained by the `battle-data-model` spec; the db client (`src/db/index.ts`, WAL + FK pragmas, global singleton) and the `createTestDatabase` migration-backed test pattern are established. Change 1's design left two questions open on purpose, and this change settles both: the concrete room-settings field list, and the invite-code format. All new state rides existing tables — settings ride the JSON columns — so this change has zero DDL. The lobby runs over HTTP (TanStack Start server functions); WebSockets are deliberately absent until `add-realtime-battles`.

## Goals / Non-Goals

**Goals:**

- Lobby actions as server functions with validated inputs: guest identity, create/join/configure room, start battle.
- A started battle leaves the database in a state a realtime runtime can pick up wholesale: frozen settings, frozen participants, all rounds with scrambles.
- Every spec scenario testable against a freshly migrated temporary database, following the existing test-helper pattern.
- UI just sufficient to walk the flow: home forms, one room page, no client-side state management.

**Non-Goals:**

- No realtime anything: no sockets, no polling, no timers — a started battle is rows only (change 3).
- No end-of-battle, leave-room, host transfer, or kick — later changes.
- No display-name uniqueness: identity is the token, not the name; two cubers may share a name.
- No CSRF/rate-limit hardening beyond SameSite cookies — a local MVP concern, revisited with accounts.
- No Nitro plugin or deployment changes.

## Decisions

### Pure service modules under thin server-function wrappers

Lobby logic lives in service modules (`src/server/identity.ts`, `rooms.ts`, `battles.ts`) as pure functions over `(db, inputs)`. TanStack Start server functions stay thin wrappers: parse with Zod, resolve the identity from the cookie, call the service, return. Tests call services directly against `createTestDatabase()` — no faked request context, no cookie mocking in the logic layer. Alternative rejected: testing through server functions with mocked TanStack request machinery — brittle, and couples tests to framework plumbing that changes 3 will not need.

### Room settings settle to four validated fields

`eventType` (a WCA event id string, validated against the scramble library's supported-event list so one source of truth defines "supported"), `roundCount` (1–20, default 5), `inspectionSeconds` (0–60, default 15, WCA inspection), `readyTimeoutSeconds` (5–120, default 30, the gate deadline the realtime change enforces). One Zod schema in `src/lib/room-settings.ts` owns parsing, defaults, and bounds; server functions never touch raw settings. The JSON column absorbs future fields without a migration; the bounds are product guesses, revisable by editing one schema plus one spec scenario.

### Invite codes: six unambiguous characters, bounded retry

Codes draw from `23456789abcdefghjkmnpqrstuvwxyz` (no `0/o`, `1/l/i`) — short enough to read aloud, unambiguous enough to type. Generation retries on unique-constraint violation, capped (then falls back to a longer code) so a pathological collision loop cannot hang a request. Rationale over alternatives: a UUID suffix is unshareable verbally; a global sequence is guessable.

### Lazy guest identity behind an httpOnly cookie

Identity is created by the first action that needs one (create room, join room) — no separate signup step. The cookie (`cubeclash_token`, httpOnly, SameSite=Lax, path=/) holds `users.token`; a resolve helper returns the cuber or null, and recognized visitors are never re-prompted for a name. The data model already guarantees token uniqueness; this change only reads and writes it. Alternative rejected: a sessions table — deferred until multi-device, as recorded in the data-layer design.

### Battle start: one transaction, scrambles upfront and distinct

Starting a battle reads room settings + members and writes the battle (settings snapshot), participants, and all rounds inside one SQLite transaction — all-or-nothing, and the "no active battle" check happens inside it, so two racing starts cannot both win. Scrambles come from `@cubingcenter/scrambler`'s batch API seeded by the battle id (`generateScrambles(eventId, N, { seed })`) — reproducible, random-state, ~6ms per 3x3 so a whole battle is instant. The batch is checked for duplicates and any collision is regenerated before insert (possible in principle for random-move big-cube events; the spec promises distinct rounds). The library is async WASM and runs only server-side.

### Host checks are server-side authority

Every host-gated action (settings edit, battle start) resolves identity → membership → host comparison in the service layer; the room page merely hides the controls for non-hosts. The UI is convenience, never the gate.

## Risks / Trade-offs

- [Scramble WASM library misbehaves under Vite dev SSR] → smoke-test generation in the first implementation task; it targets Node directly, and the fallback is a different scramble library behind one call site.
- [Settings bounds are guesses] → they are pinned in spec scenarios and one Zod schema; changing them is a two-line edit, no migration.
- [Cookie identity means one device per cuber] → accepted for MVP, recorded in the data-layer design; multi-device is a sessions-table change later.
- [Racing battle starts] → the active-battle check runs inside the start transaction; SQLite's single-writer discipline makes the check-and-write atomic.
- [Non-members get an error opening a room URL directly] → intended; the documented path is join-by-code, which redirects into the room.

## Migration Plan

Additive only: two dependencies, new source files, new routes; no schema or migration changes — `pnpm db:migrate` is untouched and existing tests must keep passing. Rollback in development: remove the new files and dependencies; any rooms/battles created while the change ran are ordinary domain rows and can simply be kept or wiped with `local.db` in dev.

## Open Questions

- Room-page presentation details (disabled vs hidden host controls, exact form layout) — presentation only; safe to settle while building.
- Whether the room page should show past battles of the room — a read-only list later; the room state read already returns the active battle, which is what this change needs.
