# CubeClash

A virtual speedcube competition platform. Compete with friends in synchronized 
speedcubing races with live timing, scrambles, and results.

Built on [TanStack Start](https://tanstack.com/start) (React + Vite) with [Tailwind CSS v4](https://tailwindcss.com/).

## Prerequisites

- Node.js 20 or later
- [pnpm](https://pnpm.io/) 10 or later

## Getting started

```bash
pnpm install
pnpm dev
```

The dev server serves the app at <http://localhost:3000> with server-side rendering and hot module replacement.

## Commands

| Command | Script | Description |
| --- | --- | --- |
| `pnpm dev` | `vite dev --port 3000` | Start the dev server at `http://localhost:3000` |
| `pnpm build` | `vite build` | Build the app for production into `dist/` (also generates the route tree) |
| `pnpm preview` | `vite preview` | Serve the production build locally |
| `pnpm generate-routes` | `vite build` | Regenerate the route tree (`src/routeTree.gen.ts`) from files in `src/routes/` |
| `pnpm typecheck` | `tsc --noEmit` | Type-check the project with zero errors expected |
| `pnpm db:generate` | `drizzle-kit generate` | Generate SQL migrations from `src/db/schema.ts` into `drizzle/` |
| `pnpm db:migrate` | `drizzle-kit migrate` | Apply migrations in `drizzle/` to the database at `DATABASE_URL` |
| `pnpm db:studio` | `drizzle-kit studio` | Open Drizzle Studio to browse the database at `DATABASE_URL` |
| `pnpm test` | `vitest run` | Run all test suites (schema constraints, migrations, room settings, identity, rooms, battles) against temporary databases |

## Project layout

- `src/routes/` — file-based routes; `__root.tsx` is the document shell, `index.tsx` is the home page with the create/join forms, `rooms/$roomId.tsx` is the room page
- `src/server/` — service modules (`identity.ts`, `rooms.ts`, `battles.ts`) plus the thin TanStack Start server-function wrappers (`fns.ts`) and the cookie session helper (`session.ts`)
- `src/lib/room-settings.ts` — the Zod schema for room settings (bounds, defaults, supported events)
- `src/styles.css` — global stylesheet (Tailwind v4 is configured entirely through CSS, no `tailwind.config.js`)
- `src/db/schema.ts` — the battle-domain Drizzle schema (`users`, `rooms`, `room_members`, `battles`, `battle_participants`, `rounds`, `solves`, `phase_checkpoints`)
- `src/db/index.ts` — the libsql client, WAL and foreign-key pragmas, and the Drizzle client
- `drizzle/` — generated SQL migrations (the only path by which the schema changes)
- `drizzle.config.ts` — drizzle-kit configuration (sqlite dialect, schema path, `DATABASE_URL`)
- `vite.config.ts` — Vite plugins: TanStack Start, Tailwind, React
- `tsconfig.json` — strict TypeScript with the `#/*` and `@/*` path aliases into `src/`

## Database

The app stores cuber identities, rooms, battles, rounds, solve times, and one phase checkpoint per battle in SQLite, accessed through libsql and Drizzle ORM.

1. Copy the environment template: the project reads `DATABASE_URL` from `.env` (default local development value: `file:local.db`).
2. `pnpm db:migrate` — creates all battle-domain tables in the database (idempotent; safe to re-run).
3. `pnpm dev` — start the app.

Schema changes are made in `src/db/schema.ts` and become SQL migrations via `pnpm db:generate`; migrations in `drizzle/` are applied with `pnpm db:migrate`. The schema constraint tests (`pnpm test`) run against a fresh temporary database and apply the migrations programmatically. The local SQLite file (`local.db` and its WAL/SHM siblings) is gitignored.

The schema is the durable layer the lobby (`add-lobby-api`) and realtime battle (`add-realtime-battles`) changes build on; both add logic only, no further DDL.

## Lobby flow

With `pnpm dev` running, open <http://localhost:3000> and walk the lobby:

1. **Create a room** — enter a display name and battle settings (event, rounds, inspection, ready timeout) in the create-room form. The first action issues a guest identity in an httpOnly cookie, so returning visitors are recognized without signing up. The host lands on the room page.
2. **Share the invite code** — the room page shows a six-character code (readable aloud: no `0/o`, `1/l/i`). Send it to your friends.
3. **Join by code** — friends enter the code (and a display name on first visit) in the join-by-code form and are redirected into the room. An unknown code shows an error inline; joining again is a no-op.
4. **Configure** — the host alone sees the settings form; everyone else sees the current settings read-only. Invalid values are rejected naming the offending field.
5. **Start** — the host clicks *Start battle*. The battle snapshots the room's settings, records every member as a participant, and generates all rounds with distinct WCA scrambles upfront. The room page then shows the active battle summary; a second start is refused while one battle is active.

A started battle is rows only — the rounds do not run yet. The realtime battle runtime (phases, timing, solve submission) is the next change, `add-realtime-battles`.

## Adding a route

Create a new file in `src/routes/` (e.g. `about.tsx`); the route tree is generated automatically when the dev server or build runs.
