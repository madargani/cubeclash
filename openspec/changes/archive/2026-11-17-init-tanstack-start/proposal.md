# Proposal

## Why

The repository is empty, so nothing can be built or demonstrated until a working application foundation exists. TanStack Start gives cubeclash a full-stack React base — SSR, type-safe file-based routing, and server functions on Vite — so future game features land in an established structure instead of ad-hoc setup.

## What Changes

- Scaffold a TanStack Start (React, Vite) application at the repository root, managed with pnpm.
- Add Tailwind CSS v4 through the `@tailwindcss/vite` Vite plugin, with a global stylesheet wired into the root route.
- Establish the file-based routing structure: a root route (`__root.tsx`) and a home route at `/` that renders a verifiable page.
- Configure TypeScript (strict, path aliases) and Vite to work with the TanStack Start plugin.
- Add package scripts (`dev`, `build`, preview/start) and `.gitignore` entries for Node, Vite, and build outputs.
- No existing code is changed or removed — the repo is greenfield; `openspec/` and `.agents/` are untouched.

## Capabilities

### New Capabilities

- `app-foundation`: The runnable application foundation — starting the dev server with SSR and hot reload, the file-based routing shell with a home page, the Tailwind styling pipeline, and producing/running a production build. Future capabilities (game features, backend endpoints) build on this boundary.

### Modified Capabilities

<!-- None: the repository has no existing specs. -->

## Impact

- **New files**: `package.json`, `pnpm-lock.yaml`, `vite.config.ts`, `tsconfig.json`, `.gitignore`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/styles.css`, and supporting config (e.g. `.cta.json` if the official CLI scaffold is used).
- **Dependencies**: `@tanstack/react-start`, `@tanstack/react-router`, `react`/`react-dom` (19.x), `tailwindcss` + `@tailwindcss/vite` (4.x), `vite`, `vite-tsconfig-paths`, TypeScript; dev tooling only — no external services.
- **Tooling**: Requires Node.js 20+ and pnpm on the development machine.
- **Systems**: None affected — greenfield project; no deployment target is configured in this change (default Node.js output; host-specific deployment is deferred).
