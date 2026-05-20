# KilnFlow Ops

KilnFlow Ops is a full-stack local web app for a community ceramics studio. It handles member piece intake, backlog filtering, kiln load auto-planning, firing load approvals, sensor CSV imports, alerts, mock role-based access control, optimistic concurrency, and audit notes.

## Stack

- Frontend: React, Vite, TypeScript
- Backend: Express, TypeScript, Zod validation
- Database: local SQLite through Node's built-in `node:sqlite`
- Tests: Vitest unit tests and Supertest API integration tests

## Setup

```bash
npm install
cp .env.example .env
npm run db:seed
```

The default database path is `./data/kilnflow.sqlite`.

## Run

```bash
npm run dev
```

- Web: http://127.0.0.1:5173
- API: http://127.0.0.1:4000

Use the mock login dropdown to switch roles:

- Mira: manager
- Tuan: technician
- An: member
- Linh: member
- Guest: observer

## Test And Verify

```bash
npm run test
npm run verify
```

`npm run verify` runs:

1. Typecheck for server and web
2. Unit and API integration tests
3. Production build

Focused commands:

```bash
npm run test:unit
npm run test:api
npm run test:e2e
npm run build
```

For E2E on a fresh machine, install the Chromium browser once:

```bash
npx playwright install chromium
```

## Seed Data

The seed includes:

- 5 users across manager, technician, member, and observer roles
- 2 kilns: Skutt 1027 and Mini Raku
- 13 pieces covering eligible cone 6 oxidation, wrong cone, under-dry, unknown glaze, too tall, too heavy, raku compatibility, cone 10 earthenware block, urgent due dates, and multiple owners
- 1 scheduled bisque load with audit note and alert

## Key Behaviors

- Backend RBAC is enforced with the `x-user-id` mock auth header.
- Load updates require `expectedVersion`; stale updates return HTTP 409.
- Planner excludes pieces with explicit reason codes and persists selected/excluded rows on draft loads.
- Sensor CSV parsing is custom and does not use `eval`.
- Alerts are generated for temperature deviation, excessive ramp rate, and abnormal drops while a load is firing.
- All SQL writes use prepared statements.

## Troubleshooting

- `node:sqlite` may print an `ExperimentalWarning` on Node 25. The app still uses a real local SQLite database and avoids native package compilation.
- If port 4000 or 5173 is busy, set `PORT` for the API and adjust `VITE_API_BASE_URL` in `.env`. Stop any running dev server before `npm run test:e2e` because Playwright starts its own server.
- If the frontend shows permission errors, check the mock login dropdown and retry as Tuan or Mira.
- If a manager action returns conflict, refresh the load detail and retry with the latest version.

## Security And Data Safety Assumptions

- This is a local internal mock-auth app, not production authentication.
- No real secrets, paid APIs, hosted databases, or external runtime services are used.
- The mock auth header is trusted only for local testing.
- HTML is rendered by React escaping; no raw HTML rendering is used.
- CSV import is size-limited by Express JSON limits and parsed without code execution.
