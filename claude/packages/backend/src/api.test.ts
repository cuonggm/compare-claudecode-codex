import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from './app.js';
import { openInMemoryDb } from './db.js';
import { seedDatabase } from './seed.js';

function newApp() {
  const db = openInMemoryDb();
  seedDatabase(db);
  return buildApp(db);
}

describe('API integration', () => {
  let app: ReturnType<typeof newApp>;

  beforeEach(() => {
    app = newApp();
  });

  it('health endpoint works', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('returns JSON for malformed JSON and unknown API routes', async () => {
    const badJson = await request(app)
      .post('/api/pieces')
      .set('Content-Type', 'application/json')
      .send('{"name":');
    expect(badJson.status).toBe(400);
    expect(badJson.body.error).toMatch(/JSON/);

    const missing = await request(app).get('/api/does-not-exist');
    expect(missing.status).toBe(404);
    expect(missing.body.error).toMatch(/Không tìm thấy endpoint/);
  });

  it('lists users without auth', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(5);
  });

  it('rejects unauthenticated planner request (403/401)', async () => {
    const res = await request(app)
      .post('/api/loads/plan')
      .send({ kilnId: 'kiln-skutt-1027', targetCone: '6', firingType: 'oxidation' });
    expect([401, 403]).toContain(res.status);
  });

  it('allows technician to run planner', async () => {
    const res = await request(app)
      .post('/api/loads/plan')
      .set('X-User-Id', 'user-tuan')
      .send({ kilnId: 'kiln-skutt-1027', targetCone: '6', firingType: 'oxidation' });
    expect(res.status).toBe(200);
    expect(res.body.selectedPieceIds.length).toBeGreaterThan(0);
    expect(res.body.excluded.length).toBeGreaterThan(0);
  });

  it('member cannot approve a load (403)', async () => {
    // Create a load first as technician
    const created = await request(app)
      .post('/api/loads')
      .set('X-User-Id', 'user-tuan')
      .send({ kilnId: 'kiln-skutt-1027', targetCone: '6', firingType: 'oxidation' });
    expect(created.status).toBe(201);
    const loadId = created.body.id;
    const version = created.body.version;

    const res = await request(app)
      .post(`/api/loads/${loadId}/approve`)
      .set('X-User-Id', 'user-an')
      .send({ expectedVersion: version });
    expect(res.status).toBe(403);
  });

  it('manager can approve a load', async () => {
    const created = await request(app)
      .post('/api/loads')
      .set('X-User-Id', 'user-tuan')
      .send({ kilnId: 'kiln-skutt-1027', targetCone: '6', firingType: 'oxidation' });
    const loadId = created.body.id;
    const version = created.body.version;

    const res = await request(app)
      .post(`/api/loads/${loadId}/approve`)
      .set('X-User-Id', 'user-mira')
      .send({ expectedVersion: version });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
    expect(res.body.version).toBe(version + 1);
  });

  it('stale version update returns 409', async () => {
    const created = await request(app)
      .post('/api/loads')
      .set('X-User-Id', 'user-tuan')
      .send({ kilnId: 'kiln-skutt-1027', targetCone: '6', firingType: 'oxidation' });
    const loadId = created.body.id;

    // First approval bumps version
    const first = await request(app)
      .post(`/api/loads/${loadId}/approve`)
      .set('X-User-Id', 'user-mira')
      .send({ expectedVersion: 1 });
    expect(first.status).toBe(200);

    // Second attempt with stale version
    const second = await request(app)
      .post(`/api/loads/${loadId}/cancel`)
      .set('X-User-Id', 'user-mira')
      .send({ expectedVersion: 1 });
    expect(second.status).toBe(409);
    expect(second.body.current).toBeTruthy();
  });

  it('CSV import creates readings and alerts', async () => {
    const created = await request(app)
      .post('/api/loads')
      .set('X-User-Id', 'user-tuan')
      .send({ kilnId: 'kiln-skutt-1027', targetCone: '6', firingType: 'oxidation' });
    const loadId = created.body.id;

    const csv = `timestamp,tempC,targetTempC,note
2026-05-19T09:00:00Z,24,24,start
2026-05-19T09:30:00Z,300,100,ramp very fast`;
    const res = await request(app)
      .post(`/api/loads/${loadId}/sensors/import`)
      .set('X-User-Id', 'user-tuan')
      .send({ csv });
    expect(res.status).toBe(201);
    expect(res.body.readings.length).toBe(2);
    expect(res.body.alerts.length).toBeGreaterThan(0);

    const fetched = await request(app).get(`/api/loads/${loadId}/sensors`);
    expect(fetched.body.length).toBe(2);
  });

  it('observer cannot create pieces (403)', async () => {
    const res = await request(app)
      .post('/api/pieces')
      .set('X-User-Id', 'user-guest')
      .send({
        ownerId: 'user-guest',
        name: 'test',
        clayBody: 'stoneware',
        glazeFamily: 'clear',
        targetCone: '6',
        firingType: 'oxidation',
        widthCm: 10,
        depthCm: 10,
        heightCm: 10,
        weightKg: 1,
        drynessPercent: 90,
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        notes: '',
      });
    expect(res.status).toBe(403);
  });

  it('member cannot create pieces for another owner (403)', async () => {
    const res = await request(app)
      .post('/api/pieces')
      .set('X-User-Id', 'user-an')
      .send({
        ownerId: 'user-linh',
        name: 'forged',
        clayBody: 'stoneware',
        glazeFamily: 'clear',
        targetCone: '6',
        firingType: 'oxidation',
        widthCm: 10,
        depthCm: 10,
        heightCm: 10,
        weightKg: 1,
        drynessPercent: 90,
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        notes: '',
      });
    expect(res.status).toBe(403);
  });

  it('member can create their own piece', async () => {
    const res = await request(app)
      .post('/api/pieces')
      .set('X-User-Id', 'user-an')
      .send({
        ownerId: 'user-an',
        name: 'my piece',
        clayBody: 'stoneware',
        glazeFamily: 'clear',
        targetCone: '6',
        firingType: 'oxidation',
        widthCm: 10,
        depthCm: 10,
        heightCm: 10,
        weightKg: 1,
        drynessPercent: 90,
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        notes: '',
      });
    expect(res.status).toBe(201);
    expect(res.body.ownerId).toBe('user-an');
  });

  it('member cannot forge owner or operational status through piece APIs', async () => {
    const createAsFired = await request(app)
      .post('/api/pieces')
      .set('X-User-Id', 'user-an')
      .send({
        ownerId: 'user-an',
        name: 'already fired',
        clayBody: 'stoneware',
        glazeFamily: 'clear',
        targetCone: '6',
        firingType: 'oxidation',
        widthCm: 10,
        depthCm: 10,
        heightCm: 10,
        weightKg: 1,
        drynessPercent: 90,
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        notes: '',
        status: 'fired',
      });
    expect(createAsFired.status).toBe(403);

    const reassign = await request(app)
      .put('/api/pieces/piece-an-bowl-1')
      .set('X-User-Id', 'user-an')
      .send({
        ownerId: 'user-linh',
        name: 'forged edit',
        clayBody: 'stoneware',
        glazeFamily: 'clear',
        targetCone: '6',
        firingType: 'oxidation',
        widthCm: 10,
        depthCm: 10,
        heightCm: 10,
        weightKg: 1,
        drynessPercent: 90,
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        notes: '',
        status: 'ready',
      });
    expect(reassign.status).toBe(403);
  });

  it('rejects piece with invalid dimensions (zod)', async () => {
    const res = await request(app)
      .post('/api/pieces')
      .set('X-User-Id', 'user-tuan')
      .send({
        ownerId: 'user-an',
        name: 'bad',
        clayBody: 'stoneware',
        glazeFamily: 'clear',
        targetCone: '6',
        firingType: 'oxidation',
        widthCm: 0,
        depthCm: 10,
        heightCm: 10,
        weightKg: 1,
        drynessPercent: 90,
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        notes: '',
      });
    expect(res.status).toBe(400);
  });

  it('rejects unknown candidate piece ids instead of silently ignoring them', async () => {
    const res = await request(app)
      .post('/api/loads/plan')
      .set('X-User-Id', 'user-tuan')
      .send({
        kilnId: 'kiln-skutt-1027',
        targetCone: '6',
        firingType: 'oxidation',
        candidatePieceIds: ['piece-an-bowl-1', 'missing-piece'],
      });
    expect(res.status).toBe(400);
    expect(res.body.missingPieceIds).toEqual(['missing-piece']);
  });

  it('dashboard returns summary', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.waitingPieces).toBeGreaterThan(0);
    expect(res.body.kilnCapacity.length).toBeGreaterThanOrEqual(2);
  });

  it('manager can schedule an approved load', async () => {
    const created = await request(app)
      .post('/api/loads')
      .set('X-User-Id', 'user-tuan')
      .send({ kilnId: 'kiln-skutt-1027', targetCone: '6', firingType: 'oxidation' });
    const id = created.body.id;
    const approved = await request(app)
      .post(`/api/loads/${id}/approve`)
      .set('X-User-Id', 'user-mira')
      .send({ expectedVersion: 1 });
    const scheduled = await request(app)
      .post(`/api/loads/${id}/schedule`)
      .set('X-User-Id', 'user-mira')
      .send({ expectedVersion: approved.body.version, scheduledAt: new Date(Date.now() + 86400000).toISOString() });
    expect(scheduled.status).toBe(200);
    expect(scheduled.body.status).toBe('scheduled');
  });

  it('load lifecycle reserves selected pieces, starts firing, and marks pieces fired on completion', async () => {
    const created = await request(app)
      .post('/api/loads')
      .set('X-User-Id', 'user-tuan')
      .send({ kilnId: 'kiln-skutt-1027', targetCone: '6', firingType: 'oxidation' });
    const id = created.body.id;
    const selectedPieceId = created.body.plan.selectedPieceIds[0];

    const approved = await request(app)
      .post(`/api/loads/${id}/approve`)
      .set('X-User-Id', 'user-mira')
      .send({ expectedVersion: created.body.version });
    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe('approved');

    const reservedPiece = await request(app).get(`/api/pieces/${selectedPieceId}`);
    expect(reservedPiece.body.status).toBe('in-load');

    const started = await request(app)
      .post(`/api/loads/${id}/start`)
      .set('X-User-Id', 'user-tuan')
      .send({ expectedVersion: approved.body.version });
    expect(started.status).toBe(200);
    expect(started.body.status).toBe('firing');

    const completed = await request(app)
      .post(`/api/loads/${id}/complete`)
      .set('X-User-Id', 'user-tuan')
      .send({ expectedVersion: started.body.version });
    expect(completed.status).toBe(200);
    expect(completed.body.status).toBe('completed');

    const firedPiece = await request(app).get(`/api/pieces/${selectedPieceId}`);
    expect(firedPiece.body.status).toBe('fired');
  });
});
