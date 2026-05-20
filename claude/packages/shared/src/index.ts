// Shared types and constants between backend and frontend.

export type Role = 'member' | 'technician' | 'manager' | 'observer';

export const ALL_ROLES: Role[] = ['member', 'technician', 'manager', 'observer'];

export type ClayBody = 'stoneware' | 'porcelain' | 'earthenware' | 'wild-clay';
export const CLAY_BODIES: ClayBody[] = ['stoneware', 'porcelain', 'earthenware', 'wild-clay'];

export type GlazeFamily = 'clear' | 'celadon' | 'shino' | 'crawl' | 'soda-sensitive' | 'unknown';
export const GLAZE_FAMILIES: GlazeFamily[] = [
  'clear',
  'celadon',
  'shino',
  'crawl',
  'soda-sensitive',
  'unknown',
];

export type TargetCone = '04' | '6' | '10';
export const TARGET_CONES: TargetCone[] = ['04', '6', '10'];

export type FiringType = 'bisque' | 'oxidation' | 'reduction' | 'raku';
export const FIRING_TYPES: FiringType[] = ['bisque', 'oxidation', 'reduction', 'raku'];

export type PieceStatus =
  | 'draft'
  | 'ready'
  | 'blocked'
  | 'in-load'
  | 'fired'
  | 'cancelled';

export type LoadStatus = 'draft' | 'approved' | 'scheduled' | 'firing' | 'completed' | 'cancelled';

export interface User {
  id: string;
  name: string;
  role: Role;
}

export interface Kiln {
  id: string;
  name: string;
  shelfWidthCm: number;
  shelfDepthCm: number;
  shelves: number;
  maxWeightKg: number;
  maxHeightPerShelfCm: number;
}

export interface Piece {
  id: string;
  ownerId: string;
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
  dueDate: string; // ISO date
  notes: string;
  status: PieceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ShelfAssignment {
  pieceId: string;
  shelfIndex: number;
  x: number;
  y: number;
  widthCm: number;
  depthCm: number;
  heightCm: number;
  weightKg: number;
}

export interface ExcludedPiece {
  pieceId: string;
  reasonCode: ExclusionReasonCode;
  message: string;
}

export type ExclusionReasonCode =
  | 'status-not-ready'
  | 'under-dry'
  | 'wrong-cone'
  | 'wrong-firing-type'
  | 'unknown-glaze'
  | 'over-weight'
  | 'no-shelf-fit'
  | 'too-tall'
  | 'raku-incompatible-clay'
  | 'cone10-earthenware-blocked';

export interface CapacityUsage {
  volumePercent: number;
  footprintPercent: number;
  weightPercent: number;
}

export interface PlannerWarning {
  code: string;
  message: string;
}

export interface PlannerResult {
  kilnId: string;
  targetCone: TargetCone;
  firingType: FiringType;
  selectedPieceIds: string[];
  excluded: ExcludedPiece[];
  shelfAssignments: ShelfAssignment[];
  capacity: CapacityUsage;
  score: number;
  warnings: PlannerWarning[];
}

export interface KilnLoad {
  id: string;
  kilnId: string;
  targetCone: TargetCone;
  firingType: FiringType;
  status: LoadStatus;
  version: number;
  scheduledAt: string | null;
  plan: PlannerResult;
  notes: LoadNote[];
  createdAt: string;
  updatedAt: string;
}

export interface LoadNote {
  id: string;
  loadId: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  body: string;
  createdAt: string;
}

export interface SensorReading {
  id: string;
  loadId: string;
  timestamp: string;
  tempC: number;
  targetTempC: number;
  note: string;
}

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  loadId: string;
  severity: AlertSeverity;
  code: string;
  message: string;
  createdAt: string;
  acknowledged: number; // 0/1
}

export interface DashboardSummary {
  waitingPieces: number;
  eligiblePieces: number;
  blockedPieces: number;
  blockReasonBreakdown: Array<{ reason: string; count: number }>;
  upcomingLoads: Array<{
    id: string;
    kilnId: string;
    kilnName: string;
    status: LoadStatus;
    scheduledAt: string | null;
    targetCone: TargetCone;
    firingType: FiringType;
  }>;
  recentAlerts: Alert[];
  kilnCapacity: Array<{
    kilnId: string;
    kilnName: string;
    pendingLoads: number;
    capacityNote: string;
  }>;
}

export interface PlanRequest {
  kilnId: string;
  targetCone: TargetCone;
  firingType: FiringType;
  candidatePieceIds?: string[]; // optional limit; otherwise all ready pieces
  prioritizeDueDate?: boolean;
}

// Permission helpers shared between backend and frontend so UI hides actions
// the user cannot perform; backend still enforces independently.
export function canRunPlanner(role: Role): boolean {
  return role === 'technician' || role === 'manager';
}
export function canApproveLoad(role: Role): boolean {
  return role === 'manager';
}
export function canScheduleLoad(role: Role): boolean {
  return role === 'manager';
}
export function canStartLoad(role: Role): boolean {
  return role === 'technician' || role === 'manager';
}
export function canCompleteLoad(role: Role): boolean {
  return role === 'technician' || role === 'manager';
}
export function canCancelLoad(role: Role): boolean {
  return role === 'manager';
}
export function canImportSensorCsv(role: Role): boolean {
  return role === 'technician' || role === 'manager';
}
export function canAddTechnicalNote(role: Role): boolean {
  return role === 'technician' || role === 'manager';
}
export function canEditPiece(role: Role): boolean {
  return role === 'member' || role === 'technician' || role === 'manager';
}
