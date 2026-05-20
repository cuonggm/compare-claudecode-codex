import express, { type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";
import { analyzeSensorReadings, parseSensorCsv } from "../shared/sensor.js";
import { planKilnLoad } from "../shared/planner.js";
import type { FiringType, TargetCone } from "../shared/domain.js";
import { attachUser, currentUser, requireAnyRole, requireManager } from "./auth.js";
import type { Db } from "./db/sqlite.js";
import { HttpError, forbidden } from "./errors.js";
import { corsMiddleware, parseAllowedOrigins, rateLimit, requestLogger, securityHeaders } from "./security.js";
import {
  addLoadNote,
  createDraftLoadFromPlan,
  createPiece,
  dashboardSummary,
  getKiln,
  getLoad,
  getLoadDetail,
  getPiece,
  insertSensorReadingsWithAlerts,
  listKilns,
  listLoads,
  listPieces,
  listSensorReadings,
  listUsers,
  replaceLoadPlan,
  updateLoadStatus,
  updatePiece
} from "./repository.js";
import { csvImportSchema, expectedVersionSchema, noteSchema, pieceInputSchema, planLoadSchema, scheduleSchema } from "./validation.js";

export type CreateAppOptions = {
  allowedOrigins?: string[];
  rateLimit?: { windowMs: number; max: number };
  isProd?: boolean;
};

export function createApp(db: Db, options: CreateAppOptions = {}): express.Express {
  const app = express();
  const isProd = options.isProd ?? process.env.NODE_ENV === "production";
  const origins = options.allowedOrigins ?? parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
  const limit = options.rateLimit ?? { windowMs: 60_000, max: 240 };

  app.disable("x-powered-by");
  app.set("trust proxy", "loopback");

  app.use(securityHeaders());
  app.use(corsMiddleware(origins));
  app.use(rateLimit(limit));
  app.use(express.json({ limit: "256kb", strict: true }));
  app.use(requestLogger(isProd));
  app.use(attachUser(db));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  app.get("/api/users", (_req, res) => {
    res.json({ users: listUsers(db) });
  });

  app.get("/api/dashboard", (_req, res) => {
    res.json(dashboardSummary(db));
  });

  app.get("/api/kilns", (_req, res) => {
    res.json({ kilns: listKilns(db) });
  });

  app.get("/api/pieces", (req, res, next) => {
    try {
      const user = currentUser(req);
      if (user.role === "observer") throw forbidden("Vai trò quan sát chỉ được xem tổng quan và lịch nung.");

      const ownerId = user.role === "member" ? user.id : optionalNumber(req.query.ownerId);
      const pieces = listPieces(db, {
        ownerId,
        cone: optionalString(req.query.cone) as TargetCone | undefined,
        firingType: optionalString(req.query.firingType) as FiringType | undefined,
        blockedReason: optionalString(req.query.blockedReason),
        dueDate: optionalString(req.query.dueDate),
        status: optionalString(req.query.status)
      });

      res.json({ pieces });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/pieces", (req, res, next) => {
    try {
      const user = currentUser(req);
      if (user.role === "observer") throw forbidden();

      const input = pieceInputSchema.parse(req.body);
      if (user.role === "member" && input.ownerId !== user.id) {
        throw forbidden("Thành viên chỉ được tạo món của chính mình.");
      }

      res.status(201).json({ piece: createPiece(db, input) });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/pieces/:id", (req, res, next) => {
    try {
      const user = currentUser(req);
      if (user.role === "observer") throw forbidden();

      const id = Number(req.params.id);
      const existing = getPiece(db, id);
      if (user.role === "member" && existing.ownerId !== user.id) {
        throw forbidden("Thành viên chỉ được sửa món của chính mình.");
      }

      const input = pieceInputSchema.partial().parse(req.body);
      if (user.role === "member" && input.ownerId && input.ownerId !== user.id) {
        throw forbidden("Thành viên không được chuyển món sang chủ khác.");
      }

      res.json({ piece: updatePiece(db, id, input) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/loads", (_req, res) => {
    res.json({ loads: listLoads(db) });
  });

  app.post("/api/loads/plan", requireAnyRole("technician", "manager"), (req, res, next) => {
    try {
      const user = currentUser(req);
      const input = planLoadSchema.parse(req.body);
      const kiln = getKiln(db, input.kilnId);
      const candidatePieces = listPieces(db);
      const plan = planKilnLoad({
        kiln,
        targetCone: input.targetCone,
        firingType: input.firingType,
        candidatePieces,
        dueDatePriority: input.dueDatePriority
      });
      const load = createDraftLoadFromPlan(db, {
        kilnId: kiln.id,
        targetCone: input.targetCone,
        firingType: input.firingType,
        createdBy: user.id,
        plan
      });

      res.status(201).json({ load, plan, detail: getLoadDetail(db, load.id) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/loads/:id", (req, res, next) => {
    try {
      res.json(getLoadDetail(db, Number(req.params.id)));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/loads/:id/regenerate", requireAnyRole("technician", "manager"), (req, res, next) => {
    try {
      const user = currentUser(req);
      const loadId = Number(req.params.id);
      const { expectedVersion } = expectedVersionSchema.parse(req.body);
      const load = getLoad(db, loadId);
      const kiln = getKiln(db, load.kilnId);
      const plan = planKilnLoad({
        kiln,
        targetCone: load.targetCone,
        firingType: load.firingType,
        candidatePieces: listPieces(db),
        dueDatePriority: true
      });
      replaceLoadPlan(db, loadId, expectedVersion, user.id, plan);
      res.json({ detail: getLoadDetail(db, loadId), plan });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/loads/:id/notes", requireAnyRole("technician", "manager"), (req, res, next) => {
    try {
      const user = currentUser(req);
      const { expectedVersion, note } = noteSchema.parse(req.body);
      const load = addLoadNote(db, Number(req.params.id), expectedVersion, user.id, note);
      res.json({ load, detail: getLoadDetail(db, load.id) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/loads/:id/approve", requireManager, (req, res, next) => {
    try {
      const user = currentUser(req);
      const { expectedVersion } = expectedVersionSchema.parse(req.body);
      const load = updateLoadStatus(db, {
        loadId: Number(req.params.id),
        expectedVersion,
        userId: user.id,
        status: "approved"
      });
      res.json({ load, detail: getLoadDetail(db, load.id) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/loads/:id/schedule", requireManager, (req, res, next) => {
    try {
      const user = currentUser(req);
      const input = scheduleSchema.parse(req.body);
      const load = updateLoadStatus(db, {
        loadId: Number(req.params.id),
        expectedVersion: input.expectedVersion,
        userId: user.id,
        status: "scheduled",
        scheduledStart: input.scheduledStart,
        scheduledEnd: input.scheduledEnd
      });
      res.json({ load, detail: getLoadDetail(db, load.id) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/loads/:id/cancel", requireManager, (req, res, next) => {
    try {
      const user = currentUser(req);
      const { expectedVersion } = expectedVersionSchema.parse(req.body);
      const load = updateLoadStatus(db, {
        loadId: Number(req.params.id),
        expectedVersion,
        userId: user.id,
        status: "cancelled"
      });
      res.json({ load, detail: getLoadDetail(db, load.id) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/loads/:id/sensor-csv", requireAnyRole("technician", "manager"), (req, res, next) => {
    try {
      const loadId = Number(req.params.id);
      const load = getLoad(db, loadId);
      const { csv } = csvImportSchema.parse(req.body);
      const readings = parseSensorCsv(csv);
      const alerts = analyzeSensorReadings(loadId, readings, load.status).map((alert) => ({
        ...alert,
        loadId,
        pieceId: null
      }));
      const result = insertSensorReadingsWithAlerts(db, loadId, readings, alerts);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/loads/:id/sensor", (req, res, next) => {
    try {
      res.json({ readings: listSensorReadings(db, Number(req.params.id)) });
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        code: "VALIDATION_ERROR",
        message: "Dữ liệu gửi lên chưa hợp lệ.",
        issues: isProd ? undefined : error.issues
      });
      return;
    }

    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ code: error.code, message: error.message });
      return;
    }

    if (error instanceof SyntaxError && "body" in error) {
      res.status(400).json({ code: "VALIDATION_ERROR", message: "JSON gửi lên không hợp lệ." });
      return;
    }

    const errId = `e_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    console.error(`[${errId}] ${req.method} ${req.path}`, error);
    res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "Lỗi máy chủ ngoài dự kiến.",
      errorId: errId
    });
  });

  return app;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
