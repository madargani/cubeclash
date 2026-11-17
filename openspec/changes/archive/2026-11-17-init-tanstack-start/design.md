# Design

## Context

The repository is empty except for `.agents/`, `.git/`, and `openspec/`. There is no `package.json`, so the change bootstraps the app from scratch. See `proposal.md` for motivation. Decisions already made with the user: **pnpm** as the package manager and **Tailwind CSS v4** for styling. No deployment target was chosen, so this change targets the default (Node.js) output only.

## Goals / Non-Goals

**Goals:**

- A minimal, idiomatic TanStack Start (React + Vite) app at the repo root that runs with `pnpm dev` and builds with `pnpm build`.
- Tailwind v4 compiled through the Vite plugin and linked from the root route.
- A routing structure future routes can grow into, plus a type-checked, strict TypeScript setup.

**Non-Goals:**

- No game features, server functions, or API endpoints — the home page is a placeholder.
- No deployment configuration (Vercel/Netlify/Cloudflare adapters, Docker) — deferred until a host is chosen.
- No lint/format toolchain, testing stack, or CI — added by later changes.
- No monorepo/workspace layout — a single app at the root.

## Decisions

1. **Scaffold with the official TanStack CLI, fall back to manual setup.**
   Try `pnpm dlx @tanstack/cli@latest create` non-interactively against the repo root (`--force` because the directory is non-empty; `openspec/` and `.agents/` collide with nothing the template generates). This yields the current, maintainers-blessed structure. If the CLI cannot complete non-interactively (it prompts for package manager, add-ons) or produces the wrong choices, fall back to a manual scaffold following the official "Getting Started" and Tailwind framework guide.
   *Alternative considered*: always scaffold manually — fully deterministic, but risks drifting from the officially blessed template.
2. **Manual-scaffold reference layout** (the fallback, and the shape to verify the CLI output against): `vite.config.ts` registering `@tanstack/react-start/plugin/vite` (`tanstackStart()`), `@tailwindcss/vite`, and `vite-tsconfig-paths`; `src/router.tsx` with a generated route tree via `@tanstack/react-router` file-based routing; `src/routes/__root.tsx` linking `src/styles.css?url`; `src/routes/index.tsx` home page; `src/styles.css` containing `@import "tailwindcss"`. Strict `tsconfig.json` with a single path alias into `src/`.
3. **Tailwind v4 via the Vite plugin, not PostCSS.** `@tailwindcss/vite` needs no `tailwind.config.js` or PostCSS config — configuration lives in CSS. *Alternative considered*: Tailwind v3 + PostCSS — legacy; rejected.
4. **pnpm scripts**: `dev` (vite dev), `build` (vite build), plus whatever start/preview script the current Start version expects; add `typecheck` (`tsc --noEmit`). Pin exact dependency versions in `package.json`.
5. **Default SSR and routing behavior.** Keep framework defaults (full SSR, file-based routing, dev port 3000) — no custom server, no SSR-mode switches. Git: extend `.gitignore` for `node_modules/`, build output, and `.env` — do not reinitialize git (the repo already has `.git`).

## Risks / Trade-offs

- [CLI scaffolding is interactive; flags and template contents change between releases] → Use the documented non-interactive flags; if blocked, the manual fallback in Decision 2 is sufficient to satisfy every scenario in the spec. Check current docs at apply time rather than trusting memorized flags.
- [Non-empty target could tempt `--force` overwrites] → The repo contains nothing the template would generate; verify the diff touches only new files before committing.
- [Fast-moving framework: docs and generated code drift] → Pin exact versions, keep the scaffold minimal, and validate against the spec's scenarios rather than template diffs.
- [Tailwind v4 + SSR edge cases (FOUC, missing stylesheet in prod build)] → Spec requires the stylesheet to be linked on every page in dev and prod; verify both during apply.
- [Default dev port 3000 already in use] → Documented in the README/notes; Vite auto-increments the port with a console warning, so behavior stays observable.

## Migration Plan

Greenfield — nothing to migrate. Rollback is `git clean` / deleting the generated files; no data or external systems are involved.
