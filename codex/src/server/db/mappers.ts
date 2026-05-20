import type { Alert, Kiln, Load, Piece, SensorReading, User } from "../../shared/domain.js";

export type Row = Record<string, unknown>;

export function mapUser(row: Row): User {
  return {
    id: numberValue(row.id),
    name: stringValue(row.name),
    role: stringValue(row.role) as User["role"]
  };
}

export function mapKiln(row: Row): Kiln {
  return {
    id: numberValue(row.id),
    name: stringValue(row.name),
    shelfWidthCm: numberValue(row.shelf_width_cm),
    shelfDepthCm: numberValue(row.shelf_depth_cm),
    shelfCount: numberValue(row.shelf_count),
    maxWeightKg: numberValue(row.max_weight_kg),
    maxHeightPerShelfCm: numberValue(row.max_height_per_shelf_cm)
  };
}

export function mapPiece(row: Row): Piece {
  return {
    id: numberValue(row.id),
    ownerId: numberValue(row.owner_id),
    ownerName: optionalString(row.owner_name),
    name: stringValue(row.name),
    clayBody: stringValue(row.clay_body) as Piece["clayBody"],
    glazeFamily: stringValue(row.glaze_family) as Piece["glazeFamily"],
    targetCone: stringValue(row.target_cone) as Piece["targetCone"],
    firingType: stringValue(row.firing_type) as Piece["firingType"],
    widthCm: numberValue(row.width_cm),
    depthCm: numberValue(row.depth_cm),
    heightCm: numberValue(row.height_cm),
    weightKg: numberValue(row.weight_kg),
    drynessPercent: numberValue(row.dryness_percent),
    dueDate: stringValue(row.due_date),
    notes: stringValue(row.notes),
    status: stringValue(row.status) as Piece["status"],
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at)
  };
}

export function mapLoad(row: Row): Load {
  return {
    id: numberValue(row.id),
    kilnId: numberValue(row.kiln_id),
    kilnName: optionalString(row.kiln_name),
    targetCone: stringValue(row.target_cone) as Load["targetCone"],
    firingType: stringValue(row.firing_type) as Load["firingType"],
    status: stringValue(row.status) as Load["status"],
    version: numberValue(row.version),
    scheduledStart: nullableString(row.scheduled_start),
    scheduledEnd: nullableString(row.scheduled_end),
    createdBy: numberValue(row.created_by),
    approvedBy: nullableNumber(row.approved_by),
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at)
  };
}

export function mapSensorReading(row: Row): SensorReading {
  return {
    id: numberValue(row.id),
    loadId: numberValue(row.load_id),
    timestamp: stringValue(row.timestamp),
    tempC: numberValue(row.temp_c),
    targetTempC: numberValue(row.target_temp_c),
    note: stringValue(row.note)
  };
}

export function mapAlert(row: Row): Alert {
  return {
    id: numberValue(row.id),
    loadId: nullableNumber(row.load_id),
    pieceId: nullableNumber(row.piece_id),
    type: stringValue(row.type),
    severity: stringValue(row.severity) as Alert["severity"],
    message: stringValue(row.message),
    createdAt: stringValue(row.created_at)
  };
}

function stringValue(value: unknown): string {
  if (typeof value === "string") return value;
  return String(value ?? "");
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown): number {
  return Number(value);
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}
