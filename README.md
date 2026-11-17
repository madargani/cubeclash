# cubeclash

An online speecube battling platform.

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
| `pnpm test` | `vitest run` | Run the schema constraint tests against a temporary database |

## Project layout

- `src/routes/` — file-based routes; `__root.tsx` is the document shell, `index.tsx` is the home page
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

This schema is the durable layer the planned lobby (`add-lobby-api`) and realtime battle (`add-realtime-battles`) changes build on; those changes add logic only, no further DDL.

## Adding a route

Create a new file in `src/routes/` (e.g. `about.tsx`); the route tree is generated automatically when the dev server or build runs.
