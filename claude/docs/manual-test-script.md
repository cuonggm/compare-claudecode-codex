# Manual test script — KilnFlow Ops

This script walks through every user-facing feature end-to-end. It is the
substitute for an automated E2E test suite (see `docs/known-gaps.md`).

## Prereqs

```bash
npm install
npm run seed
npm run dev
```

Backend should report `[kilnflow] backend listening on http://localhost:4000`.
Open <http://localhost:5173>.

## 1. Mock login

1. The login screen lists 5 users. Pick **Tuan (technician)** and sign in.
2. Top bar shows "Tuan · technician" and the nav has Dashboard / Backlog /
   Intake / Planner / Loads.

✔ Expected: navigating between pages does not lose the session (it's stored
in `localStorage`).

## 2. Dashboard

1. Click **Dashboard** (or refresh `/`).
2. You should see three KPI cards: Waiting, Eligible, Blocked. With seed data,
   Waiting > 0 and Eligible > 0.
3. "Upcoming kiln loads" is empty initially. "Recent alerts" is empty. Kiln
   capacity lists Skutt 1027 and Mini Raku with their specs.

## 3. Backlog filters

1. Go to **Backlog**. You should see 12 seeded pieces.
2. Filter by Owner = `An` — only An's pieces show.
3. Reset filters. Filter by Cone = `10`. You should see the cone-10 stoneware
   mug and the cone-10 earthenware piece.
4. Filter by Blocked reason = `unknown-glaze` — only "Mystery wood-ash test"
   should remain.
5. Reset and search "raku" — both Raku-ready vase and the porcelain
   (raku-incompatible) piece appear.

## 4. Intake (member)

1. Sign out, sign in as **An (member)**.
2. Go to **Intake**.
3. Submit the form with width=0 — the form blocks submission with a "Width
   must be greater than 0." error tied to the field via `aria-describedby`.
4. Fill the form for An's own piece and submit. Browser navigates to Backlog
   and the new piece appears.
5. Edit one of An's pieces from the Backlog table — succeeds.
6. Open the intake form for one of Linh's pieces directly via URL
   `/intake/<piece-id>` — clicking save should fail with "Members can only
   edit their own pieces." (Backend 403, surfaced as an error banner.)
7. Sign out.

## 5. Planner (technician)

1. Sign in as **Tuan (technician)**.
2. Go to **Planner**.
3. Default kiln Skutt 1027, cone 6, oxidation. Click **Preview plan**.
4. Expect: selected list includes Celadon teacup, Shino vase, Commission
   plate (urgent — first), Soda-sensitive cup. The excluded list shows:
   - "Crawl-glazed mug (cone 10)" → reason `wrong-cone`
   - "Fresh bowl (still drying)" → reason `under-dry`
   - "Mystery wood-ash test" → reason `unknown-glaze`
   - "Tall jug (too tall)" → reason `too-tall`
   - "Garden planter (heavy)" → reason `over-weight`
   - Raku-only pieces → reason `wrong-firing-type`
   - Earthenware/cone-10 piece → reason `wrong-cone`
5. Click **Create draft load**. The page navigates to `/loads/<id>` showing
   the new draft with v1.

### Raku planner sanity-check

1. Back in Planner, pick Mini Raku, cone 04, raku.
2. Preview — "Raku-ready vase" should be selected; "Porcelain
   (raku-incompatible)" should be excluded with reason
   `raku-incompatible-clay`.

### Cone-10 sanity-check

1. Planner with Skutt 1027, cone 10, reduction.
2. Earthenware piece is excluded with `cone10-earthenware-blocked`.

## 6. Load detail actions

Open the draft load you created.

1. **Regenerate plan** as Tuan — version bumps from v1 to v2.
2. Add a **technical note** "starting test" — shows up in the audit list
   with author "Tuan (technician)".
3. Try to **approve** — the Approve button is not shown (RBAC). If you fire
   the API directly with `curl -X POST .../approve -H "X-User-Id: user-tuan"`
   you should get 403.
4. Sign out, sign in as **Mira (manager)**.
5. Open the same load.
6. Click **Approve** — status becomes `approved`, version v3.
7. Pick a future date in the schedule input, click **Schedule** — status
   becomes `scheduled` with the chosen timestamp.
8. Sign in as **Tuan (technician)** or stay as Mira, then click **Start
   firing** — status becomes `firing` and the firing hero appears.
9. Click **Complete** — status becomes `completed`; selected pieces move to
   `fired` in the backlog.

### Conflict path

1. Open the same load in two browser tabs as Mira.
2. In tab A, click **Cancel load** — succeeds, version bumps.
3. In tab B (still showing the older version), click **Approve** or
   **Schedule** — the conflict banner appears with the current server version
   and a Refresh button.

## 7. Sensor CSV import + alerts

1. Open any draft, scheduled, or firing load as Mira or Tuan.
2. Paste this CSV in the import textarea and click Import:

   ```csv
   timestamp,tempC,targetTempC,note
   2026-05-19T09:00:00Z,24,24,start
   2026-05-19T10:00:00Z,120,100,ramp ok
   2026-05-19T10:30:00Z,300,180,ramp faster
   2026-05-19T11:00:00Z,310,180,deviation persists
   ```

3. The chart renders two lines (solid = actual, dashed = target).
4. The alerts section gains a `RAMP_TOO_FAST` warning (between 10:00 and 10:30
   the ramp is 360°C/hr) and one or more `TEMP_DEVIATION` warnings (300 vs
   180 = 120°C deviation, severity `critical`).
5. Dashboard's "Recent alerts" now lists the same items with a link back to
   the load.

### Cool-down detection

For a load in status `firing`, importing a CSV where temperature drops
> 180°C/hr should yield an `UNEXPECTED_COOLDOWN` alert.

## 8. Observer

1. Sign out, sign in as **Guest (observer)**.
2. Dashboard and Loads list are readable. Planner page is replaced by a
   permission notice. Intake save fails with 403.

## 9. API regression check

```bash
# health
curl -s localhost:4000/api/health

# member tries to approve – should be 403
curl -s -X POST localhost:4000/api/loads/<id>/approve \
  -H 'Content-Type: application/json' \
  -H 'X-User-Id: user-an' \
  -d '{"expectedVersion":1}'

# stale version – 409 with current state
curl -s -X POST localhost:4000/api/loads/<id>/cancel \
  -H 'Content-Type: application/json' \
  -H 'X-User-Id: user-mira' \
  -d '{"expectedVersion":1}'
```

Use one of the load IDs from `GET /api/loads`.

## Sign-off checklist

- [ ] Dashboard KPIs render
- [ ] Backlog filters work
- [ ] Intake validation catches bad input
- [ ] Member RBAC works front-end and back-end
- [ ] Planner produces selected + excluded with reason codes
- [ ] Draft load creation + regenerate
- [ ] Approve → schedule → start → complete/cancel state machine
- [ ] Version conflict shows a useful message
- [ ] CSV import creates readings + alerts
- [ ] Observer cannot mutate
