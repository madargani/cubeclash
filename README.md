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

## Project layout

- `src/routes/` — file-based routes; `__root.tsx` is the document shell, `index.tsx` is the home page
- `src/styles.css` — global stylesheet (Tailwind v4 is configured entirely through CSS, no `tailwind.config.js`)
- `vite.config.ts` — Vite plugins: TanStack Start, Tailwind, React
- `tsconfig.json` — strict TypeScript with the `#/*` and `@/*` path aliases into `src/`

## Adding a route

Create a new file in `src/routes/` (e.g. `about.tsx`); the route tree is generated automatically when the dev server or build runs.
