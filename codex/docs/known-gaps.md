# Known Gaps

- Authentication is deliberately mock-only. The `x-user-id` header is not secure outside local development.
- The planner is greedy and explainable, not a full bin-packing optimizer. It can miss a denser layout that a technician could arrange manually.
- `node:sqlite` on Node 25 may emit an experimental warning. It still persists to a local SQLite file and avoids native dependency build failures.
- Playwright E2E is included, but it requires a local Chromium browser install with `npx playwright install chromium`. The manual smoke script remains as a fallback.
- Piece status transitions are conservative. Draft planning records selected pieces on the load but does not remove them from every future draft candidate.
- Sensor import accepts CSV text pasted into the UI rather than a file picker. The parser and persistence path are the same API behavior.
- Audit notes are append-only but not cryptographically tamper-proof.
- The UI is responsive and keyboard navigable, but it has not been tested with a real screen reader in this local pass.
- `npm install` reported moderate audit findings in the dependency tree. No forced upgrade was applied because `npm audit fix --force` can introduce breaking version changes.
