# KilnFlow Ops

Internal web app for a community ceramic studio. Members register pieces, technicians
plan kiln loads with an auto-planner, managers approve/schedule firings, and the
team monitors firing sensor data with automatic alerting.

Built as a TypeScript monorepo with a React + Vite frontend, an Express + SQLite
backend, and a shared types package.

## Quick start

```bash
# from this repo root (packages/claude)
npm install
npm run seed         # creates SQLite db + seed data (first run only)
npm run dev          # starts backend (4000) and frontend (5173) in parallel
```

Then open <http://localhost:5173> and sign in as one of the seeded users (Mira is a
manager, Tuan a technician, An and Linh are members, Guest is observer).

The frontend dev server proxies `/api` requests to `http://localhost:4000`.

## Common commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Backend + frontend dev servers in parallel |
| `npm run dev:backend` | Express + tsx watch (port 4000) |
| `npm run dev:frontend` | Vite dev server (port 5173) |
| `npm run seed` | Reset the SQLite DB to seed state |
| `npm run typecheck` | TypeScript check across all packages |
| `npm run test` | Run unit + API integration tests |
| `npm run test:backend` / `npm run test:frontend` | Targeted test runs |
| `npm run build` | Build shared, backend (tsc), frontend (vite) |
| `npm run verify` | `typecheck && test && build` — the full local CI gate |

## Repository layout

```
packages/
  shared/      types & enums shared by backend + frontend
  backend/     Express API, SQLite, planner, sensor analyzer, tests
  frontend/    React + Vite SPA
docs/
  architecture.md
  known-gaps.md
  manual-test-script.md
AGENTS.md
CLAUDE.md
```

## Seed data

`npm run seed` populates the SQLite database with:

- 5 users — manager (Mira), technician (Tuan), 2 members (An, Linh), observer (Guest)
- 2 kilns — Skutt 1027 (55×55cm × 4 shelves, 75kg, 18cm clearance) and Mini Raku
  (32×32cm × 2 shelves, 20kg, 14cm clearance)
- 12 pieces covering every planner branch: eligible cone-6 oxidation, wrong cone,
  under-dry, unknown glaze, too tall, too heavy, raku-compatible, cone-10
  earthenware blocked, urgent due date, multiple owners, glaze risk

The DB lives at `packages/backend/data/kilnflow.sqlite` and is ignored by git.

## How to verify the app

There is no shared cloud environment — everything runs locally. The recommended
flow is:

1. `npm run verify` — runs typecheck, unit + API integration tests, and the
   full build. This is the local CI gate.
2. `npm run dev` and walk through [docs/manual-test-script.md](docs/manual-test-script.md).

## Troubleshooting

- **`better-sqlite3` build failure on `npm install`**: this package compiles native
  code on first install. You need Xcode CLT (`xcode-select --install` on macOS) or
  build-essential on Linux. If install fails, run `npm rebuild better-sqlite3`.
- **`EADDRINUSE` on port 4000 or 5173**: set `PORT=4001` (backend) or `VITE_PORT=5174`
  (frontend) in `.env`.
- **Stale SQLite state**: delete `packages/backend/data/kilnflow.sqlite` and run
  `npm run seed` again.
- **Tests hang on import**: the backend uses pure ESM. If you see "Cannot use
  import statement outside a module", make sure you ran `npm install` from the
  repo root so the workspace symlinks point at `packages/shared/src/index.ts`.

## Configuration

All env vars are optional; sensible defaults are baked in. See `.env.example` for
the full list. Notable settings:

- `PORT` — backend port (default 4000)
- `DATABASE_FILE` — SQLite db path, relative to `packages/backend` (default
  `./data/kilnflow.sqlite`)
- `CORS_ORIGIN` — allowed frontend origin for CORS (default `http://localhost:5173`)

## Security notes

This is a local-only studio tool. It does not use real authentication, secrets,
or external services. See [docs/known-gaps.md](docs/known-gaps.md) for the full
risk discussion.
