import type { AlertSeverity, ClayBody, FiringType, GlazeFamily, LoadStatus, PieceStatus, Role } from "../../shared/domain";

const roleLabels: Record<Role, string> = {
  manager: "quản lý",
  technician: "kỹ thuật viên",
  member: "thành viên",
  observer: "quan sát"
};

const firingTypeLabels: Record<FiringType, string> = {
  bisque: "nung mộc",
  oxidation: "oxy hóa",
  reduction: "khử",
  raku: "raku"
};

const clayBodyLabels: Record<ClayBody, string> = {
  stoneware: "đất stoneware",
  porcelain: "sứ porcelain",
  earthenware: "đất nung earthenware",
  "wild-clay": "đất tự nhiên"
};

const glazeFamilyLabels: Record<GlazeFamily, string> = {
  clear: "men trong",
  celadon: "men celadon",
  shino: "men shino",
  crawl: "men crawl",
  "soda-sensitive": "nhạy soda",
  unknown: "chưa rõ"
};

const pieceStatusLabels: Record<PieceStatus, string> = {
  draft: "nháp",
  ready: "sẵn sàng",
  blocked: "đang chặn",
  planned: "đã lên load",
  loaded: "đã xếp lò",
  fired: "đã nung"
};

const loadStatusLabels: Record<LoadStatus, string> = {
  draft: "nháp",
  approved: "đã duyệt",
  scheduled: "đã lên lịch",
  firing: "đang nung",
  completed: "hoàn tất",
  cancelled: "đã hủy"
};

const alertTypeLabels: Record<string, string> = {
  SCHEDULE_REVIEW: "Cần xem lịch",
  TEMP_DEVIATION: "Lệch nhiệt",
  RAMP_RATE_HIGH: "Tăng nhiệt quá nhanh",
  UNEXPECTED_TEMP_DROP: "Giảm nhiệt bất thường"
};

const alertSeverityLabels: Record<AlertSeverity, string> = {
  info: "thông tin",
  warning: "cảnh báo",
  critical: "nghiêm trọng"
};

const reasonLabels: Record<string, string> = {
  UNDER_DRY: "Chưa đủ khô",
  UNKNOWN_GLAZE: "Men chưa rõ",
  RAKU_CLAY_MISMATCH: "Đất không hợp raku",
  CONE10_EARTHENWARE: "Earthenware không hợp cone 10",
  TARGET_CONE_MISMATCH: "Sai cone",
  FIRING_TYPE_MISMATCH: "Sai kiểu nung",
  STATUS_NOT_READY: "Chưa sẵn sàng",
  MAX_WEIGHT_EXCEEDED: "Vượt tải trọng",
  HEIGHT_EXCEEDS_CLEARANCE: "Vượt chiều cao kệ",
  FOOTPRINT_DOES_NOT_FIT: "Không vừa mặt kệ"
};

export function formatRole(role: string): string {
  return roleLabels[role as Role] ?? role;
}

export function formatFiringType(type: string): string {
  return firingTypeLabels[type as FiringType] ?? type;
}

export function formatClayBody(clayBody: string): string {
  return clayBodyLabels[clayBody as ClayBody] ?? clayBody;
}

export function formatGlazeFamily(glazeFamily: string): string {
  return glazeFamilyLabels[glazeFamily as GlazeFamily] ?? glazeFamily;
}

export function formatPieceStatus(status: string): string {
  return pieceStatusLabels[status as PieceStatus] ?? status;
}

export function formatLoadStatus(status: string): string {
  return loadStatusLabels[status as LoadStatus] ?? status;
}

export function formatAlertType(type: string): string {
  return alertTypeLabels[type] ?? type;
}

export function formatAlertSeverity(severity: string): string {
  return alertSeverityLabels[severity as AlertSeverity] ?? severity;
}

export function formatReasonCode(code: string): string {
  return reasonLabels[code] ?? code;
}
