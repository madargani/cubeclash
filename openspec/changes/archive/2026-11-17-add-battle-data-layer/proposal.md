# Proposal

## Why

The application foundation runs but persists nothing — cubers, rooms, battles, and times have nowhere to live. Every battle feature (lobby actions, the realtime loop) builds on a durable data model, and the architecture is already settled: a strict durable/ephemeral split where the database stores the facts that outlive a battle (identity, membership, configuration snapshots, scrambles, solves, one phase checkpoint per battle) while a later WebSocket runtime owns live state. Landing the schema first, in one migration, lets the follow-up changes be pure logic with zero DDL.

## What Changes

- Add SQLite as the database, accessed through libsql, with Drizzle ORM for typed queries and drizzle-kit for migrations.
- Define the full battle-domain schema in one initial migration: `users`, `rooms`, `room_members`, `battles`, `battle_participants`, `rounds`, `solves`, `phase_checkpoints`.
- Guest-first identity rows: a stable id, a display name, a unique token used as the cookie credential, and nullable claim fields so a future account can adopt the row without re-linking history.
- Battle configuration stored as a snapshot on the battle, copied from room settings at start, so rooms are reusable and past battles stay historically accurate when settings change between games.
- Solve records keyed one-per-round-per-participant with penalty support (`none` / `+2` / `DNF`) — times never live on the `users` or `rounds` tables, and final times are derived rather than stored.
- One phase-checkpoint row per battle: the bridge a future realtime runtime reads to resync after a server restart (phase position is expensive to redo; ready state is not, so only the phase is checkpointed).
- Database tooling: migration scripts (`db:generate`, `db:migrate`), local dev configuration (`.env` with `DATABASE_URL=file:local.db`), and a gitignored SQLite file.

Out of scope (recorded as the roadmap so it survives this change): lobby actions over HTTP — guest join flow, create/join/configure room, start battle with scramble generation — are the next change (`add-lobby-api`); the WebSocket battle runtime — in-memory room state, gates, host force-start, solve submission, checkpoint writes — is the change after that (`add-realtime-battles`). No APIs, UI, or realtime logic land here; the schema is exercised only by migrations and typechecks.

## Capabilities

### New Capabilities

- `battle-data-model`: The durable record of the battle domain — guest identity rows, reusable rooms and their membership, battles with configuration snapshots, rounds with scrambles, per-round solve records with penalties, and the per-battle phase checkpoint. This capability owns how battle facts persist and how they are constrained (uniqueness, foreign keys); lobby actions and the realtime battle loop will build on it as separate capabilities.

### Modified Capabilities

<!-- None: the repository has one existing spec, app-foundation, whose requirements are untouched by this change. -->

## Impact

- **New files**: `drizzle.config.ts`, `src/db/index.ts` (client), `src/db/schema.ts` (all eight tables), `drizzle/` (generated migrations), `.env`, and updates to `.gitignore` and `package.json` (dependencies and scripts).
- **Dependencies added**: `drizzle-orm` + `@libsql/client` (runtime), `drizzle-kit` (dev).
- **Tooling**: local development uses `DATABASE_URL=file:local.db`; `pnpm db:generate` and `pnpm db:migrate` manage the schema; migrations are the only path by which the schema changes.
- **Systems**: none affected — this change adds no server behavior. The Nitro plugin and WebSocket support are deliberately deferred to the realtime change; Drizzle works in plain TanStack Start server functions today.
