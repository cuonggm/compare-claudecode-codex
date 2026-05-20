import { describe, expect, it } from 'vitest';
import type { Kiln, Piece, TargetCone, FiringType } from '@kilnflow/shared';
import { planLoad } from './planner.js';

const skutt: Kiln = {
  id: 'kiln-skutt-1027',
  name: 'Skutt 1027',
  shelfWidthCm: 55,
  shelfDepthCm: 55,
  shelves: 4,
  maxWeightKg: 75,
  maxHeightPerShelfCm: 18,
};

const miniRaku: Kiln = {
  id: 'kiln-mini-raku',
  name: 'Mini Raku',
  shelfWidthCm: 32,
  shelfDepthCm: 32,
  shelves: 2,
  maxWeightKg: 20,
  maxHeightPerShelfCm: 14,
};

function piece(overrides: Partial<Piece>): Piece {
  return {
    id: 'p-' + Math.random().toString(36).slice(2, 9),
    ownerId: 'user-x',
    name: 'piece',
    clayBody: 'stoneware',
    glazeFamily: 'clear',
    targetCone: '6',
    firingType: 'oxidation',
    widthCm: 10,
    depthCm: 10,
    heightCm: 10,
    weightKg: 1,
    drynessPercent: 90,
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    notes: '',
    status: 'ready',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('planner', () => {
  it('excludes pieces with status != ready', () => {
    const p = piece({ status: 'draft' });
    const r = planLoad({
      kiln: skutt,
      targetCone: '6',
      firingType: 'oxidation',
      candidatePieces: [p],
    });
    expect(r.selectedPieceIds).toEqual([]);
    expect(r.excluded.find((e) => e.pieceId === p.id)?.reasonCode).toBe('status-not-ready');
  });

  it('excludes under-dry piece (< 80%)', () => {
    const p = piece({ drynessPercent: 70 });
    const r = planLoad({
      kiln: skutt,
      targetCone: '6',
      firingType: 'oxidation',
      candidatePieces: [p],
    });
    expect(r.selectedPieceIds).toEqual([]);
    const ex = r.excluded.find((e) => e.pieceId === p.id);
    expect(ex?.reasonCode).toBe('under-dry');
    expect(ex?.message).toMatch(/70/);
  });

  it('excludes pieces with wrong cone', () => {
    const p = piece({ targetCone: '04' });
    const r = planLoad({
      kiln: skutt,
      targetCone: '6',
      firingType: 'oxidation',
      candidatePieces: [p],
    });
    expect(r.excluded.find((e) => e.pieceId === p.id)?.reasonCode).toBe('wrong-cone');
  });

  it('excludes pieces with wrong firing type', () => {
    const p = piece({ firingType: 'reduction' });
    const r = planLoad({
      kiln: skutt,
      targetCone: '6',
      firingType: 'oxidation',
      candidatePieces: [p],
    });
    expect(r.excluded.find((e) => e.pieceId === p.id)?.reasonCode).toBe('wrong-firing-type');
  });

  it('excludes unknown glaze', () => {
    const p = piece({ glazeFamily: 'unknown' });
    const r = planLoad({
      kiln: skutt,
      targetCone: '6',
      firingType: 'oxidation',
      candidatePieces: [p],
    });
    expect(r.excluded.find((e) => e.pieceId === p.id)?.reasonCode).toBe('unknown-glaze');
  });

  it('blocks cone 10 + earthenware', () => {
    const p = piece({ clayBody: 'earthenware', targetCone: '10', firingType: 'reduction' });
    const r = planLoad({
      kiln: skutt,
      targetCone: '10',
      firingType: 'reduction',
      candidatePieces: [p],
    });
    expect(r.excluded.find((e) => e.pieceId === p.id)?.reasonCode).toBe('cone10-earthenware-blocked');
  });

  it('blocks raku with incompatible clay (porcelain)', () => {
    const p = piece({
      clayBody: 'porcelain',
      firingType: 'raku',
      targetCone: '04',
    });
    const r = planLoad({
      kiln: miniRaku,
      targetCone: '04',
      firingType: 'raku',
      candidatePieces: [p],
    });
    expect(r.excluded.find((e) => e.pieceId === p.id)?.reasonCode).toBe('raku-incompatible-clay');
  });

  it('excludes too-tall piece', () => {
    const p = piece({ heightCm: 24 }); // skutt max per shelf = 18
    const r = planLoad({
      kiln: skutt,
      targetCone: '6',
      firingType: 'oxidation',
      candidatePieces: [p],
    });
    expect(r.excluded.find((e) => e.pieceId === p.id)?.reasonCode).toBe('too-tall');
  });

  it('respects max kiln weight', () => {
    // 5 heavy pieces at 20kg each = 100kg, kiln cap = 75kg.
    const pieces = Array.from({ length: 5 }, (_, i) =>
      piece({ id: 'heavy-' + i, name: 'heavy ' + i, weightKg: 20, widthCm: 15, depthCm: 15 }),
    );
    const r = planLoad({
      kiln: skutt,
      targetCone: '6',
      firingType: 'oxidation',
      candidatePieces: pieces,
    });
    const totalSelectedWeight = pieces
      .filter((p) => r.selectedPieceIds.includes(p.id))
      .reduce((sum, p) => sum + p.weightKg, 0);
    expect(totalSelectedWeight).toBeLessThanOrEqual(75);
    expect(r.excluded.some((e) => e.reasonCode === 'over-weight')).toBe(true);
  });

  it('returns explicit reason codes and messages', () => {
    const pieces = [
      piece({ id: 'wrong', targetCone: '04' }),
      piece({ id: 'underdry', drynessPercent: 50 }),
      piece({ id: 'unknown', glazeFamily: 'unknown' }),
    ];
    const r = planLoad({
      kiln: skutt,
      targetCone: '6',
      firingType: 'oxidation',
      candidatePieces: pieces,
    });
    expect(r.excluded.length).toBe(3);
    for (const ex of r.excluded) {
      expect(ex.message.length).toBeGreaterThan(0);
      expect(typeof ex.reasonCode).toBe('string');
    }
  });

  it('selects eligible pieces and assigns shelves', () => {
    const eligible = [
      piece({ id: 'ok1' }),
      piece({ id: 'ok2' }),
      piece({ id: 'ok3' }),
    ];
    const r = planLoad({
      kiln: skutt,
      targetCone: '6',
      firingType: 'oxidation',
      candidatePieces: eligible,
    });
    expect(r.selectedPieceIds.length).toBe(3);
    expect(r.shelfAssignments.length).toBe(3);
    for (const a of r.shelfAssignments) {
      expect(a.shelfIndex).toBeGreaterThanOrEqual(0);
      expect(a.shelfIndex).toBeLessThan(skutt.shelves);
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.y).toBeGreaterThanOrEqual(0);
    }
    expect(r.capacity.weightPercent).toBeGreaterThan(0);
  });

  it('prioritizes pieces with earlier due dates', () => {
    const urgent = piece({
      id: 'urgent',
      dueDate: new Date(Date.now() + 1 * 86400000).toISOString(),
      // make footprint take up the whole shelf so we can only fit one
      widthCm: 50,
      depthCm: 50,
    });
    const later = piece({
      id: 'later',
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      widthCm: 50,
      depthCm: 50,
    });
    const single = {
      ...skutt,
      shelves: 1,
      maxWeightKg: 5,
    };
    const r = planLoad({
      kiln: single,
      targetCone: '6',
      firingType: 'oxidation',
      candidatePieces: [later, urgent],
    });
    expect(r.selectedPieceIds[0]).toBe('urgent');
  });

  it('does not hardcode results — works for raku with new pieces', () => {
    const rakuOk = piece({
      id: 'raku-new',
      clayBody: 'stoneware',
      glazeFamily: 'clear',
      targetCone: '04',
      firingType: 'raku',
    });
    const r = planLoad({
      kiln: miniRaku,
      targetCone: '04',
      firingType: 'raku',
      candidatePieces: [rakuOk],
    });
    expect(r.selectedPieceIds).toEqual(['raku-new']);
  });
});
