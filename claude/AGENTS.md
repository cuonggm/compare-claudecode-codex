# AGENTS.md — Codex conventions for KilnFlow Ops

This file briefs OpenAI Codex (and any agent following the same conventions)
on how to work in this repository. It is short by design — read
[`docs/architecture.md`](docs/architecture.md) and [`README.md`](README.md)
for the long-form picture.

## What this repo is

A local-only TypeScript monorepo for a community ceramic studio. SQLite-backed
Express API, React + Vite SPA, shared types in `packages/shared`. There is no
real auth, no external services, no secrets. Everything runs `npm run dev`.

## Working rules

1. **Match the existing stack.** Don't introduce new package managers, build
   tools, or test runners. We use npm workspaces + tsx + vitest. Don't replace
   Express with Fastify, don't add a state library, don't swap SQLite for
   anything else.
2. **Write parameterized SQL.** Always go through the `Repo` helpers or
   prepared statements. Never concatenate user input into a query.
3. **Validate at the API boundary.** Any new route must run inputs through a
   Zod schema in `src/schemas.ts` (or a new one nearby).
4. **Enforce RBAC server-side.** Route-level `requireRole(...)` is the source
   of truth. Frontend can hide buttons, but always assume the request is
   authentic-but-malicious — return 403 from the server.
5. **Bump version on every load mutation.** Loads use optimistic concurrency.
   Mutations must accept `expectedVersion` and use
   `Repo.updateLoadWithVersionCheck`.
6. **Update tests with code.** New planner branch ⇒ new test in
   `planner.test.ts`. New alert type ⇒ new test in `sensor.test.ts`. New
   endpoint ⇒ a `supertest` case in `api.test.ts`. Don't ship behaviour
   without coverage.
7. **No `eval`, no `Function`, no `dangerouslySetInnerHTML`.** Particularly in
   the CSV path (which is hand-written for exactly this reason).
8. **Run `npm run verify` before declaring success.** That is `typecheck +
   test + build` across all three packages.

## Where to put things

- New API route: `packages/backend/src/routes.ts` + Zod schema in
  `schemas.ts`; integration test in `api.test.ts`.
- New planner rule: extend `checkPiece` in `planner.ts` with an
  `ExclusionReasonCode` (also added to `packages/shared/src/index.ts`); add a
  unit test in `planner.test.ts`; surface the user-facing string in the
  frontend (the exclusion list reads `reasonCode` + `message`).
- New page or component: under `packages/frontend/src/pages` or `components`.
  Keep them accessible — label every input, expose `aria-label` on
  data-visualisations, ensure focus states.
- New shared type/enum: `packages/shared/src/index.ts`. Both backend and
  frontend import from `@kilnflow/shared`.

## Anti-patterns to avoid

- Storing business state only in `localStorage`. We have a backend; use it.
- Adding feature flags or backwards-compatibility shims — there are no
  external consumers.
- Long defensive `try { } catch { }` blocks that swallow errors. Let them
  bubble; the route handler will return 500.
- Adding "TODO" / "FIXME" comments instead of finishing the work.
- Generating boilerplate test files that don't actually assert behaviour
  (`expect(true).toBe(true)`).

## Vocabulary

- **Piece** — a member's ceramic object, registered for firing.
- **Load** — a planned/approved/scheduled firing of a kiln. Carries a planner
  result and a version number.
- **Plan** — the planner's recommendation (selected + excluded + shelf
  assignments + capacity + warnings).
- **Reading** — a single sensor row. **Alert** — a flagged condition derived
  from a reading or pair of readings.
