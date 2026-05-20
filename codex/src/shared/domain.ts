export const roles = ["member", "technician", "manager", "observer"] as const;
export type Role = (typeof roles)[number];

export const clayBodies = ["stoneware", "porcelain", "earthenware", "wild-clay"] as const;
export type ClayBody = (typeof clayBodies)[number];

export const glazeFamilies = ["clear", "celadon", "shino", "crawl", "soda-sensitive", "unknown"] as const;
export type GlazeFamily = (typeof glazeFamilies)[number];

export const targetCones = ["04", "6", "10"] as const;
export type TargetCone = (typeof targetCones)[number];

export const firingTypes = ["bisque", "oxidation", "reduction", "raku"] as const;
export type FiringType = (typeof firingTypes)[number];

export const pieceStatuses = ["draft", "ready", "blocked", "planned", "loaded", "fired"] as const;
export type PieceStatus = (typeof pieceStatuses)[number];

export const loadStatuses = ["draft", "approved", "scheduled", "firing", "completed", "cancelled"] as const;
export type LoadStatus = (typeof loadStatuses)[number];

export type User = {
  id: number;
  name: string;
  role: Role;
};

export type Kiln = {
  id: number;
  name: string;
  shelfWidthCm: number;
  shelfDepthCm: number;
  shelfCount: number;
  maxWeightKg: number;
  maxHeightPerShelfCm: number;
};

export type Piece = {
  id: number;
  ownerId: number;
  ownerName?: string;
  name: string;
  clayBody: ClayBody;
  glazeFamily: GlazeFamily;
  targetCone: TargetCone;
  firingType: FiringType;
  widthCm: number;
  depthCm: number;
  heightCm: number;
  weightKg: number;
  drynessPercent: number;
  dueDate: string;
  notes: string;
  status: PieceStatus;
  createdAt: string;
  updatedAt: string;
};

export type Load = {
  id: number;
  kilnId: number;
  kilnName?: string;
  targetCone: TargetCone;
  firingType: FiringType;
  status: LoadStatus;
  version: number;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  createdBy: number;
  approvedBy: number | null;
  createdAt: string;
  updatedAt: string;
};

export type SensorReading = {
  id?: number;
  loadId?: number;
  timestamp: string;
  tempC: number;
  targetTempC: number;
  note: string;
};

export type AlertSeverity = "info" | "warning" | "critical";

export type Alert = {
  id?: number;
  loadId: number | null;
  pieceId?: number | null;
  type: string;
  severity: AlertSeverity;
  message: string;
  createdAt: string;
};

export type BlockReason = {
  code: string;
  message: string;
};

export function getPieceBlockReasons(piece: Pick<Piece, "drynessPercent" | "glazeFamily" | "targetCone" | "firingType" | "clayBody" | "heightCm">): BlockReason[] {
  const reasons: BlockReason[] = [];

  if (piece.drynessPercent < 80) {
    reasons.push({ code: "UNDER_DRY", message: "Độ khô thấp hơn ngưỡng 80%." });
  }

  if (piece.glazeFamily === "unknown") {
    reasons.push({ code: "UNKNOWN_GLAZE", message: "Nhóm men cần kỹ thuật viên kiểm tra." });
  }

  if (piece.firingType === "raku" && piece.clayBody !== "earthenware" && piece.clayBody !== "stoneware") {
    reasons.push({ code: "RAKU_CLAY_MISMATCH", message: "Mẻ raku chỉ cho phép earthenware hoặc stoneware." });
  }

  if (piece.targetCone === "10" && piece.clayBody === "earthenware") {
    reasons.push({ code: "CONE10_EARTHENWARE", message: "Earthenware bị chặn khi nung cone 10." });
  }

  return reasons;
}
