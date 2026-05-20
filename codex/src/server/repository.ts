import { getPieceBlockReasons, type Alert, type FiringType, type Kiln, type Load, type LoadStatus, type Piece, type Role, type SensorReading, type TargetCone, type User } from "../shared/domain.js";
import type { PlannerExclusion, PlannerResult } from "../shared/planner.js";
import { mapAlert, mapKiln, mapLoad, mapPiece, mapSensorReading, mapUser, type Row } from "./db/mappers.js";
import { nowIso, type Db } from "./db/sqlite.js";
import { conflict, notFound } from "./errors.js";

export type PieceFilters = {
  ownerId?: number;
  cone?: TargetCone;
  firingType?: FiringType;
  blockedReason?: string;
  dueDate?: string;
  status?: string;
};

export type CreatePieceInput = Omit<Piece, "id" | "ownerName" | "status" | "createdAt" | "updatedAt"> & {
  status?: Piece["status"];
};

export type LoadDetail = {
  load: Load;
  kiln: Kiln;
  selectedPieces: Array<Piece & { shelfIndex: number; xCm: number; yCm: number; placedWidthCm: number; placedDepthCm: number }>;
  excludedPieces: Array<PlannerExclusion & { ownerName?: string }>;
  auditNotes: Array<{ id: number; userId: number; userName: string; note: string; createdAt: string }>;
  sensorReadings: SensorReading[];
  alerts: Alert[];
};

export function listUsers(db: Db): User[] {
  return (db.prepare("SELECT id, name, role FROM users ORDER BY id").all() as Row[]).map(mapUser);
}

export function getUser(db: Db, id: number): User | null {
  const row = db.prepare("SELECT id, name, role FROM users WHERE id = ?").get(id) as Row | undefined;
  return row ? mapUser(row) : null;
}

export function getGuestUser(db: Db): User {
  const row = db.prepare("SELECT id, name, role FROM users WHERE role = 'observer' ORDER BY id LIMIT 1").get() as Row | undefined;
  if (!row) throw notFound("Thiếu tài khoản Guest quan sát.");
  return mapUser(row);
}

export function listKilns(db: Db): Kiln[] {
  return (db.prepare("SELECT * FROM kilns ORDER BY id").all() as Row[]).map(mapKiln);
}

export function getKiln(db: Db, id: number): Kiln {
  const row = db.prepare("SELECT * FROM kilns WHERE id = ?").get(id) as Row | undefined;
  if (!row) throw notFound("Không tìm thấy lò nung.");
  return mapKiln(row);
}

export function listPieces(db: Db, filters: PieceFilters = {}): Piece[] {
  const clauses: string[] = [];
  const values: Array<string | number> = [];

  if (filters.ownerId) {
    clauses.push("p.owner_id = ?");
    values.push(filters.ownerId);
  }
  if (filters.cone) {
    clauses.push("p.target_cone = ?");
    values.push(filters.cone);
  }
  if (filters.firingType) {
    clauses.push("p.firing_type = ?");
    values.push(filters.firingType);
  }
  if (filters.status) {
    clauses.push("p.status = ?");
    values.push(filters.status);
  }
  if (filters.dueDate) {
    clauses.push("p.due_date <= ?");
    values.push(filters.dueDate);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const pieces = (db.prepare(`
    SELECT p.*, u.name AS owner_name
    FROM pieces p
    JOIN users u ON u.id = p.owner_id
    ${where}
    ORDER BY p.due_date ASC, p.created_at ASC
  `).all(...values) as Row[]).map(mapPiece);

  if (!filters.blockedReason) return pieces;

  return pieces.filter((piece) => getPieceBlockReasons(piece).some((reason) => reason.code === filters.blockedReason));
}

export function getPiece(db: Db, id: number): Piece {
  const row = db.prepare(`
    SELECT p.*, u.name AS owner_name
    FROM pieces p
    JOIN users u ON u.id = p.owner_id
    WHERE p.id = ?
  `).get(id) as Row | undefined;
  if (!row) throw notFound("Không tìm thấy món.");
  return mapPiece(row);
}

export function createPiece(db: Db, input: CreatePieceInput): Piece {
  const timestamp = nowIso();
  const status = input.status ?? inferPieceStatus(input);
  const result = db.prepare(`
    INSERT INTO pieces (
      owner_id, name, clay_body, glaze_family, target_cone, firing_type,
      width_cm, depth_cm, height_cm, weight_kg, dryness_percent, due_date,
      notes, status, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.ownerId,
    input.name,
    input.clayBody,
    input.glazeFamily,
    input.targetCone,
    input.firingType,
    input.widthCm,
    input.depthCm,
    input.heightCm,
    input.weightKg,
    input.drynessPercent,
    input.dueDate,
    input.notes,
    status,
    timestamp,
    timestamp
  );

  return getPiece(db, Number(result.lastInsertRowid));
}

export function updatePiece(db: Db, id: number, input: Partial<CreatePieceInput>): Piece {
  const current = getPiece(db, id);
  const next = {
    ...current,
    ...input
  };
  const status = input.status ?? inferPieceStatus(next);
  const timestamp = nowIso();

  db.prepare(`
    UPDATE pieces
    SET owner_id = ?, name = ?, clay_body = ?, glaze_family = ?, target_cone = ?, firing_type = ?,
        width_cm = ?, depth_cm = ?, height_cm = ?, weight_kg = ?, dryness_percent = ?,
        due_date = ?, notes = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(
    next.ownerId,
    next.name,
    next.clayBody,
    next.glazeFamily,
    next.targetCone,
    next.firingType,
    next.widthCm,
    next.depthCm,
    next.heightCm,
    next.weightKg,
    next.drynessPercent,
    next.dueDate,
    next.notes,
    status,
    timestamp,
    id
  );

  return getPiece(db, id);
}

export function createDraftLoadFromPlan(db: Db, input: { kilnId: number; targetCone: TargetCone; firingType: FiringType; createdBy: number; plan: PlannerResult }): Load {
  const timestamp = nowIso();
  let loadId = 0;
  runInTransaction(db, () => {
    db.prepare(`
      INSERT INTO loads (kiln_id, target_cone, firing_type, status, version, scheduled_start, scheduled_end, created_by, approved_by, created_at, updated_at)
      VALUES (?, ?, ?, 'draft', 1, NULL, NULL, ?, NULL, ?, ?)
    `).run(input.kilnId, input.targetCone, input.firingType, input.createdBy, timestamp, timestamp);

    loadId = Number((db.prepare("SELECT last_insert_rowid() AS id").get() as { id: number }).id);
    writePlanRows(db, loadId, input.plan);
    db.prepare("INSERT INTO audit_notes (load_id, user_id, note, created_at) VALUES (?, ?, ?, ?)")
      .run(loadId, input.createdBy, `Đã tạo mẻ nháp với ${input.plan.selectedPieces.length} món được chọn.`, timestamp);
  });

  return getLoad(db, loadId);
}

export function listLoads(db: Db): Load[] {
  return (db.prepare(`
    SELECT l.*, k.name AS kiln_name
    FROM loads l
    JOIN kilns k ON k.id = l.kiln_id
    ORDER BY COALESCE(l.scheduled_start, l.created_at) DESC
  `).all() as Row[]).map(mapLoad);
}

export function getLoad(db: Db, id: number): Load {
  const row = db.prepare(`
    SELECT l.*, k.name AS kiln_name
    FROM loads l
    JOIN kilns k ON k.id = l.kiln_id
    WHERE l.id = ?
  `).get(id) as Row | undefined;
  if (!row) throw notFound("Không tìm thấy mẻ nung.");
  return mapLoad(row);
}

export function getLoadDetail(db: Db, id: number): LoadDetail {
  const load = getLoad(db, id);
  const kiln = getKiln(db, load.kilnId);
  const selectedPieces = (db.prepare(`
    SELECT p.*, u.name AS owner_name, lp.shelf_index, lp.x_cm, lp.y_cm, lp.width_cm AS placed_width_cm, lp.depth_cm AS placed_depth_cm
    FROM load_pieces lp
    JOIN pieces p ON p.id = lp.piece_id
    JOIN users u ON u.id = p.owner_id
    WHERE lp.load_id = ?
    ORDER BY lp.shelf_index, lp.y_cm, lp.x_cm
  `).all(id) as Row[]).map((row) => ({
    ...mapPiece(row),
    shelfIndex: Number(row.shelf_index),
    xCm: Number(row.x_cm),
    yCm: Number(row.y_cm),
    placedWidthCm: Number(row.placed_width_cm),
    placedDepthCm: Number(row.placed_depth_cm)
  }));

  const excludedPieces = (db.prepare(`
    SELECT le.piece_id, p.name AS piece_name, u.name AS owner_name, le.reason_code, le.reason_message
    FROM load_exclusions le
    JOIN pieces p ON p.id = le.piece_id
    JOIN users u ON u.id = p.owner_id
    WHERE le.load_id = ?
    ORDER BY le.id ASC
  `).all(id) as Row[]).map((row) => ({
    pieceId: Number(row.piece_id),
    pieceName: String(row.piece_name),
    ownerName: String(row.owner_name),
    reasonCode: String(row.reason_code),
    message: String(row.reason_message)
  }));

  const auditNotes = (db.prepare(`
    SELECT an.id, an.user_id, u.name AS user_name, an.note, an.created_at
    FROM audit_notes an
    JOIN users u ON u.id = an.user_id
    WHERE an.load_id = ?
    ORDER BY an.created_at DESC
  `).all(id) as Row[]).map((row) => ({
    id: Number(row.id),
    userId: Number(row.user_id),
    userName: String(row.user_name),
    note: String(row.note),
    createdAt: String(row.created_at)
  }));

  return {
    load,
    kiln,
    selectedPieces,
    excludedPieces,
    auditNotes,
    sensorReadings: listSensorReadings(db, id),
    alerts: listAlerts(db, { loadId: id, limit: 20 })
  };
}

export function replaceLoadPlan(db: Db, loadId: number, expectedVersion: number, userId: number, plan: PlannerResult): Load {
  const current = getLoad(db, loadId);
  if (current.version !== expectedVersion) {
    throw conflict();
  }
  if (current.status !== "draft") {
    throw conflict("Chỉ mẻ nháp mới có thể tạo lại kế hoạch.");
  }

  const timestamp = nowIso();
  runInTransaction(db, () => {
    db.prepare("DELETE FROM load_pieces WHERE load_id = ?").run(loadId);
    db.prepare("DELETE FROM load_exclusions WHERE load_id = ?").run(loadId);
    writePlanRows(db, loadId, plan);
    db.prepare("UPDATE loads SET version = version + 1, updated_at = ? WHERE id = ?").run(timestamp, loadId);
    db.prepare("INSERT INTO audit_notes (load_id, user_id, note, created_at) VALUES (?, ?, ?, ?)")
      .run(loadId, userId, `Đã tạo lại mẻ nháp với ${plan.selectedPieces.length} món được chọn.`, timestamp);
  });

  return getLoad(db, loadId);
}

export function addLoadNote(db: Db, loadId: number, expectedVersion: number, userId: number, note: string): Load {
  assertExpectedVersion(db, loadId, expectedVersion);
  const timestamp = nowIso();
  runInTransaction(db, () => {
    db.prepare("INSERT INTO audit_notes (load_id, user_id, note, created_at) VALUES (?, ?, ?, ?)")
      .run(loadId, userId, note, timestamp);
    db.prepare("UPDATE loads SET version = version + 1, updated_at = ? WHERE id = ?").run(timestamp, loadId);
  });
  return getLoad(db, loadId);
}

const ALLOWED_LOAD_TRANSITIONS: Record<LoadStatus, LoadStatus[]> = {
  draft: ["approved", "cancelled"],
  approved: ["scheduled", "cancelled"],
  scheduled: ["firing", "cancelled"],
  firing: ["completed", "cancelled"],
  completed: [],
  cancelled: []
};

export function updateLoadStatus(
  db: Db,
  input: { loadId: number; expectedVersion: number; userId: number; status: LoadStatus; scheduledStart?: string | null; scheduledEnd?: string | null }
): Load {
  const current = getLoad(db, input.loadId);
  if (current.version !== input.expectedVersion) {
    throw conflict();
  }

  if (!ALLOWED_LOAD_TRANSITIONS[current.status].includes(input.status)) {
    throw conflict(`Không thể chuyển mẻ từ trạng thái ${current.status} sang ${input.status}.`);
  }

  const timestamp = nowIso();
  const approvedBy = input.status === "approved" ? input.userId : current.approvedBy;
  const scheduledStart = input.scheduledStart === undefined ? current.scheduledStart : input.scheduledStart;
  const scheduledEnd = input.scheduledEnd === undefined ? current.scheduledEnd : input.scheduledEnd;

  db.prepare(`
    UPDATE loads
    SET status = ?, version = version + 1, scheduled_start = ?, scheduled_end = ?, approved_by = ?, updated_at = ?
    WHERE id = ? AND version = ?
  `).run(input.status, scheduledStart, scheduledEnd, approvedBy, timestamp, input.loadId, input.expectedVersion);

  db.prepare("INSERT INTO audit_notes (load_id, user_id, note, created_at) VALUES (?, ?, ?, ?)")
    .run(input.loadId, input.userId, `Trạng thái mẻ đổi thành ${formatLoadStatusForNote(input.status)}.`, timestamp);

  return getLoad(db, input.loadId);
}

export function listAlerts(db: Db, options: { loadId?: number; limit?: number } = {}): Alert[] {
  const limit = options.limit ?? 10;
  const rows = options.loadId
    ? db.prepare("SELECT * FROM alerts WHERE load_id = ? ORDER BY created_at DESC, id DESC LIMIT ?").all(options.loadId, limit)
    : db.prepare("SELECT * FROM alerts ORDER BY created_at DESC, id DESC LIMIT ?").all(limit);
  return (rows as Row[]).map(mapAlert);
}

export function listSensorReadings(db: Db, loadId: number): SensorReading[] {
  return (db.prepare("SELECT * FROM sensor_readings WHERE load_id = ? ORDER BY timestamp ASC").all(loadId) as Row[]).map(mapSensorReading);
}

export function insertSensorReadingsWithAlerts(db: Db, loadId: number, readings: SensorReading[], alerts: Array<Omit<Alert, "id" | "createdAt">>): { readings: SensorReading[]; alerts: Alert[] } {
  const timestamp = nowIso();
  runInTransaction(db, () => {
    const insertReading = db.prepare("INSERT INTO sensor_readings (load_id, timestamp, temp_c, target_temp_c, note) VALUES (?, ?, ?, ?, ?)");
    for (const reading of readings) {
      insertReading.run(loadId, reading.timestamp, reading.tempC, reading.targetTempC, reading.note);
    }

    const insertAlert = db.prepare("INSERT INTO alerts (load_id, piece_id, type, severity, message, created_at) VALUES (?, ?, ?, ?, ?, ?)");
    for (const alert of alerts) {
      insertAlert.run(alert.loadId, alert.pieceId ?? null, alert.type, alert.severity, alert.message, timestamp);
    }
  });

  return {
    readings: listSensorReadings(db, loadId),
    alerts: listAlerts(db, { loadId, limit: 50 })
  };
}

export function dashboardSummary(db: Db): {
  pendingPieces: number;
  readyPieces: number;
  blockedPieces: number;
  blockedReasonCounts: Array<{ code: string; message: string; count: number }>;
  upcomingLoads: Load[];
  recentAlerts: Alert[];
  kilnCapacity: Array<{ kiln: Kiln; activeLoads: number; scheduledLoads: number; maxWeightKg: number; shelfAreaCm2: number }>;
} {
  const pieces = listPieces(db);
  const reasonCounts = new Map<string, { code: string; message: string; count: number }>();
  for (const piece of pieces) {
    for (const reason of getPieceBlockReasons(piece)) {
      const current = reasonCounts.get(reason.code);
      if (current) {
        current.count += 1;
      } else {
        reasonCounts.set(reason.code, { ...reason, count: 1 });
      }
    }
  }

  const loads = listLoads(db);
  const upcomingStatuses = new Set<LoadStatus>(["approved", "scheduled", "firing"]);
  const kilns = listKilns(db);

  return {
    pendingPieces: pieces.filter((piece) => piece.status === "ready" || piece.status === "blocked").length,
    readyPieces: pieces.filter((piece) => piece.status === "ready" && getPieceBlockReasons(piece).length === 0).length,
    blockedPieces: pieces.filter((piece) => getPieceBlockReasons(piece).length > 0 || piece.status === "blocked").length,
    blockedReasonCounts: [...reasonCounts.values()].sort((a, b) => b.count - a.count),
    upcomingLoads: loads.filter((load) => upcomingStatuses.has(load.status)).slice(0, 5),
    recentAlerts: listAlerts(db, { limit: 8 }),
    kilnCapacity: kilns.map((kiln) => {
      const kilnLoads = loads.filter((load) => load.kilnId === kiln.id);
      return {
        kiln,
        activeLoads: kilnLoads.filter((load) => load.status === "firing").length,
        scheduledLoads: kilnLoads.filter((load) => load.status === "scheduled" || load.status === "approved").length,
        maxWeightKg: kiln.maxWeightKg,
        shelfAreaCm2: kiln.shelfWidthCm * kiln.shelfDepthCm * kiln.shelfCount
      };
    })
  };
}

export function roleCanManageLoads(role: Role): boolean {
  return role === "technician" || role === "manager";
}

function writePlanRows(db: Db, loadId: number, plan: PlannerResult): void {
  const insertPiece = db.prepare(`
    INSERT INTO load_pieces (load_id, piece_id, shelf_index, x_cm, y_cm, width_cm, depth_cm)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const assignment of plan.shelfAssignments) {
    insertPiece.run(loadId, assignment.pieceId, assignment.shelfIndex, assignment.xCm, assignment.yCm, assignment.widthCm, assignment.depthCm);
  }

  const insertExclusion = db.prepare(`
    INSERT INTO load_exclusions (load_id, piece_id, reason_code, reason_message)
    VALUES (?, ?, ?, ?)
  `);
  for (const exclusion of plan.excludedPieces) {
    insertExclusion.run(loadId, exclusion.pieceId, exclusion.reasonCode, exclusion.message);
  }
}

function inferPieceStatus(piece: Pick<Piece, "drynessPercent" | "glazeFamily" | "targetCone" | "firingType" | "clayBody" | "heightCm">): Piece["status"] {
  return getPieceBlockReasons(piece).length > 0 ? "blocked" : "ready";
}

function assertExpectedVersion(db: Db, loadId: number, expectedVersion: number): void {
  const load = getLoad(db, loadId);
  if (load.version !== expectedVersion) {
    throw conflict();
  }
}

function runInTransaction(db: Db, callback: () => void): void {
  db.exec("BEGIN");
  try {
    callback();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function formatLoadStatusForNote(status: LoadStatus): string {
  const labels: Record<LoadStatus, string> = {
    draft: "nháp",
    approved: "đã duyệt",
    scheduled: "đã lên lịch",
    firing: "đang nung",
    completed: "hoàn tất",
    cancelled: "đã hủy"
  };
  return labels[status];
}
