import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  canApproveLoad,
  canRunPlanner,
  canScheduleLoad,
  type DashboardSummary,
} from '@kilnflow/shared';
import { api } from '../api';
import { AlertSeverityBadge, LoadStatusBadge } from '../components/StatusBadge';
import { ErrorBanner } from '../components/ErrorBanner';
import { PageHeader } from '../components/PageHeader';
import { KpiCard } from '../components/KpiCard';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { Icon } from '../components/Icon';
import { KilnIllustration } from '../components/KilnIllustration';
import { WorkflowGuide } from '../components/WorkflowGuide';
import { useAuth } from '../state/auth';
import { blockReasonLabel, firingTypeLabel, targetConeLabel } from '../i18n';

export function DashboardPage() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .dashboard()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e: Error) => !cancelled && setErr(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!currentUser) return null;

  const role = currentUser.role;
  const pendingDrafts =
    data?.upcomingLoads.filter((l) => l.status === 'draft').length ?? 0;
  const pendingApproved =
    data?.upcomingLoads.filter((l) => l.status === 'approved').length ?? 0;

  return (
    <>
      <PageHeader
        title="Bảng điều khiển studio"
        subtitle="Tổng quan hàng đợi, đợt nung sắp tới và cảnh báo gần đây."
        actions={
          <>
            {role !== 'observer' && (
              <Link to="/intake" className="btn secondary">
                <Icon.Plus size={16} /> Tiếp nhận món mới
              </Link>
            )}
            {canRunPlanner(role) && (
              <Link to="/planner" className="btn">
                <Icon.Wand size={16} /> Lập kế hoạch
              </Link>
            )}
            {role === 'observer' && (
              <span className="badge severity-info no-dot">Chế độ chỉ đọc</span>
            )}
          </>
        }
      />
      <ErrorBanner error={err} />

      <WorkflowGuide role={role} userName={currentUser.name} />

      {!data && !err && (
        <div className="card">
          <Skeleton rows={4} />
        </div>
      )}
      {data && (
        <>
          <KilnStatusCard data={data} />

          {(canApproveLoad(role) || canScheduleLoad(role)) &&
            (pendingDrafts > 0 || pendingApproved > 0) && (
              <ManagerActionStrip
                pendingDrafts={pendingDrafts}
                pendingApproved={pendingApproved}
              />
            )}

          <section aria-label="Chỉ số chính" className="grid grid-cards" style={{ marginBottom: '1.25rem' }}>
            <KpiCard
              label="Đang chờ"
              value={data.waitingPieces}
              help="Món đang chờ đưa vào lò"
              icon={<Icon.Inbox size={18} />}
            />
            <KpiCard
              label="Đủ điều kiện"
              value={data.eligiblePieces}
              help="Món đã sẵn sàng nung"
              tone="success"
              icon={<Icon.Check size={18} />}
            />
            <KpiCard
              label="Bị chặn"
              value={data.blockedPieces}
              tone={data.blockedPieces > 0 ? 'warning' : 'default'}
              icon={<Icon.Alert size={18} />}
              help={
                data.blockReasonBreakdown.length > 0
                  ? data.blockReasonBreakdown
                      .map((r) => `${blockReasonLabel[r.reason] ?? r.reason}: ${r.count}`)
                      .join(' · ')
                  : 'Không có món nào bị chặn'
              }
            />
          </section>

          <div className="grid grid-2">
            <section className="card" aria-labelledby="upcoming-loads-title">
              <div className="card-head">
                <div>
                  <h2 id="upcoming-loads-title" className="card-title">Đợt nung sắp tới</h2>
                  <p className="card-sub">Các đợt đã duyệt hoặc đã lên lịch.</p>
                </div>
                <Link to="/loads" className="btn ghost small">Xem tất cả</Link>
              </div>
              {data.upcomingLoads.length === 0 ? (
                <EmptyState
                  icon={<Icon.Calendar size={24} />}
                  title="Chưa có đợt nung sắp tới"
                  description="Tạo bản nháp đợt nung từ trang Lập kế hoạch để planner gợi ý món phù hợp."
                  action={<Link to="/planner" className="btn small">Vào lập kế hoạch</Link>}
                />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Lò</th>
                        <th scope="col">Cone</th>
                        <th scope="col">Kiểu nung</th>
                        <th scope="col">Trạng thái</th>
                        <th scope="col">Lên lịch</th>
                        <th scope="col"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.upcomingLoads.map((l) => (
                        <tr key={l.id}>
                          <td><strong>{l.kilnName}</strong></td>
                          <td>{targetConeLabel[l.targetCone]}</td>
                          <td>{firingTypeLabel[l.firingType]}</td>
                          <td><LoadStatusBadge status={l.status} /></td>
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
            </section>

            <section className="card" aria-labelledby="kiln-capacity-title">
              <div className="card-head">
                <div>
                  <h2 id="kiln-capacity-title" className="card-title">Sức chứa lò</h2>
                  <p className="card-sub">Số đợt còn chờ xử lý trên mỗi lò.</p>
                </div>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {data.kilnCapacity.map((k) => (
                  <li
                    key={k.kilnId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-md)',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{k.kilnName}</div>
                      <div className="help" style={{ marginTop: 2 }}>{k.capacityNote}</div>
                    </div>
                    <span className="badge" title="Số đợt đang chờ">
                      {k.pendingLoads} đợt chờ
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="card" aria-labelledby="recent-alerts-title">
            <div className="card-head">
              <div>
                <h2 id="recent-alerts-title" className="card-title">Cảnh báo gần đây</h2>
                <p className="card-sub">Các sự kiện cảm biến đã được phát hiện tự động.</p>
              </div>
            </div>
            {data.recentAlerts.length === 0 ? (
              <EmptyState
                icon={<Icon.Sparkles size={24} />}
                title="Không có cảnh báo nào"
                description="Mọi đợt nung đang chạy ổn định."
              />
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {data.recentAlerts.map((a) => (
                  <li key={a.id} className={`alert severity-${a.severity}`}>
                    <span className="icon" aria-hidden="true">!</span>
                    <span>
                      <AlertSeverityBadge severity={a.severity} />{' '}
                      <code style={{ fontSize: '0.75rem', opacity: 0.7 }}>[{a.code}]</code>{' '}
                      {a.message}
                    </span>
                    <Link to={`/loads/${a.loadId}`} style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      xem →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}

function ManagerActionStrip({
  pendingDrafts,
  pendingApproved,
}: {
  pendingDrafts: number;
  pendingApproved: number;
}) {
  return (
    <section className="action-strip" aria-label="Việc cần làm">
      <div className="action-strip-head">
        <Icon.Sparkles size={16} />
        <strong>Việc cần bạn xử lý</strong>
      </div>
      <div className="action-strip-items">
        {pendingDrafts > 0 && (
          <Link to="/loads" className="action-strip-item">
            <span className="action-strip-num">{pendingDrafts}</span>
            <div>
              <div className="action-strip-label">bản nháp chờ duyệt</div>
              <div className="action-strip-sub">Kiểm tra bố trí kệ, điểm số và duyệt.</div>
            </div>
            <Icon.Check size={16} />
          </Link>
        )}
        {pendingApproved > 0 && (
          <Link to="/loads" className="action-strip-item">
            <span className="action-strip-num">{pendingApproved}</span>
            <div>
              <div className="action-strip-label">đợt đã duyệt chờ lên lịch</div>
              <div className="action-strip-sub">Chọn thời điểm vào lò để cả studio cùng biết.</div>
            </div>
            <Icon.Calendar size={16} />
          </Link>
        )}
      </div>
    </section>
  );
}

function KilnStatusCard({ data }: { data: DashboardSummary }) {
  const firingCount = data.upcomingLoads.filter((l) => l.status === 'firing').length;
  const scheduledCount = data.upcomingLoads.filter(
    (l) => l.status === 'approved' || l.status === 'scheduled',
  ).length;
  const totalKilns = data.kilnCapacity.length;
  const pendingTotal = data.kilnCapacity.reduce((sum, k) => sum + k.pendingLoads, 0);
  const headline =
    firingCount > 0
      ? `${firingCount} lò đang nung`
      : scheduledCount > 0
        ? 'Lò sẵn sàng cho đợt tiếp theo'
        : 'Studio yên tĩnh';
  const subline =
    firingCount > 0
      ? 'Theo dõi cảm biến để đảm bảo cone đạt mục tiêu.'
      : scheduledCount > 0
        ? `${scheduledCount} đợt đã duyệt / lên lịch chờ vào lò.`
        : 'Chưa có đợt nung nào đang chạy hay được lên lịch.';

  return (
    <section
      className="kiln-status-card"
      aria-label={`Trạng thái lò nung: ${headline}`}
    >
      <div>
        <div className="label-eyebrow">Phòng lò · {new Date().toLocaleDateString('vi-VN')}</div>
        <h3>{headline}</h3>
        <p style={{ margin: '0.45rem 0 0 0', color: 'rgba(253, 243, 227, 0.75)', maxWidth: '46ch', lineHeight: 1.5 }}>
          {subline}
        </p>
        <div className="kiln-status-meta">
          <span className={`stat-chip${firingCount > 0 ? ' firing' : ''}`}>
            <Icon.Flame size={14} className={firingCount > 0 ? 'flame-flicker' : undefined} />
            Đang nung <strong>{firingCount}</strong>
          </span>
          <span className="stat-chip">
            <Icon.Calendar size={14} />
            Lên lịch <strong>{scheduledCount}</strong>
          </span>
          <span className="stat-chip">
            <Icon.Kiln size={14} />
            Lò khả dụng <strong>{totalKilns}</strong>
          </span>
          <span className="stat-chip">
            <Icon.Stack size={14} />
            Đợt đang xếp <strong>{pendingTotal}</strong>
          </span>
        </div>
      </div>
      <div className="kiln-art-wrap" aria-hidden="true">
        <KilnIllustration size={170} active={firingCount > 0} />
      </div>
    </section>
  );
}
