# Tasks

## 1. Dependencies and local environment

- [x] 1.1 Install `drizzle-orm` and `@libsql/client` as runtime dependencies and `drizzle-kit` as a dev dependency. Verify: `pnpm install` exits 0 and `pnpm typecheck` still passes.
- [x] 1.2 Create `.env` with `DATABASE_URL=file:local.db`, and add the SQLite artifacts (`local.db` and its WAL/SHM siblings) to `.gitignore` (`.env` is already ignored). Verify: `git check-ignore local.db` succeeds and the dev database file is never staged.
- [x] 1.3 Add `db:generate` and `db:migrate` scripts to `package.json`. Verify: `pnpm run` lists both and each resolves to a drizzle-kit command.
- [x] 1.4 Add a `db:studio` script (`drizzle-kit studio`) alongside the other database scripts. Verify: `pnpm run` lists `db:studio` and `pnpm db:studio` serves the Drizzle Studio web client (https://local.drizzle.studio) against `DATABASE_URL`.

## 2. Schema and migrations

- [x] 2.1 Create `src/db/schema.ts` defining all eight tables with their constraints per design.md: `users` (text UUID id, display name, unique token, nullable claim timestamp), `rooms` (unique invite code, host reference, settings JSON), `room_members` (composite primary key, foreign keys), `battles` (settings snapshot JSON, status, start/end timestamps), `battle_participants` (composite primary key, foreign keys), `rounds` (unique battle_id + round_number, scramble), `solves` (unique round_id + user_id, raw time, penalty enum, foreign keys), `phase_checkpoints` (battle_id keyed, current round, phase). Verify: `pnpm typecheck` passes.
- [x] 2.2 Create `drizzle.config.ts` (sqlite dialect, schema path, `./drizzle` output, credentials from `DATABASE_URL`) and run `pnpm db:generate`. Verify: `drizzle/` contains one initial migration whose SQL creates all eight tables including their unique and foreign-key constraints.
- [x] 2.3 Create `src/db/index.ts`: libsql client from `DATABASE_URL`, `journal_mode = WAL` and `foreign_keys = ON` enabled on connection, a global singleton guard so dev hot-reload reuses one client, and the Drizzle client bound to the schema. Verify: `pnpm typecheck` passes; the client is exercised for real by the constraint tests in group 3.
- [x] 2.4 Apply the schema with `pnpm db:migrate`, then run it a second time. Verify: the first run creates all eight tables in `local.db` and the second run exits 0 without changing anything (migrations are idempotent — the spec's fresh-database and already-migrated scenarios).

## 3. Schema constraint tests

- [x] 3.1 Add a vitest setup compatible with the installed Vite toolchain (`test` script plus config) and a test helper that creates a fresh temporary database per run and applies the migrations programmatically via Drizzle's libsql migrator. Verify: `pnpm test` runs, migrates the temp database, and a smoke test asserting all eight tables exist passes.
- [x] 3.2 Cover the identity scenarios from the spec: a duplicate token write is rejected; a claimed row keeps its identifier and its links. Verify: tests pass against the freshly migrated temp database.
- [x] 3.3 Cover the relational constraint scenarios from the spec: membership and solve rows referencing missing parents are rejected; duplicate participants, duplicate round numbers within a battle, and duplicate solves for one round of one cuber are rejected. Verify: tests pass, each rejection surfaced as a constraint violation.
- [x] 3.4 Cover the snapshot and checkpoint scenarios from the spec: a battle's stored settings stay unchanged after the room's settings are edited; repeated checkpoint upserts leave exactly one row per battle; re-applying migrations to the migrated temp database is a no-op. Verify: tests pass.

## 4. Documentation

- [x] 4.1 Update `README.md` with a database section: `.env` with `DATABASE_URL`, the `db:generate`/`db:migrate`/`test` commands, and a short note that this schema is the durable layer the planned lobby and realtime changes build on. Verify: every documented command matches a `package.json` script and runs as written on a fresh clone after `pnpm install`.
