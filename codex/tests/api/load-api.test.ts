import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/server/app.js";
import { seedDatabase } from "../../src/server/db/seed.js";
import { migrate, openDatabase, type Db } from "../../src/server/db/sqlite.js";
import type { User } from "../../src/shared/domain.js";

let db: Db;
let users: Record<string, User>;

beforeEach(() => {
  db = openDatabase(":memory:");
  migrate(db);
  seedDatabase(db, { reset: true });
  users = Object.fromEntries(
    (db.prepare("SELECT id, name, role FROM users").all() as User[]).map((user) => [user.name, user])
  );
});

afterEach(() => {
  db.close();
});

async function createDraftLoad() {
  const app = createApp(db);
  const response = await request(app)
    .post("/api/loads/plan")
    .set("x-user-id", String(users.Tuan.id))
    .send({ kilnId: 1, targetCone: "6", firingType: "oxidation", dueDatePriority: true })
    .expect(201);
  return { app, load: response.body.load as { id: number; version: number } };
}

describe("load API", () => {
  it("prevents a member from approving a load", async () => {
    const { app, load } = await createDraftLoad();

    const response = await request(app)
      .post(`/api/loads/${load.id}/approve`)
      .set("x-user-id", String(users.An.id))
      .send({ expectedVersion: load.version })
      .expect(403);

    expect(response.body).toEqual(expect.objectContaining({ code: "FORBIDDEN" }));
  });

  it("allows a manager to approve a load", async () => {
    const { app, load } = await createDraftLoad();

    const response = await request(app)
      .post(`/api/loads/${load.id}/approve`)
      .set("x-user-id", String(users.Mira.id))
      .send({ expectedVersion: load.version })
      .expect(200);

    expect(response.body.load.status).toBe("approved");
    expect(response.body.load.version).toBe(load.version + 1);
  });

  it("returns 409 for stale expectedVersion", async () => {
    const { app, load } = await createDraftLoad();

    await request(app)
      .post(`/api/loads/${load.id}/approve`)
      .set("x-user-id", String(users.Mira.id))
      .send({ expectedVersion: load.version })
      .expect(200);

    const staleResponse = await request(app)
      .post(`/api/loads/${load.id}/schedule`)
      .set("x-user-id", String(users.Mira.id))
      .send({
        expectedVersion: load.version,
        scheduledStart: "2026-05-22T09:00:00.000Z",
        scheduledEnd: "2026-05-22T17:00:00.000Z"
      })
      .expect(409);

    expect(staleResponse.body.message).toContain("người khác cập nhật");
  });

  it("imports sensor CSV and creates readings and alerts", async () => {
    const { app, load } = await createDraftLoad();
    const csv = [
      "timestamp,tempC,targetTempC,note",
      "2026-05-19T09:00:00Z,24,24,start",
      "2026-05-19T10:00:00Z,240,100,too fast and too hot",
      "2026-05-19T11:00:00Z,430,250,still fast"
    ].join("\n");

    const response = await request(app)
      .post(`/api/loads/${load.id}/sensor-csv`)
      .set("x-user-id", String(users.Tuan.id))
      .send({ csv })
      .expect(201);

    expect(response.body.readings).toHaveLength(3);
    expect(response.body.alerts).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "TEMP_DEVIATION" }),
      expect.objectContaining({ type: "RAMP_RATE_HIGH" })
    ]));
  });
});
