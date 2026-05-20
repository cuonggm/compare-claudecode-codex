import type { FiringType, Kiln, Piece, TargetCone } from "./domain.js";

export type BlockedRule = {
  field: "glazeFamily" | "clayBody" | "firingType";
  value: string;
  reasonCode: string;
  message: string;
};

export type PlannerInput = {
  kiln: Kiln;
  targetCone: TargetCone;
  firingType: FiringType;
  candidatePieces: Piece[];
  blockedRules?: BlockedRule[];
  dueDatePriority?: boolean;
};

export type ShelfAssignment = {
  pieceId: number;
  shelfIndex: number;
  xCm: number;
  yCm: number;
  widthCm: number;
  depthCm: number;
};

export type PlannerExclusion = {
  pieceId: number;
  pieceName: string;
  reasonCode: string;
  message: string;
};

export type PlannerResult = {
  selectedPieces: Piece[];
  excludedPieces: PlannerExclusion[];
  shelfAssignments: ShelfAssignment[];
  capacityUsage: {
    volumePercent: number;
    footprintPercent: number;
    weightPercent: number;
  };
  score: number;
  warnings: string[];
};

type Placement = ShelfAssignment;

type OrientedSize = {
  widthCm: number;
  depthCm: number;
};

const RISKY_GLAZE_PENALTY = new Map<string, number>([
  ["crawl", 8],
  ["soda-sensitive", 10]
]);

export function planKilnLoad(input: PlannerInput): PlannerResult {
  const excludedPieces: PlannerExclusion[] = [];
  const selectedPieces: Piece[] = [];
  const shelfAssignments: ShelfAssignment[] = [];
  const placementsByShelf = new Map<number, Placement[]>();
  let selectedWeightKg = 0;

  for (let shelfIndex = 0; shelfIndex < input.kiln.shelfCount; shelfIndex += 1) {
    placementsByShelf.set(shelfIndex, []);
  }

  const sortedPieces = [...input.candidatePieces].sort((a, b) => comparePlannerPriority(a, b, input.dueDatePriority ?? true));

  for (const piece of sortedPieces) {
    const standardExclusion = getStandardExclusion(piece, input);
    if (standardExclusion) {
      excludedPieces.push(standardExclusion);
      continue;
    }

    if (selectedWeightKg + piece.weightKg > input.kiln.maxWeightKg) {
      excludedPieces.push({
        pieceId: piece.id,
        pieceName: piece.name,
        reasonCode: "MAX_WEIGHT_EXCEEDED",
        message: `Thêm món này sẽ vượt tải trọng tối đa ${input.kiln.maxWeightKg}kg của lò.`
      });
      continue;
    }

    if (piece.heightCm > input.kiln.maxHeightPerShelfCm) {
      excludedPieces.push({
        pieceId: piece.id,
        pieceName: piece.name,
        reasonCode: "HEIGHT_EXCEEDS_CLEARANCE",
        message: `Chiều cao món ${piece.heightCm}cm vượt khoảng hở kệ ${input.kiln.maxHeightPerShelfCm}cm.`
      });
      continue;
    }

    const placement = findPlacement(piece, input.kiln, placementsByShelf);
    if (!placement) {
      excludedPieces.push({
        pieceId: piece.id,
        pieceName: piece.name,
        reasonCode: "FOOTPRINT_DOES_NOT_FIT",
        message: `Diện tích đáy ${piece.widthCm}x${piece.depthCm}cm không vừa phần kệ còn trống.`
      });
      continue;
    }

    placementsByShelf.get(placement.shelfIndex)?.push(placement);
    shelfAssignments.push(placement);
    selectedPieces.push(piece);
    selectedWeightKg += piece.weightKg;
  }

  const capacityUsage = calculateCapacity(input.kiln, selectedPieces);
  const score = calculateScore(selectedPieces, capacityUsage);
  const warnings = buildWarnings(input.kiln, selectedPieces, capacityUsage);

  return {
    selectedPieces,
    excludedPieces,
    shelfAssignments,
    capacityUsage,
    score,
    warnings
  };
}

function comparePlannerPriority(a: Piece, b: Piece, dueDatePriority: boolean): number {
  if (dueDatePriority) {
    const dueDelta = Date.parse(a.dueDate) - Date.parse(b.dueDate);
    if (dueDelta !== 0) return dueDelta;
  }

  const createdDelta = Date.parse(a.createdAt) - Date.parse(b.createdAt);
  if (createdDelta !== 0) return createdDelta;

  return b.weightKg - a.weightKg;
}

function getStandardExclusion(piece: Piece, input: PlannerInput): PlannerExclusion | null {
  if (piece.drynessPercent < 80) {
    return {
      pieceId: piece.id,
      pieceName: piece.name,
      reasonCode: "UNDER_DRY",
      message: `Độ khô ${piece.drynessPercent}% thấp hơn ngưỡng 80%.`
    };
  }

  if (piece.targetCone !== input.targetCone) {
    return {
      pieceId: piece.id,
      pieceName: piece.name,
      reasonCode: "TARGET_CONE_MISMATCH",
      message: `Cone của món là ${piece.targetCone}, không khớp cone mẻ nung ${input.targetCone}.`
    };
  }

  if (piece.firingType !== input.firingType) {
    return {
      pieceId: piece.id,
      pieceName: piece.name,
      reasonCode: "FIRING_TYPE_MISMATCH",
      message: `Kiểu nung của món là ${formatFiringTypeForMessage(piece.firingType)}, không khớp kiểu nung của mẻ ${formatFiringTypeForMessage(input.firingType)}.`
    };
  }

  if (piece.glazeFamily === "unknown") {
    return {
      pieceId: piece.id,
      pieceName: piece.name,
      reasonCode: "UNKNOWN_GLAZE",
      message: "Nhóm men chưa rõ phải được kỹ thuật viên kiểm tra trước khi tự động lập mẻ."
    };
  }

  if (input.firingType === "raku" && piece.clayBody !== "earthenware" && piece.clayBody !== "stoneware") {
    return {
      pieceId: piece.id,
      pieceName: piece.name,
      reasonCode: "RAKU_CLAY_MISMATCH",
      message: "Nung raku chỉ cho phép earthenware hoặc stoneware."
    };
  }

  if (input.targetCone === "10" && piece.clayBody === "earthenware") {
    return {
      pieceId: piece.id,
      pieceName: piece.name,
      reasonCode: "CONE10_EARTHENWARE",
      message: "Earthenware bị chặn khi nung cone 10."
    };
  }

  if (piece.status !== "ready") {
    return {
      pieceId: piece.id,
      pieceName: piece.name,
      reasonCode: "STATUS_NOT_READY",
      message: `Trạng thái món là ${formatPieceStatusForMessage(piece.status)}; chỉ món sẵn sàng mới được đưa vào mẻ.`
    };
  }

  const dynamicRule = input.blockedRules?.find((rule) => piece[rule.field] === rule.value);
  if (dynamicRule) {
    return {
      pieceId: piece.id,
      pieceName: piece.name,
      reasonCode: dynamicRule.reasonCode,
      message: dynamicRule.message
    };
  }

  return null;
}

function findPlacement(piece: Piece, kiln: Kiln, placementsByShelf: Map<number, Placement[]>): ShelfAssignment | null {
  const orientations = getOrientations(piece);

  for (let shelfIndex = 0; shelfIndex < kiln.shelfCount; shelfIndex += 1) {
    const existing = placementsByShelf.get(shelfIndex) ?? [];

    for (const orientation of orientations) {
      if (orientation.widthCm > kiln.shelfWidthCm || orientation.depthCm > kiln.shelfDepthCm) {
        continue;
      }

      for (let yCm = 0; yCm <= kiln.shelfDepthCm - orientation.depthCm; yCm += 1) {
        for (let xCm = 0; xCm <= kiln.shelfWidthCm - orientation.widthCm; xCm += 1) {
          const candidate = {
            pieceId: piece.id,
            shelfIndex,
            xCm,
            yCm,
            widthCm: orientation.widthCm,
            depthCm: orientation.depthCm
          };

          if (!existing.some((placed) => rectanglesOverlap(candidate, placed))) {
            return candidate;
          }
        }
      }
    }
  }

  return null;
}

function getOrientations(piece: Piece): OrientedSize[] {
  const normal = { widthCm: piece.widthCm, depthCm: piece.depthCm };
  const rotated = { widthCm: piece.depthCm, depthCm: piece.widthCm };
  if (normal.widthCm === rotated.widthCm && normal.depthCm === rotated.depthCm) {
    return [normal];
  }
  return [normal, rotated];
}

function rectanglesOverlap(a: OrientedSize & { xCm: number; yCm: number }, b: OrientedSize & { xCm: number; yCm: number }): boolean {
  return a.xCm < b.xCm + b.widthCm && a.xCm + a.widthCm > b.xCm && a.yCm < b.yCm + b.depthCm && a.yCm + a.depthCm > b.yCm;
}

function calculateCapacity(kiln: Kiln, selectedPieces: Piece[]): PlannerResult["capacityUsage"] {
  const footprintCm2 = selectedPieces.reduce((sum, piece) => sum + piece.widthCm * piece.depthCm, 0);
  const volumeCm3 = selectedPieces.reduce((sum, piece) => sum + piece.widthCm * piece.depthCm * piece.heightCm, 0);
  const weightKg = selectedPieces.reduce((sum, piece) => sum + piece.weightKg, 0);

  const maxFootprintCm2 = kiln.shelfWidthCm * kiln.shelfDepthCm * kiln.shelfCount;
  const maxVolumeCm3 = maxFootprintCm2 * kiln.maxHeightPerShelfCm;

  return {
    volumePercent: roundPercent((volumeCm3 / maxVolumeCm3) * 100),
    footprintPercent: roundPercent((footprintCm2 / maxFootprintCm2) * 100),
    weightPercent: roundPercent((weightKg / kiln.maxWeightKg) * 100)
  };
}

function calculateScore(selectedPieces: Piece[], capacityUsage: PlannerResult["capacityUsage"]): number {
  const today = Date.now();
  const urgencyScore = selectedPieces.reduce((sum, piece) => {
    const daysUntilDue = Math.max(0, (Date.parse(piece.dueDate) - today) / 86_400_000);
    const waitDays = Math.max(0, (today - Date.parse(piece.createdAt)) / 86_400_000);
    return sum + Math.max(0, 30 - daysUntilDue) + Math.min(waitDays, 20);
  }, 0);
  const glazePenalty = selectedPieces.reduce((sum, piece) => sum + (RISKY_GLAZE_PENALTY.get(piece.glazeFamily) ?? 0), 0);
  const fillScore = capacityUsage.footprintPercent * 0.35 + capacityUsage.volumePercent * 0.15 + Math.min(capacityUsage.weightPercent, 90) * 0.3;

  return Math.round(Math.max(0, fillScore + urgencyScore - glazePenalty));
}

function buildWarnings(kiln: Kiln, selectedPieces: Piece[], capacityUsage: PlannerResult["capacityUsage"]): string[] {
  const warnings: string[] = [];

  if (capacityUsage.weightPercent > 90) {
    warnings.push(`Mức dùng tải trọng là ${capacityUsage.weightPercent}% và vượt vùng an toàn 90% khi lập mẻ.`);
  }

  const riskyGlazes = selectedPieces.filter((piece) => piece.glazeFamily === "crawl" || piece.glazeFamily === "soda-sensitive");
  if (riskyGlazes.length > 0) {
    warnings.push(`Nên kiểm tra rủi ro men cho ${riskyGlazes.map((piece) => piece.name).join(", ")}.`);
  }

  if (capacityUsage.footprintPercent < 25 && selectedPieces.length > 0) {
    warnings.push(`${kiln.name} còn khá trống; nếu lịch cho phép, cân nhắc chờ thêm món phù hợp.`);
  }

  return warnings;
}

function roundPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10) / 10;
}

function formatFiringTypeForMessage(type: FiringType): string {
  const labels: Record<FiringType, string> = {
    bisque: "nung mộc",
    oxidation: "oxy hóa",
    reduction: "khử",
    raku: "raku"
  };
  return labels[type];
}

function formatPieceStatusForMessage(status: Piece["status"]): string {
  const labels: Record<Piece["status"], string> = {
    draft: "nháp",
    ready: "sẵn sàng",
    blocked: "đang chặn",
    planned: "đã lên mẻ",
    loaded: "đã xếp lò",
    fired: "đã nung"
  };
  return labels[status];
}
