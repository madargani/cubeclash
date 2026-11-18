# Tasks

## 1. Dependencies and settings schema

- [x] 1.1 Install `zod` and `@cubingcenter/scrambler`. Verify: `pnpm install` exits 0, `pnpm typecheck` passes, and a smoke test generating a seeded batch of 3x3 scrambles returns distinct WCA-notation scrambles in Node (retires the WASM-under-Vite risk first).
- [x] 1.2 Create `src/lib/room-settings.ts`: the Zod schema for room settings per design.md — `eventType` (validated against the scrambler's supported event ids), `roundCount` (1–20, default 5), `inspectionSeconds` (0–60, default 15), `readyTimeoutSeconds` (5–120, default 30) — exporting `RoomSettingsSchema`, `defaultRoomSettings`, and `parseRoomSettings`. Verify: unit tests confirm defaults parse, an unsupported event is rejected, and each out-of-range value is rejected naming its field.

## 2. Guest identity service

- [x] 2.1 Create `src/server/identity.ts` with `createGuestIdentity(db, displayName)` (identity row with a fresh unique token) and `resolveIdentity(db, token)` (the cuber or null). Verify: integration tests against `createTestDatabase()` — a created identity resolves by its token, an unknown token resolves to null, and two creations never share a token.
- [x] 2.2 Add the server-side current-cuber resolution helper that reads the `cubeclash_token` httpOnly cookie (SameSite=Lax) and resolves the identity, returning null for visitors without one. Verify: `pnpm typecheck` passes; the helper is exercised for real by the lobby walk in group 5.

## 3. Room services

- [x] 3.1 Create `src/server/rooms.ts` with `createRoom(db, hostId, settingsInput)`: settings through the Zod schema, a six-character invite code from the unambiguous alphabet with bounded collision retry, the creator recorded as host and first member. Verify: integration tests — a created room has host membership, parsed settings, a unique code; two rooms never share a code.
- [x] 3.2 Add `joinRoom(db, userId, inviteCode)`: first join creates membership, rejoining is a no-op, an unknown code is an error. Verify: integration tests cover the three join scenarios from the spec.
- [x] 3.3 Add `updateRoomSettings(db, userId, roomId, settingsInput)`: host-only, validated through the same Zod schema. Verify: integration tests — host updates persist, a non-host submission is rejected without changing settings, invalid values are rejected naming the offending field.
- [x] 3.4 Add `getRoomState(db, userId, roomId)`: member-only read returning invite code, host, members with display names, settings, and the active battle if one exists. Verify: integration tests — a member read includes all of it, a non-member read is rejected.

## 4. Battle start service

- [x] 4.1 Create `src/server/battles.ts` with `startBattle(db, userId, roomId)`: one transaction that snapshots the room's settings, records every room member as a participant, and inserts all rounds — numbered, each with its own scramble from the seeded batch generation, with a duplicate check before insert. Verify: integration tests — the battle stores the room's current settings, participants equal members, N numbered rounds exist with distinct scrambles for the configured event.
- [x] 4.2 Enforce the guards inside the transaction: host-only start, and at most one active battle per room. Verify: integration tests — a non-host start creates nothing, a second start while a battle is active is rejected and leaves the active battle unchanged.

## 5. Lobby UI

- [x] 5.1 Add thin server-function wrappers for create room, join room, update settings, and start battle: Zod parse, cookie identity resolution (creating a guest identity on first need), service call, response. Verify: `pnpm typecheck` passes and each wrapper is reachable from the forms in 5.2–5.3.
- [x] 5.2 Update the home page with a create-room form (display name, settings) and a join-by-code form (display name, code), redirecting into the room on success. Verify: with `pnpm dev`, creating a room lands on the room page and joining with an unknown code shows the error inline.
- [x] 5.3 Add the room route `src/routes/rooms/$roomId.tsx`: invite code, member list, host-gated settings form, host-gated start button, and the active battle summary; non-members see a rejection. Verify: two-browser walk — host creates, a friend joins by code, non-hosts see no settings or start controls, starting a battle shows its summary, and a second start is refused.

## 6. Documentation and integration check

- [x] 6.1 Update `README.md` with the lobby flow — create a room, share the invite code, join, configure, start — and note that a started battle does not run yet (the realtime change is next). Verify: every documented command and flow matches the app as walked in 5.2–5.3.
- [x] 6.2 Run the full check on a clean checkout: `pnpm install`, `pnpm db:migrate`, `pnpm test` (data-model suites from change 1 still pass), `pnpm typecheck`, and a `pnpm dev` smoke of the lobby walk. Verify: all green with no failures introduced by this change.
