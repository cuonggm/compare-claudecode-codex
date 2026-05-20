import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FIRING_TYPES,
  TARGET_CONES,
  canEditPiece,
  type Piece,
  type PieceStatus,
  type User,
} from '@kilnflow/shared';
import { api } from '../api';
import { useAuth } from '../state/auth';
import { ErrorBanner } from '../components/ErrorBanner';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { Icon } from '../components/Icon';
import { RoleHintPanel } from '../components/RoleHintPanel';
import {
  clayBodyLabel,
  firingTypeLabel,
  glazeFamilyLabel,
  pieceStatusLabel,
  targetConeLabel,
} from '../i18n';

interface Filters {
  ownerId: string;
  cone: string;
  firingType: string;
  status: string;
  blockedReason: string;
  dueBefore: string;
  search: string;
}

const EMPTY_FILTERS: Filters = {
  ownerId: '',
  cone: '',
  firingType: '',
  status: '',
  blockedReason: '',
  dueBefore: '',
  search: '',
};

const STATUS_OPTIONS: PieceStatus[] = [
  'ready',
  'draft',
  'blocked',
  'in-load',
  'fired',
  'cancelled',
];

const FILTER_LABELS: Record<keyof Filters, string> = {
  ownerId: 'Chủ sở hữu',
  cone: 'Cone',
  firingType: 'Kiểu nung',
  status: 'Trạng thái',
  blockedReason: 'Lý do chặn',
  dueBefore: 'Hạn trước',
  search: 'Tìm',
};

function statusBadgeClass(status: PieceStatus): string {
  switch (status) {
    case 'ready':
      return 'status-completed';
    case 'draft':
      return 'status-draft';
    case 'blocked':
      return 'status-cancelled';
    case 'in-load':
      return 'status-firing';
    case 'fired':
      return 'status-approved';
    case 'cancelled':
      return 'status-cancelled';
  }
}

export function BacklogPage() {
  const { currentUser, users } = useAuth();
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);

  const ownersById: Map<string, User> = useMemo(
    () => new Map(users.map((u) => [u.id, u])),
    [users],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .listPieces({
        ownerId: filters.ownerId || undefined,
        cone: filters.cone || undefined,
        firingType: filters.firingType || undefined,
        status: filters.status || undefined,
        dueBefore: filters.dueBefore ? new Date(filters.dueBefore).toISOString() : undefined,
      })
      .then((data) => {
        if (cancelled) return;
        setPieces(data);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filters.ownerId, filters.cone, filters.firingType, filters.status, filters.dueBefore]);

  const visiblePieces = useMemo(() => {
    let visible = pieces;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      visible = visible.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (ownersById.get(p.ownerId)?.name ?? '').toLowerCase().includes(q),
      );
    }
    if (filters.blockedReason) {
      if (filters.blockedReason === 'under-dry') {
        visible = visible.filter((p) => p.drynessPercent < 80);
      } else if (filters.blockedReason === 'unknown-glaze') {
        visible = visible.filter((p) => p.glazeFamily === 'unknown');
      }
    }
    return visible;
  }, [filters.blockedReason, filters.search, ownersById, pieces]);

  if (!currentUser) return null;

  const activeFilterKeys = (Object.keys(filters) as (keyof Filters)[]).filter(
    (k) => filters[k] !== '',
  );
  const activeFilterCount = activeFilterKeys.length;

  function describeFilter(key: keyof Filters): string {
    const v = filters[key];
    if (!v) return '';
    if (key === 'ownerId') return ownersById.get(v)?.name ?? v;
    if (key === 'cone') return targetConeLabel[v as keyof typeof targetConeLabel] ?? v;
    if (key === 'firingType') return firingTypeLabel[v as keyof typeof firingTypeLabel] ?? v;
    if (key === 'status') return pieceStatusLabel[v as PieceStatus] ?? v;
    if (key === 'blockedReason') return v === 'under-dry' ? 'chưa đủ khô' : 'men không xác định';
    if (key === 'dueBefore') return `trước ${new Date(v).toLocaleDateString('vi-VN')}`;
    if (key === 'search') return `“${v}”`;
    return v;
  }

  function clearFilter(key: keyof Filters) {
    setFilters({ ...filters, [key]: '' });
  }

  return (
    <>
      <PageHeader
        title="Hàng đợi nung"
        subtitle="Toàn bộ pieces đang chờ, sẵn sàng hoặc đã ra khỏi lò."
        meta={
          <>
            <span className="badge">{visiblePieces.length} món hiển thị</span>
            {activeFilterCount > 0 && (
              <span className="badge severity-info">{activeFilterCount} bộ lọc</span>
            )}
          </>
        }
        actions={
          <Link to="/intake" className="btn">
            <Icon.Plus size={16} /> Tiếp nhận món mới
          </Link>
        }
      />
      <RoleHintPanel pageId="backlog" role={currentUser.role} />
      <ErrorBanner error={error} />

      <div className="card">
        <div className="card-head">
          <div>
            <h2 className="card-title">
              <Icon.Filter size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
              Lọc danh sách
            </h2>
            <p className="card-sub">Kết hợp nhiều tiêu chí để thu hẹp hàng đợi.</p>
          </div>
        </div>

        <div className="filter-bar" role="search" aria-label="Lọc hàng đợi">
          <div className="field">
            <label htmlFor="f-search">Tìm kiếm</label>
            <input
              id="f-search"
              type="search"
              placeholder="tên món hoặc chủ sở hữu"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="f-owner">Chủ sở hữu</label>
            <select
              id="f-owner"
              value={filters.ownerId}
              onChange={(e) => setFilters({ ...filters, ownerId: e.target.value })}
            >
              <option value="">Tất cả</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-cone">Cone</label>
            <select
              id="f-cone"
              value={filters.cone}
              onChange={(e) => setFilters({ ...filters, cone: e.target.value })}
            >
              <option value="">Tất cả</option>
              {TARGET_CONES.map((c) => (
                <option key={c} value={c}>{targetConeLabel[c]}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-firing">Kiểu nung</label>
            <select
              id="f-firing"
              value={filters.firingType}
              onChange={(e) => setFilters({ ...filters, firingType: e.target.value })}
            >
              <option value="">Tất cả</option>
              {FIRING_TYPES.map((f) => (
                <option key={f} value={f}>{firingTypeLabel[f]}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-status">Trạng thái</label>
            <select
              id="f-status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Tất cả</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{pieceStatusLabel[s]}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-blocked">Lý do chặn</label>
            <select
              id="f-blocked"
              value={filters.blockedReason}
              onChange={(e) => setFilters({ ...filters, blockedReason: e.target.value })}
            >
              <option value="">Bất kỳ</option>
              <option value="under-dry">chưa đủ khô</option>
              <option value="unknown-glaze">men không xác định</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-due">Hạn trước ngày</label>
            <input
              id="f-due"
              type="date"
              value={filters.dueBefore}
              onChange={(e) => setFilters({ ...filters, dueBefore: e.target.value })}
            />
          </div>
        </div>

        <div className="filter-actions">
          <div className="row" style={{ gap: '0.4rem' }}>
            {activeFilterCount === 0 ? (
              <span className="filter-summary">Không có bộ lọc nào đang áp dụng.</span>
            ) : (
              activeFilterKeys.map((k) => (
                <span key={k} className="chip">
                  <span style={{ opacity: 0.7 }}>{FILTER_LABELS[k]}:</span>
                  <strong>{describeFilter(k)}</strong>
                  <button
                    type="button"
                    aria-label={`Xóa bộ lọc ${FILTER_LABELS[k]}`}
                    onClick={() => clearFilter(k)}
                  >
                    <Icon.X size={12} />
                  </button>
                </span>
              ))
            )}
          </div>
          <button
            className="ghost small"
            onClick={() => setFilters(EMPTY_FILTERS)}
            disabled={activeFilterCount === 0}
          >
            <Icon.X size={14} /> Xóa tất cả
          </button>
        </div>
      </div>

      <div className="card flush">
        {loading ? (
          <div style={{ padding: '1.25rem' }}>
            <Skeleton rows={5} />
          </div>
        ) : visiblePieces.length === 0 ? (
          <EmptyState
            icon={<Icon.Search size={26} />}
            title="Không có món nào khớp bộ lọc"
            description="Thử bỏ bớt tiêu chí hoặc đổi từ khóa tìm kiếm."
            action={
              activeFilterCount > 0 && (
                <button className="secondary small" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Xóa tất cả bộ lọc
                </button>
              )
            }
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Tên món</th>
                  <th scope="col">Chủ sở hữu</th>
                  <th scope="col">Đất</th>
                  <th scope="col">Men</th>
                  <th scope="col">Cone</th>
                  <th scope="col">Kiểu nung</th>
                  <th scope="col" className="num">R×S×C</th>
                  <th scope="col" className="num">kg</th>
                  <th scope="col" className="num">Khô %</th>
                  <th scope="col">Hạn</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                {visiblePieces.map((p) => {
                  const canEdit =
                    canEditPiece(currentUser.role) &&
                    (currentUser.role !== 'member' || p.ownerId === currentUser.id);
                  const owner = ownersById.get(p.ownerId)?.name ?? p.ownerId;
                  const dryClass =
                    p.drynessPercent < 80 ? 'severity-warning' : 'no-dot';
                  return (
                    <tr key={p.id}>
                      <td><strong>{p.name}</strong></td>
                      <td>{owner}</td>
                      <td>{clayBodyLabel[p.clayBody]}</td>
                      <td>
                        {p.glazeFamily === 'unknown' ? (
                          <span className="badge severity-warning no-dot">không xác định</span>
                        ) : (
                          glazeFamilyLabel[p.glazeFamily]
                        )}
                      </td>
                      <td>{targetConeLabel[p.targetCone]}</td>
                      <td>{firingTypeLabel[p.firingType]}</td>
                      <td className="num">
                        {p.widthCm}×{p.depthCm}×{p.heightCm}
                      </td>
                      <td className="num">{p.weightKg}</td>
                      <td className="num">
                        <span className={`badge ${dryClass}`}>{p.drynessPercent}%</span>
                      </td>
                      <td>{new Date(p.dueDate).toLocaleDateString('vi-VN')}</td>
                      <td>
                        <span className={`badge ${statusBadgeClass(p.status)}`}>
                          {pieceStatusLabel[p.status]}
                        </span>
                      </td>
                      <td>
                        {canEdit && (
                          <Link to={`/intake/${p.id}`} aria-label={`Sửa món ${p.name}`}>
                            sửa →
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
