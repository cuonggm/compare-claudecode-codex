# CLAUDE.md — Claude Code conventions for KilnFlow Ops

The conventions for working in this repository are the same as for any other
agent — they are documented in [`AGENTS.md`](AGENTS.md). Treat that file as
canonical.

## Claude-specific guidance

A few additional reminders that play to Claude Code's strengths:

- **Use the project's `npm run verify` as your final check.** It runs
  `typecheck && test && build` across all three packages. If anything is red,
  don't claim the task is done.
- **Prefer Edit/Read over Bash for source files.** Bash is for npm scripts,
  git, and one-off DB inspection (`sqlite3 packages/backend/data/kilnflow.sqlite '.tables'`).
- **Backend changes that affect API shape must update**
  `packages/shared/src/index.ts` first. The frontend imports types from
  there.
- **The planner is the trickiest piece of logic.** Each `ExclusionReasonCode`
  has a matching test case; if you change the order of checks, re-read the
  tests to make sure the right reason still wins (e.g. an under-dry piece
  with the wrong cone should still report `under-dry` because dryness comes
  earlier in the check pipeline).
- **CSV parsing must never use `eval` or external libraries.** The hand-rolled
  parser is small on purpose — extend it carefully and add a test.

## Quick task recipes

- Add a new role permission helper → edit `packages/shared/src/index.ts` and
  add the corresponding `requireRole(...)` guard server-side and a hide-gate
  on the relevant frontend page.
- Add a new alert code → constant + threshold in `sensor.ts`, add a check
  inside `analyzeReadings`, add a `sensor.test.ts` case, and surface it in
  `de-bai-test-codex-claude-kilnflow.md` / `docs/known-gaps.md` if it changes
  observable behaviour.
- Reset DB to seed: `rm packages/backend/data/kilnflow.sqlite && npm run seed`.

## See also

- `AGENTS.md` — shared conventions (read this first).
- `docs/architecture.md` — the why and the how.
- `docs/known-gaps.md` — what is intentionally not built.
- `docs/manual-test-script.md` — full UI walkthrough.
