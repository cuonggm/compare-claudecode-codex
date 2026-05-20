# Architecture

## Overview

KilnFlow Ops uses a small TypeScript full-stack architecture:

- `src/shared`: domain types, kiln planner, and sensor analyzer
- `src/server`: Express API, RBAC middleware, SQLite persistence, migration, seed data, validation
- `src/web`: React/Vite app shell, dashboard, backlog, planner, load detail, sensor monitor
- `tests/unit`: planner and sensor tests
- `tests/api`: API integration tests against SQLite `:memory:`

## Request Flow

1. The frontend sends `x-user-id` from the mock login dropdown.
2. Express attaches the user from SQLite.
3. Route middleware checks role permissions for protected actions.
4. Zod validates request bodies.
5. Repository functions use prepared SQL statements.
6. Responses return typed JSON for React views.

## RBAC Model

- `member`: create/edit own pieces and view own backlog.
- `technician`: view backlog, run planner, regenerate draft loads, import sensor CSV, add notes.
- `manager`: technician permissions plus approve, schedule, and cancel loads.
- `observer`: read dashboard and firing timeline/load detail only.

Permissions are enforced in the API, not only hidden in UI.

## Planner

The planner is a deterministic greedy algorithm:

1. Sort candidates by due date, created date, and weight.
2. Exclude non-compatible pieces with explicit reason codes.
3. Try shelf placement using a simple rectangle scan and rotation.
4. Enforce weight, shelf footprint, and shelf height constraints.
5. Return selected pieces, excluded pieces, shelf assignments, capacity percentages, warnings, and score.

This is intentionally not NP-hard bin packing. It is explainable and testable for a studio operations workflow.

## Optimistic Concurrency

Each load has a `version`. Mutating load actions require `expectedVersion`. If the client sends a stale version, the API returns HTTP 409 with `VERSION_CONFLICT`.

Versioned actions include:

- Regenerate draft
- Add technical note
- Approve
- Schedule
- Cancel

## Sensor CSV

CSV header must be:

```csv
timestamp,tempC,targetTempC,note
```

Rows are parsed by a small quoted-field parser. Imported readings are persisted. Alerts are generated for:

- `TEMP_DEVIATION`: absolute temp delta from target is at least 50C
- `RAMP_RATE_HIGH`: ramp rate is above 180C/hour
- `UNEXPECTED_TEMP_DROP`: temp drops by more than 25C while load status is `firing`

## Persistence

SQLite tables:

- `users`
- `kilns`
- `pieces`
- `loads`
- `load_pieces`
- `load_exclusions`
- `audit_notes`
- `sensor_readings`
- `alerts`

The default database lives at `data/kilnflow.sqlite`.
