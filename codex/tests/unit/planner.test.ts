import { describe, expect, it } from "vitest";
import type { Kiln, Piece } from "../../src/shared/domain.js";
import { planKilnLoad } from "../../src/shared/planner.js";

const kiln: Kiln = {
  id: 1,
  name: "Test kiln",
  shelfWidthCm: 30,
  shelfDepthCm: 30,
  shelfCount: 1,
  maxWeightKg: 5,
  maxHeightPerShelfCm: 12
};

function piece(overrides: Partial<Piece>): Piece {
  return {
    id: overrides.id ?? 1,
    ownerId: 1,
    ownerName: "An",
    name: overrides.name ?? "Test piece",
    clayBody: overrides.clayBody ?? "stoneware",
    glazeFamily: overrides.glazeFamily ?? "clear",
    targetCone: overrides.targetCone ?? "6",
    firingType: overrides.firingType ?? "oxidation",
    widthCm: overrides.widthCm ?? 8,
    depthCm: overrides.depthCm ?? 8,
    heightCm: overrides.heightCm ?? 8,
    weightKg: overrides.weightKg ?? 1,
    drynessPercent: overrides.drynessPercent ?? 90,
    dueDate: overrides.dueDate ?? "2026-05-30",
    notes: "",
    status: overrides.status ?? "ready",
    createdAt: overrides.createdAt ?? "2026-05-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-05-01T00:00:00.000Z"
  };
}

describe("planKilnLoad", () => {
  it("excludes an under-dry piece", () => {
    const result = planKilnLoad({
      kiln,
      targetCone: "6",
      firingType: "oxidation",
      candidatePieces: [piece({ id: 1, drynessPercent: 50 })]
    });

    expect(result.selectedPieces).toHaveLength(0);
    expect(result.excludedPieces).toContainEqual(expect.objectContaining({ pieceId: 1, reasonCode: "UNDER_DRY" }));
  });

  it("excludes wrong cone and wrong firing type", () => {
    const result = planKilnLoad({
      kiln,
      targetCone: "6",
      firingType: "oxidation",
      candidatePieces: [
        piece({ id: 1, targetCone: "10" }),
        piece({ id: 2, firingType: "reduction" })
      ]
    });

    expect(result.selectedPieces).toHaveLength(0);
    expect(result.excludedPieces.map((item) => item.reasonCode)).toEqual(["TARGET_CONE_MISMATCH", "FIRING_TYPE_MISMATCH"]);
  });

  it("excludes unknown glaze", () => {
    const result = planKilnLoad({
      kiln,
      targetCone: "6",
      firingType: "oxidation",
      candidatePieces: [piece({ id: 1, glazeFamily: "unknown" })]
    });

    expect(result.excludedPieces[0]).toEqual(expect.objectContaining({
      reasonCode: "UNKNOWN_GLAZE",
      message: expect.stringContaining("Nhóm men chưa rõ")
    }));
  });

  it("respects max weight", () => {
    const result = planKilnLoad({
      kiln,
      targetCone: "6",
      firingType: "oxidation",
      candidatePieces: [
        piece({ id: 1, name: "First", weightKg: 4, dueDate: "2026-05-20" }),
        piece({ id: 2, name: "Second", weightKg: 4, dueDate: "2026-05-21" })
      ]
    });

    expect(result.selectedPieces.map((item) => item.id)).toEqual([1]);
    expect(result.excludedPieces).toContainEqual(expect.objectContaining({ pieceId: 2, reasonCode: "MAX_WEIGHT_EXCEEDED" }));
    expect(result.capacityUsage.weightPercent).toBe(80);
  });

  it("returns explicit exclusion reasons", () => {
    const result = planKilnLoad({
      kiln,
      targetCone: "6",
      firingType: "oxidation",
      candidatePieces: [piece({ id: 1, status: "planned" })]
    });

    expect(result.excludedPieces[0]?.reasonCode).toBe("STATUS_NOT_READY");
    expect(result.excludedPieces[0]?.message).toContain("chỉ món sẵn sàng");
  });
});
