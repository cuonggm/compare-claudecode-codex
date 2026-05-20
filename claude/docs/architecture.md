# Architecture

## High-level

```
+-----------------+        HTTP        +------------------+      better-sqlite3      +------------+
| React (Vite)    |  <---------------> | Express + Zod    |  <---------------------> | SQLite     |
|  - Pages        |   /api/* (JSON)    |  - RBAC          |       (file or memory)   |  WAL mode  |
|  - Components   |   X-User-Id        |  - Planner       |                          +------------+
|  - Mock auth    |                    |  - Sensor parser |
+-----------------+                    +------------------+
                                                 ^
                                                 |
                                       +---------+----------+
                                       |  shared types pkg  |
                                       +--------------------+
```

The repo is an `npm` workspace monorepo with three packages:

- `packages/shared` — pure TypeScript types and tiny permission helpers used by
  both ends. The package is consumed as source (re-exporting `src/index.ts`) so
  Vite and tsx can pick up changes without a build step.
- `packages/backend` — Express server, Zod schemas, SQLite repository, the
  planner, sensor analyzer, and tests.
- `packages/frontend` — React + Vite SPA. No build-time API client codegen;
  types are imported directly from `@kilnflow/shared`.

## Backend

### Data model

| Table | Purpose |
| --- | --- |
| `users` | Seeded mock users with roles |
| `kilns` | Kiln specs (shelf size, count, weight cap, clearance) |
| `pieces` | Member-registered ceramic pieces |
| `kiln_loads` | A planned/approved/scheduled firing (carries planner result as JSON, plus a numeric `version` for optimistic concurrency) |
| `load_notes` | Audit trail per load |
| `sensor_readings` | Imported temperature readings |
| `alerts` | Generated from sensor analysis |

All queries are parameterized via `better-sqlite3` prepared statements. The
planner result is stored as JSON on the load row to keep schema changes cheap;
selected pieces & shelf assignments live inside that JSON.

### Auth + RBAC

Mock auth: the client sends `X-User-Id` and the server resolves it against the
`users` table. There are *no* sessions, JWTs, or passwords — this is explicitly
local-only.

Permission enforcement lives at the route layer (see `src/auth.ts`). Each route
calls `requireRole(...)`. The frontend hides actions the user cannot perform
using the helpers in `@kilnflow/shared`, but **the source of truth is the
server**: blocked frontend buttons still return 403 from curl. Member writes are
also constrained so they cannot reassign ownership or set operational piece
statuses by crafting API requests. Tests cover both the allow and deny paths for
representative routes.

The Express app also disables `X-Powered-By`, emits basic hardening headers,
returns JSON for malformed JSON / unknown API routes, and applies a small
in-memory write-rate limiter. This is still local-tool hardening, not production
authentication.

### Planner

The planner (`src/planner.ts`) is a greedy 2D-packer with an explicit constraint
phase:

1. **Pre-check** each candidate against status, dryness, cone, firing type,
   unknown-glaze, raku/clay compatibility, cone-10 earthenware, height &
   footprint vs the kiln. Each rejection produces an `ExcludedPiece` with a
   stable reason code.
2. **Sort** survivors by due date (ascending) and tiebreak with a score:
   urgency, age-in-backlog (bonus), glaze risk (penalty for `crawl` and
   `soda-sensitive`).
3. **Place** pieces shelf-by-shelf with a row-packing cursor. The cursor wraps
   when a row is full; a piece that doesn't fit anywhere is excluded with
   reason `no-shelf-fit`. Weight is summed across the kiln (not per shelf), and
   excess pieces are excluded with `over-weight`.
4. **Report** capacity usage as percentages, an aggregate score, and warnings
   (e.g. nearing the 90% weight soft cap).

Trade-off: greedy packing does not always find an optimal layout, but it is
deterministic, easy to reason about, and the failure mode (too few pieces
selected) is conservative rather than dangerous. Tests cover each exclusion
branch and the priority ordering.

### Sensor pipeline

`src/sensor.ts` does two things:

- `parseSensorCsv` — line-by-line CSV parser. Supports double-quoted cells,
  tolerates an optional header row in any column order, and rejects malformed
  rows with a structured `CsvParseError` (no `eval`, no `Function`, no
  external library).
- `analyzeReadings` — combines new readings with existing ones, sorts by
  timestamp, and emits `TEMP_DEVIATION`, `RAMP_TOO_FAST`, and
  `UNEXPECTED_COOLDOWN` alerts based on the thresholds in
  `de-bai-test-codex-claude-kilnflow.md`. Severity is escalated to `critical`
  for large deviations (>=100°C) and any cool-down event during an active
  firing.

### Optimistic concurrency

Every load action (approve, schedule, cancel, regenerate) takes an
`expectedVersion` body field. The `Repo.updateLoadWithVersionCheck` helper
compares against the current row version inside a single SQL UPDATE bound by
`WHERE version = ?`; on mismatch it returns the *current* server state so the
client can render a useful conflict UI ("v3 on server vs v2 on your screen,
refresh").

Approval or direct scheduling reserves selected pieces as `in-load`, start moves
the load into `firing`, complete marks selected pieces as `fired`, and cancel
releases reserved pieces back to `ready` when the load had entered the
operational workflow.

## Frontend

- Routing: `react-router-dom` v6 with a top nav and one page per major area.
- State: each page owns its own `useEffect`-based fetch. There is no global
  store — the app is small enough that prop-drilling and per-page state is the
  least surprising choice.
- Mock login is stored in `localStorage` and surfaced via the `AuthProvider`.
  The header sets `X-User-Id` on every request.
- Visualisations are hand-rolled SVG (`SensorChart`) and CSS grids
  (`ShelfLayout`) to keep the dependency tree small and accessibility easy.
  Every chart/layout exposes a textual `aria-label` summarising its content.
- Responsive layout uses CSS grid + flex; the top bar collapses on narrow
  screens. Focus styles, keyboard-reachable controls, and label-for-input
  associations are present on every form.

## Tests

- Unit: `planner.test.ts`, `sensor.test.ts` — every exclusion branch and alert
  type is exercised.
- API integration: `api.test.ts` mounts the Express app over an in-memory
  SQLite (`:memory:`) and drives it with `supertest`. Covers RBAC matrix,
  optimistic concurrency, CSV import side effects, and validation errors.
- Frontend: a small component test for `ExclusionList`. Full UI smoke testing
  is captured in `docs/manual-test-script.md` since the environment has no
  Playwright runtime configured.
