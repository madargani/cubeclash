# Tasks

## 1. Scaffold and project setup

- [x] 1.1 Scaffold a TanStack Start (React + Vite) app into the repo root with the official CLI run non-interactively (`pnpm dlx @tanstack/cli@latest create` with force/skip-prompt flags; fall back to the manual layout in design.md Decision 2 if the CLI cannot complete non-interactively). Verify: `package.json`, `vite.config.ts`, and `src/routes/__root.tsx` exist and pnpm is the configured package manager, with no changes to `openspec/` or `.agents/`.
- [x] 1.2 Install dependencies with pnpm and pin exact versions in `package.json`. Verify: `pnpm install` exits 0 and `pnpm-lock.yaml` is created.
- [x] 1.3 Configure strict TypeScript with a path alias into `src/` and add a `typecheck` script. Verify: `pnpm typecheck` passes with zero errors.
- [x] 1.4 Add `.gitignore` entries for `node_modules/`, build/dist output, and `.env`. Verify: `git status --ignored` lists generated dependencies as ignored.
- [x] 1.5 Write a minimal `README.md` (project purpose, prerequisites Node.js 20+/pnpm, command reference). Verify: every documented command matches a script in `package.json` and runs as written.

## 2. Tailwind styling pipeline

- [x] 2.1 Add `tailwindcss` + `@tailwindcss/vite`, register the plugin in `vite.config.ts`, create the global stylesheet with `@import "tailwindcss"`, and link it from the root route. Verify: `pnpm dev` serves at `http://localhost:3000` and the home page HTML links the compiled stylesheet.
- [x] 2.2 Style a placeholder cubeclash home page using Tailwind utility classes. Verify: opening the page in a browser shows the utilities applied (layout/colors) with no unstyled flash.

## 3. Routing behavior

- [x] 3.1 Wire the file-based router (router setup + generated route tree) with the root route and index route at `/`. Verify: `curl http://localhost:3000/` returns HTML containing the home page content before client JavaScript runs (SSR).
- [x] 3.2 Enable not-found handling for undefined paths. Verify: requesting an undefined path returns a 404 status with a not-found page, and the page hydrates in a browser without console errors.

## 4. Production build

- [x] 4.1 Run the production build. Verify: `pnpm build` exits 0 and the build output directory is populated.
- [x] 4.2 Serve the production build and exercise the home page. Verify: requesting `/` against the production server returns the home page with content and the stylesheet linked, matching dev behavior.
