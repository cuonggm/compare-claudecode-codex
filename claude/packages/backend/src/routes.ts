import { randomUUID } from 'node:crypto';
import express, { type Request, type Response, type Router } from 'express';
import type { z, ZodTypeAny } from 'zod';
import type {
  Alert,
  DashboardSummary,
  KilnLoad,
  LoadNote,
  Piece,
  SensorReading,
} from '@kilnflow/shared';

import { requireRole, requireUser } from './auth.js';
import { planLoad } from './planner.js';
import { Repo } from './repo.js';
import {
  csvImportSchema,
  loadActionSchema,
  noteSchema,
  pieceInputSchema,
  planRequestSchema,
  scheduleSchema,
} from './schemas.js';
import { analyzeReadings, CsvParseError, parseSensorCsv } from './sensor.js';

function parse<S extends ZodTypeAny>(schema: S, body: unknown, res: Response): z.infer<S> | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    res.status(400).json({
      error: 'Dữ liệu không hợp lệ',
      issues: result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    });
    return null;
  }
  return result.data as z.infer<S>;
}

export function createRoutes(repo: Repo): Router {
  const r: Router = express.Router();

  // ------- Users (mock auth bootstrap) -------
  r.get('/users', (_req, res) => {
    res.json(repo.listUsers());
  });

  r.get('/me', requireUser, (req, res) => {
    res.json(req.user);
  });

  // ------- Kilns -------
  r.get('/kilns', (_req, res) => {
    res.json(repo.listKilns());
  });

  // ------- Pieces -------
  r.get('/pieces', (req, res) => {
    const pieces = repo.listPieces({
      ownerId: typeof req.query.ownerId === 'string' ? req.query.ownerId : undefined,
      cone: typeof req.query.cone === 'string' ? req.query.cone : undefined,
      firingType: typeof req.query.firingType === 'string' ? req.query.firingType : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      dueBefore: typeof req.query.dueBefore === 'string' ? req.query.dueBefore : undefined,
    });
    res.json(pieces);
  });

  r.get('/pieces/:id', (req, res) => {
    const p = repo.getPiece(req.params.id);
    if (!p) {
      res.status(404).json({ error: 'Không tìm thấy món.' });
      return;
    }
    res.json(p);
  });

  r.post('/pieces', requireUser, (req, res) => {
    const data = parse(pieceInputSchema, req.body, res);
    if (!data) return;
    const user = req.user!;
    // Members can only create pieces for themselves.
    if (user.role === 'member' && data.ownerId !== user.id) {
      res.status(403).json({ error: 'Thành viên chỉ được đăng ký món của chính mình.' });
      return;
    }
    if (user.role === 'observer') {
      res.status(403).json({ error: 'Người xem không thể tạo món.' });
      return;
    }
    if (!repo.getUser(data.ownerId)) {
      res.status(400).json({ error: 'Không tìm thấy chủ sở hữu.' });
      return;
    }
    const now = new Date().toISOString();
    const piece: Piece = {
      id: randomUUID(),
      ownerId: data.ownerId,
      name: data.name,
      clayBody: data.clayBody as Piece['clayBody'],
      glazeFamily: data.glazeFamily as Piece['glazeFamily'],
      targetCone: data.targetCone as Piece['targetCone'],
      firingType: data.firingType as Piece['firingType'],
      widthCm: data.widthCm,
      depthCm: data.depthCm,
      heightCm: data.heightCm,
      weightKg: data.weightKg,
      drynessPercent: data.drynessPercent,
      dueDate: new Date(data.dueDate).toISOString(),
      notes: data.notes,
      status: data.status as Piece['status'],
      createdAt: now,
      updatedAt: now,
    };
    repo.insertPiece(piece);
    res.status(201).json(piece);
  });

  r.put('/pieces/:id', requireUser, (req, res) => {
    const existing = repo.getPiece(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Không tìm thấy món.' });
      return;
    }
    const user = req.user!;
    if (user.role === 'observer') {
      res.status(403).json({ error: 'Người xem không thể chỉnh sửa món.' });
      return;
    }
    if (user.role === 'member' && existing.ownerId !== user.id) {
      res.status(403).json({ error: 'Thành viên chỉ được chỉnh sửa món của chính mình.' });
      return;
    }
    const data = parse(pieceInputSchema, req.body, res);
    if (!data) return;
    const updated: Piece = {
      ...existing,
      ownerId: data.ownerId,
      name: data.name,
      clayBody: data.clayBody as Piece['clayBody'],
      glazeFamily: data.glazeFamily as Piece['glazeFamily'],
      targetCone: data.targetCone as Piece['targetCone'],
      firingType: data.firingType as Piece['firingType'],
      widthCm: data.widthCm,
      depthCm: data.depthCm,
      heightCm: data.heightCm,
      weightKg: data.weightKg,
      drynessPercent: data.drynessPercent,
      dueDate: new Date(data.dueDate).toISOString(),
      notes: data.notes,
      status: data.status as Piece['status'],
      updatedAt: new Date().toISOString(),
    };
    repo.updatePiece(updated);
    res.json(updated);
  });

  r.delete('/pieces/:id', requireUser, (req, res) => {
    const existing = repo.getPiece(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Không tìm thấy món.' });
      return;
    }
    const user = req.user!;
    if (user.role === 'observer') {
      res.status(403).json({ error: 'Người xem không thể xóa món.' });
      return;
    }
    if (user.role === 'member' && existing.ownerId !== user.id) {
      res.status(403).json({ error: 'Thành viên chỉ được xóa món của chính mình.' });
      return;
    }
    repo.deletePiece(req.params.id);
    res.status(204).end();
  });

  // ------- Loads + Planner -------
  r.get('/loads', (_req, res) => {
    res.json(repo.listLoads());
  });

  r.get('/loads/:id', (req, res) => {
    const l = repo.getLoad(req.params.id);
    if (!l) {
      res.status(404).json({ error: 'Không tìm thấy đợt nung.' });
      return;
    }
    res.json(l);
  });

  r.post('/loads/plan', requireRole('technician', 'manager'), (req, res) => {
    const data = parse(planRequestSchema, req.body, res);
    if (!data) return;
    const kiln = repo.getKiln(data.kilnId);
    if (!kiln) {
      res.status(404).json({ error: 'Không tìm thấy lò nung.' });
      return;
    }
    const candidates = data.candidatePieceIds && data.candidatePieceIds.length > 0
      ? (data.candidatePieceIds
          .map((id) => repo.getPiece(id))
          .filter((p): p is Piece => Boolean(p)))
      : repo.listPieces();
    const plan = planLoad({
      kiln,
      targetCone: data.targetCone as Piece['targetCone'],
      firingType: data.firingType as Piece['firingType'],
      candidatePieces: candidates,
      prioritizeDueDate: data.prioritizeDueDate,
    });
    res.json(plan);
  });

  r.post('/loads', requireRole('technician', 'manager'), (req, res) => {
    const data = parse(planRequestSchema, req.body, res);
    if (!data) return;
    const kiln = repo.getKiln(data.kilnId);
    if (!kiln) {
      res.status(404).json({ error: 'Không tìm thấy lò nung.' });
      return;
    }
    const candidates = data.candidatePieceIds && data.candidatePieceIds.length > 0
      ? (data.candidatePieceIds
          .map((id) => repo.getPiece(id))
          .filter((p): p is Piece => Boolean(p)))
      : repo.listPieces();
    const plan = planLoad({
      kiln,
      targetCone: data.targetCone as Piece['targetCone'],
      firingType: data.firingType as Piece['firingType'],
      candidatePieces: candidates,
      prioritizeDueDate: data.prioritizeDueDate,
    });
    const now = new Date().toISOString();
    const load: KilnLoad = {
      id: randomUUID(),
      kilnId: kiln.id,
      targetCone: plan.targetCone,
      firingType: plan.firingType,
      status: 'draft',
      version: 1,
      scheduledAt: null,
      plan,
      notes: [],
      createdAt: now,
      updatedAt: now,
    };
    repo.insertLoad(load);
    res.status(201).json(load);
  });

  // Regenerate the plan attached to an existing draft load. Bumps version.
  r.post('/loads/:id/regenerate', requireRole('technician', 'manager'), (req, res) => {
    const load = repo.getLoad(req.params.id);
    if (!load) {
      res.status(404).json({ error: 'Không tìm thấy đợt nung.' });
      return;
    }
    if (load.status !== 'draft') {
      res.status(409).json({ error: 'Chỉ có đợt nung ở trạng thái nháp mới có thể tạo lại kế hoạch.' });
      return;
    }
    const data = parse(loadActionSchema, req.body, res);
    if (!data) return;
    const kiln = repo.getKiln(load.kilnId);
    if (!kiln) {
      res.status(404).json({ error: 'Không tìm thấy lò nung.' });
      return;
    }
    const plan = planLoad({
      kiln,
      targetCone: load.targetCone,
      firingType: load.firingType,
      candidatePieces: repo.listPieces(),
    });
    const updated = repo.updateLoadWithVersionCheck(load.id, data.expectedVersion, {
      plan,
      updatedAt: new Date().toISOString(),
    });
    if ('conflict' in updated) {
      res.status(409).json({
        error: 'Phiên bản đã cũ.',
        current: updated.current,
      });
      return;
    }
    res.json(updated);
  });

  r.post('/loads/:id/approve', requireRole('manager'), (req, res) => {
    const load = repo.getLoad(req.params.id);
    if (!load) {
      res.status(404).json({ error: 'Không tìm thấy đợt nung.' });
      return;
    }
    if (load.status !== 'draft') {
      res.status(409).json({ error: `Đợt nung đang ở trạng thái ${load.status}, không thể duyệt.` });
      return;
    }
    const data = parse(loadActionSchema, req.body, res);
    if (!data) return;
    const updated = repo.updateLoadWithVersionCheck(load.id, data.expectedVersion, {
      status: 'approved',
      updatedAt: new Date().toISOString(),
    });
    if ('conflict' in updated) {
      res.status(409).json({ error: 'Phiên bản đã cũ.', current: updated.current });
      return;
    }
    res.json(updated);
  });

  r.post('/loads/:id/schedule', requireRole('manager'), (req, res) => {
    const load = repo.getLoad(req.params.id);
    if (!load) {
      res.status(404).json({ error: 'Không tìm thấy đợt nung.' });
      return;
    }
    if (!(load.status === 'approved' || load.status === 'draft')) {
      res.status(409).json({ error: `Đợt nung đang ở trạng thái ${load.status}, không thể lên lịch.` });
      return;
    }
    const data = parse(scheduleSchema, req.body, res);
    if (!data) return;
    const updated = repo.updateLoadWithVersionCheck(load.id, data.expectedVersion, {
      status: 'scheduled',
      scheduledAt: new Date(data.scheduledAt).toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if ('conflict' in updated) {
      res.status(409).json({ error: 'Phiên bản đã cũ.', current: updated.current });
      return;
    }
    res.json(updated);
  });

  r.post('/loads/:id/cancel', requireRole('manager'), (req, res) => {
    const load = repo.getLoad(req.params.id);
    if (!load) {
      res.status(404).json({ error: 'Không tìm thấy đợt nung.' });
      return;
    }
    if (load.status === 'cancelled' || load.status === 'completed') {
      res.status(409).json({ error: `Đợt nung đang ở trạng thái ${load.status}, không thể hủy.` });
      return;
    }
    const data = parse(loadActionSchema, req.body, res);
    if (!data) return;
    const updated = repo.updateLoadWithVersionCheck(load.id, data.expectedVersion, {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    });
    if ('conflict' in updated) {
      res.status(409).json({ error: 'Phiên bản đã cũ.', current: updated.current });
      return;
    }
    res.json(updated);
  });

  r.post('/loads/:id/notes', requireRole('technician', 'manager'), (req, res) => {
    const load = repo.getLoad(req.params.id);
    if (!load) {
      res.status(404).json({ error: 'Không tìm thấy đợt nung.' });
      return;
    }
    const data = parse(noteSchema, req.body, res);
    if (!data) return;
    const user = req.user!;
    const note: LoadNote = {
      id: randomUUID(),
      loadId: load.id,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      body: data.body,
      createdAt: new Date().toISOString(),
    };
    repo.insertLoadNote(note);
    res.status(201).json(note);
  });

  // ------- Sensors + alerts -------
  r.get('/loads/:id/sensors', (req, res) => {
    const load = repo.getLoad(req.params.id);
    if (!load) {
      res.status(404).json({ error: 'Không tìm thấy đợt nung.' });
      return;
    }
    res.json(repo.listSensorReadings(load.id));
  });

  r.get('/loads/:id/alerts', (req, res) => {
    const load = repo.getLoad(req.params.id);
    if (!load) {
      res.status(404).json({ error: 'Không tìm thấy đợt nung.' });
      return;
    }
    res.json(repo.listAlerts(load.id));
  });

  r.post('/loads/:id/sensors/import', requireRole('technician', 'manager'), (req, res) => {
    const load = repo.getLoad(req.params.id);
    if (!load) {
      res.status(404).json({ error: 'Không tìm thấy đợt nung.' });
      return;
    }
    const data = parse(csvImportSchema, req.body, res);
    if (!data) return;
    let parsed;
    try {
      parsed = parseSensorCsv(data.csv);
    } catch (err) {
      if (err instanceof CsvParseError) {
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }
    if (parsed.length === 0) {
      res.status(400).json({ error: 'Không đọc được dòng dữ liệu nào từ CSV.' });
      return;
    }
    const newReadings: SensorReading[] = parsed.map((p) => ({
      id: randomUUID(),
      loadId: load.id,
      timestamp: p.timestamp,
      tempC: p.tempC,
      targetTempC: p.targetTempC,
      note: p.note,
    }));
    repo.insertSensorReadings(newReadings);

    const existing = repo
      .listSensorReadings(load.id)
      .filter((r) => !newReadings.find((n) => n.id === r.id));
    const analyzed = analyzeReadings({
      existingReadings: existing,
      newReadings,
      loadStatus: load.status,
    });
    const now = new Date().toISOString();
    const alerts: Alert[] = analyzed.map((a) => ({
      id: randomUUID(),
      loadId: load.id,
      severity: a.severity,
      code: a.code,
      message: a.message,
      createdAt: now,
      acknowledged: 0,
    }));
    if (alerts.length > 0) {
      repo.insertAlerts(alerts);
    }
    res.status(201).json({
      readings: newReadings,
      alerts,
    });
  });

  // ------- Dashboard -------
  r.get('/dashboard', (_req, res) => {
    const kilns = repo.listKilns();
    const allPieces = repo.listPieces();
    const blocked = allPieces.filter((p) => p.status === 'blocked');
    const blockReasonBreakdown = aggregateBlockedReasons(allPieces);
    const loads = repo.listLoads();
    const upcoming = loads
      .filter((l) => l.status === 'approved' || l.status === 'scheduled' || l.status === 'draft')
      .slice(0, 10);
    const recentAlerts = repo.listAlerts(undefined, 10);
    const kilnNameById = new Map(kilns.map((k) => [k.id, k.name]));

    const summary: DashboardSummary = {
      waitingPieces: allPieces.filter((p) => p.status === 'ready' || p.status === 'draft').length,
      eligiblePieces: allPieces.filter((p) => p.status === 'ready').length,
      blockedPieces: blocked.length,
      blockReasonBreakdown,
      upcomingLoads: upcoming.map((l) => ({
        id: l.id,
        kilnId: l.kilnId,
        kilnName: kilnNameById.get(l.kilnId) ?? l.kilnId,
        status: l.status,
        scheduledAt: l.scheduledAt,
        targetCone: l.targetCone,
        firingType: l.firingType,
      })),
      recentAlerts,
      kilnCapacity: kilns.map((k) => {
        const pending = loads.filter(
          (l) => l.kilnId === k.id && (l.status === 'draft' || l.status === 'approved' || l.status === 'scheduled'),
        );
        return {
          kilnId: k.id,
          kilnName: k.name,
          pendingLoads: pending.length,
          capacityNote: `${k.shelfWidthCm}x${k.shelfDepthCm}cm × ${k.shelves} shelves, max ${k.maxWeightKg}kg`,
        };
      }),
    };
    res.json(summary);
  });

  return r;
}

function aggregateBlockedReasons(pieces: Piece[]) {
  const counts = new Map<string, number>();
  for (const p of pieces) {
    if (p.status !== 'blocked') continue;
    // Surface a friendly reason: unknown glaze / under-dry / wrong cone aren't
    // stored in piece state directly — we approximate by inspecting attributes.
    if (p.glazeFamily === 'unknown') {
      counts.set('unknown-glaze', (counts.get('unknown-glaze') ?? 0) + 1);
    } else if (p.drynessPercent < 80) {
      counts.set('under-dry', (counts.get('under-dry') ?? 0) + 1);
    } else {
      counts.set('other', (counts.get('other') ?? 0) + 1);
    }
  }
  return Array.from(counts.entries()).map(([reason, count]) => ({ reason, count }));
}
