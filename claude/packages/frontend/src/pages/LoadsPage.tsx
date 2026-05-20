import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { canRunPlanner, type Kiln, type KilnLoad } from '@kilnflow/shared';
import { api } from '../api';
import { useAuth } from '../state/auth';
import { ErrorBanner } from '../components/ErrorBanner';
import { LoadStatusBadge } from '../components/StatusBadge';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { Icon } from '../components/Icon';
import { RoleHintPanel } from '../components/RoleHintPanel';
import { firingTypeLabel, targetConeLabel } from '../i18n';

export function LoadsPage() {
  const { currentUser } = useAuth();
  const [loads, setLoads] = useState<KilnLoad[] | null>(null);
  const [kilns, setKilns] = useState<Kiln[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.listLoads(), api.listKilns()])
      .then(([ls, ks]) => {
        setLoads(ls);
        setKilns(ks);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const kilnNameById = new Map(kilns.map((k) => [k.id, k.name]));

  return (
    <>
      <PageHeader
        title="Danh sách đợt nung"
        subtitle="Theo dõi tất cả đợt nung từ nháp đến hoàn tất."
        actions={
          canRunPlanner(currentUser?.role ?? 'observer') && (
            <Link to="/planner" className="btn">
              <Icon.Wand size={16} /> Tạo bản nháp mới
            </Link>
          )
        }
      />
      {currentUser && <RoleHintPanel pageId="loads" role={currentUser.role} />}
      <ErrorBanner error={error} />
      <div className="card flush">
        {loads === null ? (
          <div style={{ padding: '1.25rem' }}>
            <Skeleton rows={5} />
          </div>
        ) : loads.length === 0 ? (
          <EmptyState
            icon={<Icon.Flame size={26} />}
            title="Chưa có đợt nung nào"
            description="Dùng trang Lập kế hoạch để tạo bản nháp đợt nung đầu tiên."
            action={
              <Link to="/planner" className="btn small">
                Vào lập kế hoạch
              </Link>
            }
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Lò</th>
                  <th scope="col">Cone</th>
                  <th scope="col">Kiểu nung</th>
                  <th scope="col" className="num">Đã chọn</th>
                  <th scope="col" className="num">Bị loại</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Phiên bản</th>
                  <th scope="col">Lên lịch</th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                {loads.map((l) => (
                  <tr key={l.id}>
                    <td><strong>{kilnNameById.get(l.kilnId) ?? l.kilnId}</strong></td>
                    <td>{targetConeLabel[l.targetCone]}</td>
                    <td>{firingTypeLabel[l.firingType]}</td>
                    <td className="num">{l.plan.selectedPieceIds.length}</td>
                    <td className="num">{l.plan.excluded.length}</td>
                    <td>
                      <LoadStatusBadge status={l.status} />
                    </td>
                    <td>
                      <span className="badge version no-dot">v{l.version}</span>
                    </td>
                    <td>{l.scheduledAt ? new Date(l.scheduledAt).toLocaleString('vi-VN') : '—'}</td>
                    <td>
                      <Link to={`/loads/${l.id}`}>mở →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
