# Known gaps & assumptions

This document lists deliberate trade-offs and assumptions made to keep the
project local-only and time-bounded.

## Auth

- Mock auth via `X-User-Id` header. **No real authentication** — anyone with
  network access to the backend can act as any user. This is fine for a local
  studio tool but unsuitable for shared hosting.
- No session timeout, no password reset, no user invitation flow.
- `Guest` is hardcoded as a reusable observer; a real system would require
  per-person identity for the audit trail to be meaningful.

## Persistence

- Single SQLite file under `packages/backend/data/`. WAL mode, but no
  per-request transactions beyond what `better-sqlite3` provides for bulk
  inserts.
- No migration tooling. Schema lives inline in `db.ts`. For a real product,
  use a migration library (`drizzle-kit`, `knex`, `sqlx`, etc.).
- No backups. The seed command resets state and is destructive.

## Planner

- Greedy 2D bin-packer. Will not always find the optimal layout for tightly
  packed shelves. The trade-off is intentional: deterministic, easy to
  understand, well-tested, and the failure mode is "we excluded a piece that
  might have fit" rather than "we overloaded the kiln".
- Per-shelf weight is not modelled — only total kiln weight. A real studio
  might want a per-shelf weight cap too.
- The score is heuristic and not auto-tuned. Glaze risk penalties are coarse.
- Pieces are reserved as `in-load` when a draft is approved or scheduled, so
  later planner runs exclude them. Draft loads still do not reserve pieces until
  they move into that operational workflow; two draft loads can temporarily show
  overlapping candidates.

## Sensor / firing monitor

- CSV import is the only ingestion path. There is no live websocket feed.
- The analyzer compares each new reading against the immediately previous one
  for ramp rate. A more sophisticated implementation would window over the
  last N minutes.
- `UNEXPECTED_COOLDOWN` only fires when load status is `firing`. Operators now
  start and complete a firing from the load detail page; the system still does
  not auto-start a firing from the scheduled timestamp.

## Frontend

- No global state library (Redux/Zustand). Each page fetches its own data.
  This works at this size but will get noisy if the app grows.
- Charts are hand-rolled SVG. They scale fine but lack zoom/pan and only show
  one series pair (actual + target). For richer interactivity, swap in
  Recharts or visx.
- Toast/snackbar notifications are not implemented; errors render in a banner.
- No internationalisation; copy is English-only.
- Mobile layout is responsive but the planner's shelf preview is most useful
  on tablet+.

## Security

- Server validates inputs at the API boundary (Zod), returns JSON for malformed
  JSON/unknown API routes, sends basic hardening headers, and rate-limits write
  requests in memory. It still does not provide real sessions, CSP/HSTS for a
  hosted frontend, persistent audit of failed auth attempts, or distributed
  rate-limiting.
- CORS is wide-open to `http://localhost:5173` in dev. For production, set
  `CORS_ORIGIN` to the deployed origin.
- React renders text by default, but if a future feature renders user-supplied
  HTML (e.g. via `dangerouslySetInnerHTML`), the audit trail body should be
  sanitised first.

## Testing

- No Playwright/Cypress E2E suite. The environment in which this was built
  has no UI runtime, so the user-flow tests live as `docs/manual-test-script.md`
  rather than executable code. The API integration tests cover the same flows
  at the protocol level.
- Frontend has a single component test (`ExclusionList`). Adding tests for
  forms (`IntakePage`) and the planner page would be the next step.

## Build & deployment

- No Dockerfile, no CI config. Local-only.
- No telemetry, no error reporting (e.g. Sentry).
