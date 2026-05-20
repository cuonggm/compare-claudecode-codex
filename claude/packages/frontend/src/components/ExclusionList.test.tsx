import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ExcludedPiece, Piece } from '@kilnflow/shared';
import { ExclusionList } from './ExclusionList';

function piece(id: string, name: string): Piece {
  return {
    id,
    ownerId: 'u',
    name,
    clayBody: 'stoneware',
    glazeFamily: 'clear',
    targetCone: '6',
    firingType: 'oxidation',
    widthCm: 10,
    depthCm: 10,
    heightCm: 10,
    weightKg: 1,
    drynessPercent: 90,
    dueDate: new Date().toISOString(),
    notes: '',
    status: 'ready',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('ExclusionList', () => {
  it('renders trạng thái rỗng khi không có món bị loại trừ', () => {
    render(<ExclusionList excluded={[]} piecesById={new Map()} />);
    expect(screen.getByText(/không có món bị loại trừ/i)).toBeInTheDocument();
  });

  it('renders một dòng cho mỗi món bị loại với label tiếng Việt cho reason code', () => {
    const excluded: ExcludedPiece[] = [
      {
        pieceId: 'p1',
        reasonCode: 'under-dry',
        message: 'Độ khô 50% thấp hơn ngưỡng 80%.',
      },
      {
        pieceId: 'p2',
        reasonCode: 'unknown-glaze',
        message: 'Họ men không xác định.',
      },
    ];
    const piecesById = new Map([
      ['p1', piece('p1', 'Tô còn ướt')],
      ['p2', piece('p2', 'Cốc bí ẩn')],
    ]);
    render(<ExclusionList excluded={excluded} piecesById={piecesById} />);

    expect(screen.getByText('Tô còn ướt')).toBeInTheDocument();
    // Vietnamese reason label plus the raw code in a <code>(under-dry)</code> suffix.
    expect(screen.getByText(/chưa đủ khô/)).toBeInTheDocument();
    expect(screen.getByText(/\(under-dry\)/)).toBeInTheDocument();
    expect(screen.getByText(/Độ khô 50%/)).toBeInTheDocument();
    expect(screen.getByText('Cốc bí ẩn')).toBeInTheDocument();
    // There may be two matching strings: the label and the detail message.
    expect(screen.getAllByText(/men không xác định/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/\(unknown-glaze\)/)).toBeInTheDocument();
  });
});
