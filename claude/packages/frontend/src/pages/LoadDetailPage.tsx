import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  canAddTechnicalNote,
  canApproveLoad,
  canCancelLoad,
  canImportSensorCsv,
  canRunPlanner,
  canScheduleLoad,
  type Alert,
  type Kiln,
  type KilnLoad,
  type Piece,
  type SensorReading,
} from '@kilnflow/shared';
import { ApiError, api } from '../api';
import { useAuth } from '../state/auth';
import { ErrorBanner } from '../components/ErrorBanner';
import { ExclusionList } from '../components/ExclusionList';
import { SensorChart } from '../components/SensorChart';
import { ShelfLayout } from '../components/ShelfLayout';
import {
  AlertSeverityBadge,
  LoadStatusBadge,
} from '../components/StatusBadge';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { KilnIllustration } from '../components/KilnIllustration';
import { RoleHintPanel } from '../components/RoleHintPanel';
import { firingTypeLabel, roleLabel, targetConeLabel } from '../i18n';

function authorInitials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function LoadDetailPage() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const [load, setLoad] = useState<KilnLoad | null>(null);
  const [kiln, setKiln] = useState<Kiln | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<KilnLoad | null>(null);
  const [busy, setBusy] = useState(false);
  const [noteBody, setNoteBody] = useState('');
  const [csvText, setCsvText] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const [l, kilns, ps, rs, as] = await Promise.all([
        api.getLoad(id),
        api.listKilns(),
        api.listPieces(),
        api.listSensorReadings(id),
        api.listAlerts(id),
      ]);
      setLoad(l);
      setKiln(kilns.find((k) => k.id === l.kilnId) ?? null);
      setPieces(ps);
      setReadings(rs);
      setAlerts(as);
      setConflict(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!currentUser) return null;
  if (!load || !kiln) {
    return (
      <div className="card">
        <p className="help">Đang tải đợt nung…</p>
      </div>
    );
  }

  async function performAction(label: string, fn: () => Promise<KilnLoad>) {
    if (!load) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await fn();
      setLoad(updated);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const body = err.body as { current?: KilnLoad };
        setConflict(body?.current ?? null);
        setError(
          `Xung đột: ai đó vừa cập nhật đợt nung này. Hãy tải lại trang để xem phiên bản mới trước khi thử lại thao tác "${label}".`,
        );
      } else {
        setError((err as Error).message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function addNote() {
    if (!load || !noteBody.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.addNote(load.id, noteBody.trim());
      setNoteBody('');
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function importCsv() {
    if (!load || !csvText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.importSensorCsv(load.id, csvText);
      setCsvText('');
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const piecesById = new Map(pieces.map((p) => [p.id, p]));
  const role = currentUser.role;
  const hasAnyAction =
    canRunPlanner(role) ||
    canApproveLoad(role) ||
    canScheduleLoad(role) ||
    canCancelLoad(role);
  const isFiring = load.status === 'firing';

  return (
    <>
      <PageHeader
        title={
          <>
            {kiln.name} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>·</span>{' '}
            <span style={{ fontWeight: 500, color: 'var(--text-soft)' }}>
              {targetConeLabel[load.targetCone]} · {firingTypeLabel[load.firingType]}
            </span>
          </>
        }
        subtitle={
          <>
            <Link to="/loads">← Quay lại danh sách đợt nung</Link>
          </>
        }
        meta={
          <>
            <LoadStatusBadge status={load.status} />
            <span className="badge version no-dot">v{load.version}</span>
            {load.scheduledAt && (
              <span className="inline-meta">
                <Icon.Calendar size={14} />
                {new Date(load.scheduledAt).toLocaleString('vi-VN')}
              </span>
            )}
            <span className="inline-meta">
              <Icon.Box size={14} />
              {load.plan.selectedPieceIds.length} món
            </span>
          </>
        }
      />
      <RoleHintPanel pageId="load-detail" role={role} />
      <ErrorBanner error={error} />

      {isFiring && (
        <section className="kiln-status-card" aria-label="Đợt nung đang chạy">
          <div>
            <div className="label-eyebrow">Đang nung · cập nhật trực tiếp</div>
            <h3>{kiln.name} đang đỏ lửa</h3>
            <p style={{ margin: '0.45rem 0 0 0', color: 'rgba(253, 243, 227, 0.78)', maxWidth: '52ch', lineHeight: 1.5 }}>
              Theo dõi đường nhiệt thực tế so với mục tiêu {targetConeLabel[load.targetCone]}.
              Hệ thống tự động phát cảnh báo khi vượt ngưỡng — đừng rời mắt khỏi cone.
            </p>
            <div className="kiln-status-meta">
              <span className="stat-chip firing">
                <Icon.Flame size={14} className="flame-flicker" />
                <strong>{firingTypeLabel[load.firingType]}</strong>
              </span>
              <span className="stat-chip">
                <Icon.Box size={14} />
                <strong>{load.plan.selectedPieceIds.length}</strong> món trong lò
              </span>
              {alerts.length > 0 && (
                <span className="stat-chip">
                  <Icon.Alert size={14} />
                  <strong>{alerts.length}</strong> cảnh báo
                </span>
              )}
            </div>
          </div>
          <div className="kiln-art-wrap" aria-hidden="true">
            <KilnIllustration size={170} />
          </div>
        </section>
      )}

      {conflict && (
        <div className="card" role="alert" style={{ borderColor: 'var(--warning)', borderLeftWidth: 4, borderLeftStyle: 'solid', borderLeftColor: 'var(--warning)' }}>
          <div className="row between">
            <div>
              <strong>Xung đột phiên bản</strong>
              <p className="help" style={{ margin: '0.25rem 0 0 0' }}>
                Phiên bản hiện tại trên máy chủ là v{conflict.version}, trạng thái{' '}
                <LoadStatusBadge status={conflict.status} />. Hãy tải lại rồi thử lại.
              </p>
            </div>
            <button onClick={refresh}>
              <Icon.Refresh size={16} /> Tải lại ngay
            </button>
          </div>
        </div>
      )}

      <section className="card" aria-label="Thao tác">
        <div className="card-head">
          <div>
            <h2 className="card-title">Thao tác</h2>
            <p className="card-sub">
              Các hành động khả dụng theo vai trò <strong>{roleLabel[role]}</strong> và trạng thái hiện tại.
            </p>
          </div>
        </div>
        <div className="row" style={{ gap: '0.5rem' }}>
          {canRunPlanner(role) && load.status === 'draft' && (
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                performAction('Tạo lại kế hoạch', () => api.regenerateLoad(load.id, load.version))
              }
            >
              <Icon.Refresh size={16} /> Tạo lại kế hoạch
            </button>
          )}
          {canApproveLoad(role) && load.status === 'draft' && (
            <button
              disabled={busy}
              onClick={() => performAction('Duyệt', () => api.approveLoad(load.id, load.version))}
            >
              <Icon.Check size={16} /> Duyệt
            </button>
          )}
          {canScheduleLoad(role) &&
            (load.status === 'approved' || load.status === 'draft') && (
              <span className="row" style={{ gap: '0.4rem' }}>
                <label htmlFor="schedule-at" className="sr-only">
                  Thời điểm lên lịch
                </label>
                <input
                  id="schedule-at"
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  style={{ width: 'auto' }}
                />
                <button
                  disabled={busy || !scheduleDate}
                  onClick={() =>
                    performAction('Lên lịch', () =>
                      api.scheduleLoad(
                        load.id,
                        load.version,
                        new Date(scheduleDate).toISOString(),
                      ),
                    )
                  }
                >
                  <Icon.Calendar size={16} /> Lên lịch
                </button>
              </span>
            )}
          {canCancelLoad(role) &&
            load.status !== 'cancelled' &&
            load.status !== 'completed' && (
              <button
                className="danger"
                disabled={busy}
                onClick={() => performAction('Hủy đợt nung', () => api.cancelLoad(load.id, load.version))}
                style={{ marginLeft: hasAnyAction ? 'auto' : undefined }}
              >
                <Icon.X size={16} /> Hủy đợt nung
              </button>
            )}
          {!hasAnyAction && (
            <span className="help">
              Chỉ đọc — vai trò <strong>{roleLabel[role]}</strong> không thực hiện được thao tác trên đợt nung.
            </span>
          )}
        </div>
      </section>

      <div className="grid grid-2">
        <section className="card" aria-label="Món được chọn">
          <div className="card-head">
            <div>
              <h2 className="card-title">Món đã chọn</h2>
              <p className="card-sub">{load.plan.selectedPieceIds.length} món trong đợt này.</p>
            </div>
          </div>
          {load.plan.selectedPieceIds.length === 0 ? (
            <p className="help">Không có món nào được chọn.</p>
          ) : (
            <ul className="pieces-list">
              {load.plan.selectedPieceIds.map((pid) => (
                <li key={pid}>{piecesById.get(pid)?.name ?? pid}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="card" aria-label="Cảnh báo">
          <div className="card-head">
            <div>
              <h2 className="card-title">Cảnh báo</h2>
              <p className="card-sub">{alerts.length} sự kiện sensor đã phát hiện.</p>
            </div>
            {alerts.length > 0 && (
              <span className="badge severity-warning">{alerts.length}</span>
            )}
          </div>
          {alerts.length === 0 ? (
            <EmptyState
              icon={<Icon.Sparkles size={22} />}
              title="Chưa có cảnh báo"
              description="Đợt nung đang chạy ổn định."
            />
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {alerts.map((a) => (
                <li key={a.id} className={`alert severity-${a.severity}`}>
                  <span className="icon" aria-hidden="true">!</span>
                  <span>
                    <AlertSeverityBadge severity={a.severity} />{' '}
                    <code style={{ fontSize: '0.72rem', opacity: 0.7 }}>[{a.code}]</code>{' '}
                    {a.message}
                  </span>
                  <small>{new Date(a.createdAt).toLocaleString('vi-VN')}</small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card" aria-label="Bố trí kệ">
        <div className="card-head">
          <div>
            <h2 className="card-title">Bố trí kệ</h2>
            <p className="card-sub">
              {kiln.shelves} kệ — {kiln.shelfWidthCm}×{kiln.shelfDepthCm}cm mỗi kệ.
            </p>
          </div>
        </div>
        <ShelfLayout plan={load.plan} kiln={kiln} piecesById={piecesById} />
      </section>

      <section className="card" aria-label="Món bị loại trừ">
        <div className="card-head">
          <div>
            <h2 className="card-title">Bị loại trừ</h2>
            <p className="card-sub">Pieces không phù hợp với cấu hình đợt nung.</p>
          </div>
          <span className="badge severity-warning">{load.plan.excluded.length} món</span>
        </div>
        <ExclusionList excluded={load.plan.excluded} piecesById={piecesById} />
      </section>

      <section
        className={`card${isFiring ? ' is-firing' : ''}`}
        aria-label="Dữ liệu cảm biến"
      >
        <div className="card-head">
          <div>
            <h2 className="card-title">
              {isFiring && (
                <Icon.Flame
                  size={18}
                  className="flame-flicker"
                  style={{ verticalAlign: -3, marginRight: 6, color: 'var(--ember)' }}
                />
              )}
              Giám sát đợt nung
            </h2>
            <p className="card-sub">Nhiệt độ thực tế so với mục tiêu, alerting tự động.</p>
          </div>
        </div>
        <SensorChart readings={readings} />
        {canImportSensorCsv(role) && (
          <div className="form-section" style={{ marginTop: '1rem' }}>
            <h3>
              <Icon.Upload size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
              Nhập CSV cảm biến
            </h3>
            <p className="help" style={{ marginBottom: '0.5rem' }}>
              Định dạng: <code>timestamp,tempC,targetTempC,note</code> — mỗi dòng một điểm đo.
            </p>
            <textarea
              id="csv-input"
              rows={6}
              value={csvText}
              placeholder={'timestamp,tempC,targetTempC,note\n2026-05-19T09:00:00Z,24,24,bắt đầu'}
              onChange={(e) => setCsvText(e.target.value)}
            />
            <div className="row" style={{ marginTop: '0.5rem' }}>
              <button onClick={importCsv} disabled={busy || !csvText.trim()}>
                <Icon.Upload size={16} /> Nhập CSV
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="card" aria-label="Ghi chú kiểm toán">
        <div className="card-head">
          <div>
            <h2 className="card-title">
              <Icon.Note size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
              Ghi chú kiểm toán
            </h2>
            <p className="card-sub">Lịch sử ghi chú kỹ thuật, không thể xóa.</p>
          </div>
          <span className="badge no-dot">{load.notes.length} ghi chú</span>
        </div>
        {load.notes.length === 0 ? (
          <p className="help">Chưa có ghi chú nào.</p>
        ) : (
          <ul className="note-list">
            {load.notes.map((n) => (
              <li key={n.id} className="note">
                <div className="avatar" aria-hidden="true">{authorInitials(n.authorName)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="note-meta">
                    <strong>{n.authorName}</strong>
                    <span>·</span>
                    <span>{roleLabel[n.authorRole]}</span>
                    <span>·</span>
                    <span>{new Date(n.createdAt).toLocaleString('vi-VN')}</span>
                  </div>
                  <div className="note-body">{n.body}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {canAddTechnicalNote(role) && (
          <div className="form-section" style={{ marginTop: '1rem' }}>
            <label htmlFor="note-body">Thêm ghi chú kỹ thuật</label>
            <textarea
              id="note-body"
              rows={3}
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Mô tả ngắn về quan sát, điều chỉnh hoặc lý do thao tác…"
            />
            <div className="row" style={{ marginTop: '0.5rem' }}>
              <button onClick={addNote} disabled={busy || !noteBody.trim()}>
                <Icon.Note size={16} /> Thêm ghi chú
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
