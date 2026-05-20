import type { ExcludedPiece, Piece } from '@kilnflow/shared';
import { reasonCodeLabel } from '../i18n';

export function ExclusionList({
  excluded,
  piecesById,
}: {
  excluded: ExcludedPiece[];
  piecesById: Map<string, Piece>;
}) {
  if (excluded.length === 0) return <p className="help">Không có món bị loại trừ.</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Món</th>
            <th scope="col">Lý do</th>
            <th scope="col">Chi tiết</th>
          </tr>
        </thead>
        <tbody>
          {excluded.map((e) => {
            const p = piecesById.get(e.pieceId);
            return (
              <tr key={e.pieceId + e.reasonCode}>
                <td>{p?.name ?? e.pieceId}</td>
                <td>
                  <span className="badge severity-warning no-dot">
                    {reasonCodeLabel[e.reasonCode]}
                  </span>{' '}
                  <code style={{ opacity: 0.55, fontSize: '0.7rem' }}>({e.reasonCode})</code>
                </td>
                <td style={{ color: 'var(--text-soft)' }}>{e.message}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
