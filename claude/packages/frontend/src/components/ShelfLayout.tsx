import type { Kiln, Piece, PlannerResult, ShelfAssignment } from '@kilnflow/shared';

export function ShelfLayout({
  plan,
  kiln,
  piecesById,
}: {
  plan: PlannerResult;
  kiln: Kiln;
  piecesById: Map<string, Piece>;
}) {
  const shelves = Array.from({ length: kiln.shelves }, (_, i) => i);
  const byShelf = new Map<number, ShelfAssignment[]>();
  for (const a of plan.shelfAssignments) {
    const arr = byShelf.get(a.shelfIndex) ?? [];
    arr.push(a);
    byShelf.set(a.shelfIndex, arr);
  }
  return (
    <div className="shelf-grid" role="group" aria-label="Các kệ trong lò">
      {shelves.map((idx) => {
        const items = byShelf.get(idx) ?? [];
        const usedArea = items.reduce((sum, it) => sum + it.widthCm * it.depthCm, 0);
        const totalArea = kiln.shelfWidthCm * kiln.shelfDepthCm;
        const usedPercent = totalArea > 0 ? Math.round((usedArea / totalArea) * 100) : 0;
        const desc = items
          .map((it) => {
            const p = piecesById.get(it.pieceId);
            return p ? `${p.name} tại ${it.x},${it.y}cm` : it.pieceId;
          })
          .join('; ');
        return (
          <div key={idx} className="shelf" aria-label={`Kệ ${idx + 1}: ${items.length} món`}>
            <div className="shelf-head">
              <h4>Kệ {idx + 1}</h4>
              <span className="shelf-count">
                {items.length} món · {usedPercent}% diện tích
              </span>
            </div>
            <div
              className="layout"
              role="img"
              aria-label={`Bố trí kệ ${idx + 1}. ${items.length} món. ${desc || 'trống.'}`}
            >
              {items.map((a) => {
                const p = piecesById.get(a.pieceId);
                const wp = (a.widthCm / kiln.shelfWidthCm) * 100;
                const dp = (a.depthCm / kiln.shelfDepthCm) * 100;
                const xp = (a.x / kiln.shelfWidthCm) * 100;
                const yp = (a.y / kiln.shelfDepthCm) * 100;
                const label = p?.name.split(' ').slice(0, 2).join(' ') ?? '';
                return (
                  <div
                    key={a.pieceId}
                    className="piece-box"
                    style={{
                      left: `${xp}%`,
                      top: `${yp}%`,
                      width: `${wp}%`,
                      height: `${dp}%`,
                    }}
                    title={p ? `${p.name} · ${a.widthCm}×${a.depthCm}cm · ${a.weightKg}kg` : a.pieceId}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
