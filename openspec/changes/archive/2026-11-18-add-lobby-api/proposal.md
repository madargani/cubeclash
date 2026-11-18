# Proposal

## Why

The durable layer exists but nothing reaches it: no cuber can appear without an account system, no room can be created or joined, and no battle can start. This change puts the lobby over HTTP so a host and their friends can go from an empty home page to a started battle with generated scrambles — and it settles the two questions the data-layer change deliberately left open here: the concrete room-settings field list and the invite-code format. It is the second change of the recorded three-change roadmap; the realtime loop remains the third.

## What Changes

- Add Zod validation at the server-function boundary, and `@cubingcenter/scrambler` for WCA random-state scramble generation.
- Guest identity over HTTP: a cuber supplies a display name with their first lobby action and receives an identity row plus an httpOnly cookie carrying the row's token; every later request resolves the cuber from that cookie. No signup flow, no password.
- Room lifecycle server functions: create a room (host becomes the first member, room gets a short unique invite code), join by invite code (rejoining is idempotent), host edits room settings, and any member can read room state (members, settings, invite code, active battle).
- Room settings settle to four fields: `eventType` (a WCA event id, the same ids the scrambler uses), `roundCount`, `inspectionSeconds`, `readyTimeoutSeconds` — all stored in the existing settings JSON columns, so no DDL.
- Battle start server function, host-only: snapshots room settings onto the battle, records the room's members as participants, generates every round upfront with one seeded scramble per round, and enforces one active battle per room. A started battle is rows only — nothing runs until the realtime change.
- Minimal lobby UI to prove the flow: the home page gains create-room and join-by-code forms; a room page shows the invite code, members, host-gated settings form, host-gated start button, and the active battle summary.

Out of scope (the roadmap, restated): the WebSocket runtime — phases, gates, host force-start, solve submission, checkpoint writes, and the end-of-battle transition that lets a room start its next battle — is the next change (`add-realtime-battles`). Also out of scope: claiming a guest identity with an account, leaving a room, host transfer, standings/scoring UI, and any Nitro or hosting configuration.

## Capabilities

### New Capabilities

- `guest-identity`: Cubers arrive as guests — a display name and an httpOnly token cookie are enough to be recognized across visits, and every server action resolves the current cuber from that cookie.
- `room-management`: Rooms exist over HTTP — a host creates one and gets a shareable invite code, cubers join with that code, the host alone edits settings, and room state is readable by members.
- `battle-lifecycle`: A host starts a battle — the action snapshots configuration, freezes the participant set from room membership, generates all rounds with scrambles upfront, and keeps at most one battle active per room.

### Modified Capabilities

<!-- None: battle-data-model's storage requirements are untouched — this change writes rows that schema already constrains, adding no tables or columns. app-foundation's requirements (SSR home page, file-based routing) are also unchanged; the lobby pages are new routes under the same rules. -->

## Impact

- **Dependencies added**: `zod` (input validation), `@cubingcenter/scrambler` (scramble generation).
- **New code**: service modules plus thin TanStack Start server-function wrappers under `src/server/`, Zod schemas for settings and action inputs, and lobby routes — the home page gains forms and a new room route is added.
- **No schema changes**: all new state rides existing tables; settings ride the JSON columns the data model already defines.
- **Tests**: follow the existing `createTestDatabase` pattern — integration tests against a freshly migrated temporary database, exercising each spec scenario.
