// Kiln load auto-planner.
//
// Algorithm:
// 1. Filter candidates by constraint pipeline. Each rejection produces an
//    ExcludedPiece with a stable reasonCode that the UI can map to copy.
// 2. Score remaining pieces (earlier due date, longer wait, glaze risk).
// 3. Greedy fill: place each piece on the first shelf where it fits (x/y
//    coordinates), respecting per-shelf footprint, per-shelf clearance and
//    kiln-wide max weight (capped at 90% to avoid over-packing the kiln).
// 4. Report aggregate capacity usage (volume/footprint/weight as percentages)
//    and warnings.
//
// The greedy approach is deliberately simple — it isn't NP-optimal — but it
// is deterministic, easy to reason about and well-covered by tests.

import type {
  CapacityUsage,
  ExcludedPiece,
  ExclusionReasonCode,
  FiringType,
  Kiln,
  Piece,
  PlannerResult,
  PlannerWarning,
  ShelfAssignment,
  TargetCone,
} from '@kilnflow/shared';

export const DRYNESS_THRESHOLD = 80;
export const WEIGHT_CAP_RATIO = 0.9; // soft cap at 90% of max kiln weight

export interface PlanInput {
  kiln: Kiln;
  targetCone: TargetCone;
  firingType: FiringType;
  candidatePieces: Piece[];
  prioritizeDueDate?: boolean;
  now?: Date;
}

interface PreCheckResult {
  remaining: Piece[];
  excluded: ExcludedPiece[];
}

function preCheck(input: PlanInput): PreCheckResult {
  const excluded: ExcludedPiece[] = [];
  const remaining: Piece[] = [];

  for (const p of input.candidatePieces) {
    const reason = checkPiece(p, input);
    if (reason) {
      excluded.push(reason);
    } else {
      remaining.push(p);
    }
  }
  return { remaining, excluded };
}

function checkPiece(p: Piece, input: PlanInput): ExcludedPiece | null {
  const reject = (code: ExclusionReasonCode, message: string): ExcludedPiece => ({
    pieceId: p.id,
    reasonCode: code,
    message,
  });

  if (p.status !== 'ready') {
    return reject('status-not-ready', `Trạng thái món là "${p.status}", chưa sẵn sàng nung.`);
  }
  if (p.drynessPercent < DRYNESS_THRESHOLD) {
    return reject(
      'under-dry',
      `Độ khô ${p.drynessPercent}% thấp hơn ngưỡng ${DRYNESS_THRESHOLD}%.`,
    );
  }
  if (p.targetCone !== input.targetCone) {
    return reject(
      'wrong-cone',
      `Món cần cone ${p.targetCone}, đợt nung này ở cone ${input.targetCone}.`,
    );
  }
  if (p.firingType !== input.firingType) {
    return reject(
      'wrong-firing-type',
      `Món cần kiểu nung ${p.firingType}, đợt nung này là ${input.firingType}.`,
    );
  }
  if (p.glazeFamily === 'unknown') {
    return reject(
      'unknown-glaze',
      'Họ men không xác định — cần kỹ thuật viên xem xét trước khi auto-planning.',
    );
  }
  if (input.firingType === 'raku' && !(p.clayBody === 'earthenware' || p.clayBody === 'stoneware')) {
    return reject(
      'raku-incompatible-clay',
      `Raku chỉ hỗ trợ earthenware hoặc stoneware — món này là ${p.clayBody}.`,
    );
  }
  if (input.targetCone === '10' && p.clayBody === 'earthenware') {
    return reject(
      'cone10-earthenware-blocked',
      'Earthenware không thể nung tới cone 10.',
    );
  }
  if (p.heightCm > input.kiln.maxHeightPerShelfCm) {
    return reject(
      'too-tall',
      `Chiều cao món ${p.heightCm}cm vượt khoảng trống kệ ${input.kiln.maxHeightPerShelfCm}cm.`,
    );
  }
  if (p.widthCm > input.kiln.shelfWidthCm || p.depthCm > input.kiln.shelfDepthCm) {
    return reject(
      'no-shelf-fit',
      `Kích thước món ${p.widthCm}×${p.depthCm}cm không vừa kệ ${input.kiln.shelfWidthCm}×${input.kiln.shelfDepthCm}cm.`,
    );
  }
  return null;
}

interface ShelfState {
  index: number;
  remainingFootprintCm2: number;
  cursorX: number;
  cursorY: number;
  rowMaxDepth: number;
  pieces: ShelfAssignment[];
}

function newShelf(index: number, kiln: Kiln): ShelfState {
  return {
    index,
    remainingFootprintCm2: kiln.shelfWidthCm * kiln.shelfDepthCm,
    cursorX: 0,
    cursorY: 0,
    rowMaxDepth: 0,
    pieces: [],
  };
}

function tryPlace(shelf: ShelfState, kiln: Kiln, p: Piece): ShelfAssignment | null {
  // Pack rows left-to-right; wrap when the piece would exceed shelf width;
  // a row's depth is set by the first piece. Greedy, not optimal.
  let { cursorX, cursorY, rowMaxDepth } = shelf;
  if (cursorX + p.widthCm > kiln.shelfWidthCm) {
    cursorX = 0;
    cursorY = cursorY + rowMaxDepth;
    rowMaxDepth = 0;
  }
  if (cursorY + p.depthCm > kiln.shelfDepthCm) {
    return null;
  }
  if (cursorX + p.widthCm > kiln.shelfWidthCm) {
    return null;
  }
  const a: ShelfAssignment = {
    pieceId: p.id,
    shelfIndex: shelf.index,
    x: cursorX,
    y: cursorY,
    widthCm: p.widthCm,
    depthCm: p.depthCm,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
  };
  shelf.cursorX = cursorX + p.widthCm;
  shelf.cursorY = cursorY;
  shelf.rowMaxDepth = Math.max(rowMaxDepth, p.depthCm);
  shelf.remainingFootprintCm2 -= p.widthCm * p.depthCm;
  shelf.pieces.push(a);
  return a;
}

function scorePieces(pieces: Piece[], input: PlanInput): Map<string, number> {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const map = new Map<string, number>();
  for (const p of pieces) {
    let score = 0;
    // Earlier due date = higher score. Past-due gets bonus.
    const dueMs = new Date(p.dueDate).getTime();
    const daysUntilDue = (dueMs - nowMs) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 60 - daysUntilDue * 2); // up to ~60 for past-due
    // Longer wait since createdAt = bonus.
    const ageDays = Math.max(0, (nowMs - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    score += Math.min(20, ageDays);
    // Glaze risk penalty.
    if (p.glazeFamily === 'crawl') score -= 8;
    if (p.glazeFamily === 'soda-sensitive') score -= 5;
    map.set(p.id, score);
  }
  return map;
}

export function planLoad(input: PlanInput): PlannerResult {
  const warnings: PlannerWarning[] = [];
  const { remaining, excluded } = preCheck(input);

  const scores = scorePieces(remaining, input);
  const sorted = [...remaining].sort((a, b) => {
    if (input.prioritizeDueDate !== false) {
      const ad = new Date(a.dueDate).getTime();
      const bd = new Date(b.dueDate).getTime();
      if (ad !== bd) return ad - bd;
    }
    return (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0);
  });

  const shelves: ShelfState[] = Array.from({ length: input.kiln.shelves }, (_, i) =>
    newShelf(i, input.kiln),
  );
  const selectedPieceIds: string[] = [];
  const shelfAssignments: ShelfAssignment[] = [];
  let totalWeight = 0;
  let totalVolume = 0;
  const weightCap = input.kiln.maxWeightKg * WEIGHT_CAP_RATIO;

  for (const p of sorted) {
    if (totalWeight + p.weightKg > input.kiln.maxWeightKg) {
      excluded.push({
        pieceId: p.id,
        reasonCode: 'over-weight',
        message: `Thêm ${p.weightKg}kg sẽ vượt tải tối đa của lò ${input.kiln.maxWeightKg}kg.`,
      });
      continue;
    }
    if (totalWeight + p.weightKg > weightCap) {
      // Soft cap: still allowed if it fits exactly under max, but warn once.
      warnings.push({
        code: 'soft-weight-cap',
        message: `Lựa chọn đang gần ngưỡng tải an toàn (${Math.round(weightCap)}kg).`,
      });
    }

    let placed: ShelfAssignment | null = null;
    for (const shelf of shelves) {
      placed = tryPlace(shelf, input.kiln, p);
      if (placed) break;
    }
    if (!placed) {
      excluded.push({
        pieceId: p.id,
        reasonCode: 'no-shelf-fit',
        message: 'Không còn kệ nào đủ chỗ cho món này.',
      });
      continue;
    }
    selectedPieceIds.push(p.id);
    shelfAssignments.push(placed);
    totalWeight += p.weightKg;
    totalVolume += p.widthCm * p.depthCm * p.heightCm;
  }

  const capacity = computeCapacity(input.kiln, shelves, totalVolume, totalWeight);
  const score = selectedPieceIds.reduce((sum, id) => sum + (scores.get(id) ?? 0), 0);

  // Dedupe warnings.
  const uniqueWarnings = Array.from(new Map(warnings.map((w) => [w.code, w])).values());

  return {
    kilnId: input.kiln.id,
    targetCone: input.targetCone,
    firingType: input.firingType,
    selectedPieceIds,
    excluded,
    shelfAssignments,
    capacity,
    score: Math.round(score * 100) / 100,
    warnings: uniqueWarnings,
  };
}

function computeCapacity(
  kiln: Kiln,
  shelves: ShelfState[],
  totalVolume: number,
  totalWeight: number,
): CapacityUsage {
  const totalShelfArea = kiln.shelfWidthCm * kiln.shelfDepthCm * shelves.length;
  const usedShelfArea = shelves.reduce(
    (sum, s) => sum + (kiln.shelfWidthCm * kiln.shelfDepthCm - s.remainingFootprintCm2),
    0,
  );
  const totalKilnVolume =
    kiln.shelfWidthCm * kiln.shelfDepthCm * kiln.maxHeightPerShelfCm * kiln.shelves;

  return {
    volumePercent: clampPercent((totalVolume / totalKilnVolume) * 100),
    footprintPercent: clampPercent((usedShelfArea / totalShelfArea) * 100),
    weightPercent: clampPercent((totalWeight / kiln.maxWeightKg) * 100),
  };
}

function clampPercent(n: number): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}
