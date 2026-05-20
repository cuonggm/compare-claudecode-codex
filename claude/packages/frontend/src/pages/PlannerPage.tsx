import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FIRING_TYPES,
  TARGET_CONES,
  canRunPlanner,
  type FiringType,
  type Kiln,
  type Piece,
  type PlannerResult,
  type TargetCone,
} from '@kilnflow/shared';
import { api } from '../api';
import { useAuth } from '../state/auth';
import { ErrorBanner } from '../components/ErrorBanner';
import { ShelfLayout } from '../components/ShelfLayout';
import { ExclusionList } from '../components/ExclusionList';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { CapacityBar } from '../components/CapacityBar';
import { Icon } from '../components/Icon';
import { RoleHintPanel } from '../components/RoleHintPanel';
import { firingTypeLabel, roleLabel, targetConeLabel } from '../i18n';

export function PlannerPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [kilns, setKilns] = useState<Kiln[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [kilnId, setKilnId] = useState<string>('');
  const [targetCone, setTargetCone] = useState<TargetCone>('6');
  const [firingType, setFiringType] = useState<FiringType>('oxidation');
  const [preview, setPreview] = useState<PlannerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.listKilns().then((k) => {
      setKilns(k);
      if (k[0]) setKilnId(k[0].id);
    }).catch((e: Error) => setError(e.message));
    api.listPieces().then(setPieces).catch((e: Error) => setError(e.message));
  }, []);

  if (!currentUser) return null;
  if (!canRunPlanner(currentUser.role)) {
    return (
      <>
        <PageHeader
          title="Lập kế hoạch tự động"
          subtitle="Auto-planner ghép pieces vào lò theo cone, firing-type và sức chứa."
        />
        <div className="card">
          <EmptyState
            icon={<Icon.Alert size={24} />}
            title="Bạn không có quyền truy cập"
            description={`Vai trò ${roleLabel[currentUser.role]} không thể chạy auto-planner. Liên hệ kỹ thuật viên hoặc quản lý để được hỗ trợ.`}
          />
        </div>
      </>
    );
  }

  const kiln = kilns.find((k) => k.id === kilnId) ?? null;

  async function runPreview() {
    if (!kilnId) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.previewPlan({ kilnId, targetCone, firingType });
      setPreview(r);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!kilnId) return;
    setBusy(true);
    setError(null);
    try {
      const load = await api.createLoad({ kilnId, targetCone, firingType });
      navigate(`/loads/${load.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Lập kế hoạch tự động"
        subtitle="Auto-planner ghép pieces vào lò theo cone, firing-type và sức chứa kệ."
      />

      <RoleHintPanel pageId="planner" role={currentUser.role} />

      <ErrorBanner error={error} />

      <div className="card">
        <div className="steps" aria-label="Quy trình lập kế hoạch">
          <span className={`step ${!preview ? 'active' : 'done'}`}>
            <span className="step-num">1</span> Chọn lò &amp; cấu hình
          </span>
          <span className="step-divider" />
          <span className={`step ${preview && !busy ? 'active' : ''}`}>
            <span className="step-num">2</span> Xem trước
          </span>
          <span className="step-divider" />
          <span className="step">
            <span className="step-num">3</span> Tạo bản nháp
          </span>
        </div>

        <div className="field-row" style={{ marginTop: '0.5rem' }}>
          <div className="field">
            <label htmlFor="kiln">Lò nung</label>
            <select id="kiln" value={kilnId} onChange={(e) => setKilnId(e.target.value)}>
              {kilns.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
            {kiln && (
              <p className="help">
                {kiln.shelves} kệ · {kiln.shelfWidthCm}×{kiln.shelfDepthCm}cm · tối đa {kiln.maxWeightKg}kg · cao tối đa {kiln.maxHeightPerShelfCm}cm/kệ
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="cone">Cone mục tiêu</label>
            <select
              id="cone"
              value={targetCone}
              onChange={(e) => setTargetCone(e.target.value as TargetCone)}
            >
              {TARGET_CONES.map((c) => (
                <option key={c} value={c}>{targetConeLabel[c]}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="firing">Kiểu nung</label>
            <select
              id="firing"
              value={firingType}
              onChange={(e) => setFiringType(e.target.value as FiringType)}
            >
              {FIRING_TYPES.map((f) => (
                <option key={f} value={f}>{firingTypeLabel[f]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="row" style={{ marginTop: '0.5rem' }}>
          <button onClick={runPreview} disabled={busy || !kilnId}>
            <Icon.Wand size={16} />
            {busy && !preview ? 'Đang chạy planner…' : 'Xem trước kế hoạch'}
          </button>
          <button className="secondary" onClick={commit} disabled={busy || !preview}>
            <Icon.Plus size={16} />
            Tạo bản nháp đợt nung
          </button>
          {preview && (
            <span className="inline-meta" style={{ marginLeft: 'auto' }}>
              <Icon.Sparkles size={14} />
              Planner gợi ý {preview.selectedPieceIds.length} món · loại {preview.excluded.length} · điểm {preview.score}
            </span>
          )}
        </div>
      </div>

      {preview && kiln && (
        <PreviewResult plan={preview} kiln={kiln} pieces={pieces} />
      )}

      {!preview && (
        <div className="card">
          <EmptyState
            icon={<Icon.Wand size={26} />}
            title="Chưa có bản xem trước"
            description="Chọn lò, cone và kiểu nung rồi nhấn “Xem trước kế hoạch” để planner phân tích hàng đợi."
          />
        </div>
      )}
    </>
  );
}

function PreviewResult({
  plan,
  kiln,
  pieces,
}: {
  plan: PlannerResult;
  kiln: Kiln;
  pieces: Piece[];
}) {
  const piecesById = new Map(pieces.map((p) => [p.id, p]));
  const selected = plan.selectedPieceIds
    .map((id) => piecesById.get(id))
    .filter((p): p is Piece => Boolean(p));

  return (
    <>
      <section className="card" aria-label="Sức chứa">
        <div className="card-head">
          <div>
            <h2 className="card-title">Sức chứa &amp; điểm số</h2>
            <p className="card-sub">Mức tải hiện tại trên lò {kiln.name}.</p>
          </div>
          <span className="badge severity-info no-dot">Điểm tổng: {plan.score}</span>
        </div>
        <div className="capacity-grid">
          <CapacityBar label="Cân nặng" percent={plan.capacity.weightPercent} />
          <CapacityBar label="Diện tích kệ" percent={plan.capacity.footprintPercent} />
          <CapacityBar label="Thể tích" percent={plan.capacity.volumePercent} />
        </div>
        {plan.warnings.length > 0 && (
          <ul aria-label="Cảnh báo từ planner" style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
            {plan.warnings.map((w) => (
              <li key={w.code} className="alert severity-warning">
                <span className="icon" aria-hidden="true">!</span>
                <span>
                  <code style={{ opacity: 0.6, fontSize: '0.75rem', marginRight: 4 }}>
                    [{w.code}]
                  </code>
                  {w.message}
                </span>
                <span />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" aria-label="Bố trí kệ">
        <div className="card-head">
          <div>
            <h2 className="card-title">Bố trí kệ</h2>
            <p className="card-sub">{kiln.shelves} kệ — {kiln.shelfWidthCm}×{kiln.shelfDepthCm}cm mỗi kệ.</p>
          </div>
        </div>
        <ShelfLayout plan={plan} kiln={kiln} piecesById={piecesById} />
      </section>

      <section className="card" aria-label="Món được chọn">
        <div className="card-head">
          <div>
            <h2 className="card-title">Món đã chọn</h2>
            <p className="card-sub">{selected.length} món được ghép vào lò.</p>
          </div>
          <span className="badge status-completed">{selected.length} món</span>
        </div>
        {selected.length === 0 ? (
          <p className="help">Không có món nào được chọn.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Tên món</th>
                  <th scope="col" className="num">Kệ</th>
                  <th scope="col">Vị trí (cm)</th>
                  <th scope="col" className="num">R×S×C</th>
                  <th scope="col" className="num">Cân nặng</th>
                </tr>
              </thead>
              <tbody>
                {plan.shelfAssignments.map((a) => {
                  const p = piecesById.get(a.pieceId);
                  if (!p) return null;
                  return (
                    <tr key={a.pieceId}>
                      <td><strong>{p.name}</strong></td>
                      <td className="num">{a.shelfIndex + 1}</td>
                      <td>x={a.x}, y={a.y}</td>
                      <td className="num">
                        {a.widthCm}×{a.depthCm}×{a.heightCm}
                      </td>
                      <td className="num">{a.weightKg} kg</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card" aria-label="Món bị loại trừ">
        <div className="card-head">
          <div>
            <h2 className="card-title">Bị loại trừ</h2>
            <p className="card-sub">Pieces không phù hợp cấu hình hiện tại.</p>
          </div>
          <span className="badge severity-warning">{plan.excluded.length} món</span>
        </div>
        <ExclusionList excluded={plan.excluded} piecesById={piecesById} />
      </section>
    </>
  );
}
