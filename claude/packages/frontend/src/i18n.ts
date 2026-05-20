// Vietnamese UI labels for enum values.
// Code identifiers (status strings, reason codes, alert codes) stay unchanged
// in the backend/API; this layer only formats them for rendering.

import type {
  AlertSeverity,
  ClayBody,
  ExclusionReasonCode,
  FiringType,
  GlazeFamily,
  LoadStatus,
  PieceStatus,
  Role,
  TargetCone,
} from '@kilnflow/shared';

export const roleLabel: Record<Role, string> = {
  member: 'thành viên',
  technician: 'kỹ thuật viên',
  manager: 'quản lý',
  observer: 'người xem',
};

export const loadStatusLabel: Record<LoadStatus, string> = {
  draft: 'nháp',
  approved: 'đã duyệt',
  scheduled: 'đã lên lịch',
  firing: 'đang nung',
  completed: 'hoàn tất',
  cancelled: 'đã hủy',
};

export const pieceStatusLabel: Record<PieceStatus, string> = {
  draft: 'nháp',
  ready: 'sẵn sàng',
  blocked: 'bị chặn',
  'in-load': 'đã vào lò',
  fired: 'đã nung',
  cancelled: 'đã hủy',
};

export const alertSeverityLabel: Record<AlertSeverity, string> = {
  info: 'thông tin',
  warning: 'cảnh báo',
  critical: 'nghiêm trọng',
};

// Ceramic terms are commonly kept in English in Vietnamese studios. Add
// clarifying text only when it reduces ambiguity.
export const clayBodyLabel: Record<ClayBody, string> = {
  stoneware: 'stoneware',
  porcelain: 'porcelain',
  earthenware: 'earthenware',
  'wild-clay': 'đất khai thác (wild-clay)',
};

export const glazeFamilyLabel: Record<GlazeFamily, string> = {
  clear: 'clear',
  celadon: 'celadon',
  shino: 'shino',
  crawl: 'crawl',
  'soda-sensitive': 'soda-sensitive',
  unknown: 'không xác định',
};

export const firingTypeLabel: Record<FiringType, string> = {
  bisque: 'bisque (nung sơ)',
  oxidation: 'oxidation (oxi hóa)',
  reduction: 'reduction (khử)',
  raku: 'raku',
};

export const targetConeLabel: Record<TargetCone, string> = {
  '04': 'cone 04',
  '6': 'cone 6',
  '10': 'cone 10',
};

export const reasonCodeLabel: Record<ExclusionReasonCode, string> = {
  'status-not-ready': 'chưa sẵn sàng',
  'under-dry': 'chưa đủ khô',
  'wrong-cone': 'sai cone',
  'wrong-firing-type': 'sai kiểu nung',
  'unknown-glaze': 'men không xác định',
  'over-weight': 'vượt tải',
  'no-shelf-fit': 'không vừa kệ',
  'too-tall': 'quá cao',
  'raku-incompatible-clay': 'đất không hợp raku',
  'cone10-earthenware-blocked': 'earthenware bị chặn ở cone 10',
};

// Labels for blocked-reason summaries displayed on the backlog filters.
export const blockReasonLabel: Record<string, string> = {
  'under-dry': 'chưa đủ khô',
  'unknown-glaze': 'men không xác định',
  other: 'khác',
};
