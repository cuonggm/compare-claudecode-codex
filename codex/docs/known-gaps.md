# Known Gaps

- Authentication is deliberately mock-only. The `x-user-id` header is now strictly parsed (positive integer ≤ 10 digits) and falls back to the Guest observer, but it remains spoofable outside local development.
- The planner is greedy and explainable, not a full bin-packing optimizer. It can miss a denser layout that a technician could arrange manually.
- `node:sqlite` on Node 25 still emits an experimental warning. WAL mode, `busy_timeout = 5000`, and `synchronous = NORMAL` are enabled for the on-disk database; the in-memory test database uses safer defaults automatically.
- Rate limiting is in-memory only (240 req/min/IP by default). For multi-instance deployment swap in a shared store (Redis, etc.).
- Playwright E2E is included, but it requires a local Chromium browser install with `npx playwright install chromium`. The manual smoke script remains as a fallback.
- Piece status transitions are conservative. Draft planning records selected pieces on the load but does not remove them from every future draft candidate.
- Sensor import accepts CSV text pasted into the UI rather than a file picker. Body limit is now 256 KB and CSV is capped at 100 KB on the API.
- Audit notes are append-only but not cryptographically tamper-proof.
- The UI is responsive, keyboard navigable, has a skip-link and an error boundary, but it has not been tested with a real screen reader in this pass.
- `npm install` reported moderate audit findings in the dependency tree. No forced upgrade was applied because `npm audit fix --force` can introduce breaking version changes.
