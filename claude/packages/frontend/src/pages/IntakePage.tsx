import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CLAY_BODIES,
  FIRING_TYPES,
  GLAZE_FAMILIES,
  TARGET_CONES,
  type Piece,
} from '@kilnflow/shared';
import { api } from '../api';
import { useAuth } from '../state/auth';
import { ErrorBanner } from '../components/ErrorBanner';
import { PageHeader } from '../components/PageHeader';
import { Skeleton } from '../components/Skeleton';
import { Icon } from '../components/Icon';
import { RoleHintPanel } from '../components/RoleHintPanel';
import {
  clayBodyLabel,
  firingTypeLabel,
  glazeFamilyLabel,
  pieceStatusLabel,
  roleLabel,
  targetConeLabel,
} from '../i18n';
import type { PieceStatus } from '@kilnflow/shared';

interface FormState {
  ownerId: string;
  name: string;
  clayBody: string;
  glazeFamily: string;
  targetCone: string;
  firingType: string;
  widthCm: string;
  depthCm: string;
  heightCm: string;
  weightKg: string;
  drynessPercent: string;
  dueDate: string;
  notes: string;
  status: string;
}

function defaultForm(ownerId: string): FormState {
  const due = new Date();
  due.setDate(due.getDate() + 14);
  return {
    ownerId,
    name: '',
    clayBody: 'stoneware',
    glazeFamily: 'clear',
    targetCone: '6',
    firingType: 'oxidation',
    widthCm: '',
    depthCm: '',
    heightCm: '',
    weightKg: '',
    drynessPercent: '',
    dueDate: due.toISOString().slice(0, 10),
    notes: '',
    status: 'ready',
  };
}

const PIECE_STATUS_OPTIONS: PieceStatus[] = [
  'ready',
  'draft',
  'blocked',
  'in-load',
  'fired',
  'cancelled',
];

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <div id={id} className="field-error">
      <Icon.Alert size={12} /> {message}
    </div>
  );
}

export function IntakePage() {
  const { currentUser, users } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState<FormState>(() => defaultForm(currentUser?.id ?? ''));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));

  useEffect(() => {
    if (!id) {
      setForm(defaultForm(currentUser?.id ?? ''));
      return;
    }
    setLoading(true);
    api
      .getPiece(id)
      .then((p) => {
        setForm({
          ownerId: p.ownerId,
          name: p.name,
          clayBody: p.clayBody,
          glazeFamily: p.glazeFamily,
          targetCone: p.targetCone,
          firingType: p.firingType,
          widthCm: String(p.widthCm),
          depthCm: String(p.depthCm),
          heightCm: String(p.heightCm),
          weightKg: String(p.weightKg),
          drynessPercent: String(p.drynessPercent),
          dueDate: p.dueDate.slice(0, 10),
          notes: p.notes,
          status: p.status,
        });
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, currentUser?.id]);

  if (!currentUser) return null;
  if (loading) {
    return (
      <div className="card">
        <Skeleton rows={6} />
      </div>
    );
  }

  const role = currentUser.role;
  const canManageOwner = role === 'technician' || role === 'manager';

  function validate(): { ok: boolean; payload: Record<string, unknown> } {
    const errs: Record<string, string> = {};
    const widthCm = Number(form.widthCm);
    const depthCm = Number(form.depthCm);
    const heightCm = Number(form.heightCm);
    const weightKg = Number(form.weightKg);
    const drynessPercent = Number(form.drynessPercent);

    if (!form.name.trim()) errs.name = 'Tên là bắt buộc.';
    if (!(widthCm > 0)) errs.widthCm = 'Chiều rộng phải lớn hơn 0.';
    if (!(depthCm > 0)) errs.depthCm = 'Chiều sâu phải lớn hơn 0.';
    if (!(heightCm > 0)) errs.heightCm = 'Chiều cao phải lớn hơn 0.';
    if (!(weightKg > 0)) errs.weightKg = 'Cân nặng phải lớn hơn 0.';
    if (
      Number.isNaN(drynessPercent) ||
      drynessPercent < 0 ||
      drynessPercent > 100
    )
      errs.drynessPercent = 'Độ khô phải từ 0 đến 100.';
    if (!form.dueDate || Number.isNaN(new Date(form.dueDate).getTime()))
      errs.dueDate = 'Hạn nung là bắt buộc.';

    setFieldErrors(errs);
    return {
      ok: Object.keys(errs).length === 0,
      payload: {
        ownerId: form.ownerId,
        name: form.name.trim(),
        clayBody: form.clayBody,
        glazeFamily: form.glazeFamily,
        targetCone: form.targetCone,
        firingType: form.firingType,
        widthCm,
        depthCm,
        heightCm,
        weightKg,
        drynessPercent,
        dueDate: new Date(form.dueDate).toISOString(),
        notes: form.notes,
        status: form.status,
      },
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { ok, payload } = validate();
    if (!ok) return;
    setSaving(true);
    try {
      if (id) {
        await api.updatePiece(id, payload as Partial<Piece> & { ownerId: string; name: string });
      } else {
        await api.createPiece(payload as Parameters<typeof api.createPiece>[0]);
      }
      navigate('/backlog');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const errorCount = Object.keys(fieldErrors).length;

  return (
    <>
      <PageHeader
        title={id ? 'Sửa thông tin món' : 'Đăng ký món mới'}
        subtitle={
          id
            ? 'Cập nhật thông số piece. Thay đổi áp dụng ngay cho lần lập kế hoạch tiếp theo.'
            : 'Đăng ký piece mới vào hàng đợi. Planner sẽ tự kiểm tra tính phù hợp.'
        }
      />
      <RoleHintPanel pageId="intake" role={currentUser.role} />
      <ErrorBanner error={error} />
      {errorCount > 0 && (
        <div role="alert" className="error-banner">
          <Icon.Alert className="icon" size={20} />
          <div>
            Còn {errorCount} trường cần sửa trước khi lưu. Cuộn xuống để xem chi tiết.
          </div>
        </div>
      )}

      <form className="card" onSubmit={submit} noValidate>
        <div className="form-section">
          <div className="section-eyebrow">1 · Thông tin chung</div>
          <h3>Chủ sở hữu &amp; tên món</h3>
          <div className="field-row">
            <div className="field">
              <label htmlFor="ownerId">Chủ sở hữu</label>
              <select
                id="ownerId"
                value={form.ownerId}
                onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
                disabled={!canManageOwner}
              >
                {users
                  .filter((u) => u.role === 'member' || canManageOwner)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({roleLabel[u.role]})
                    </option>
                  ))}
              </select>
              {!canManageOwner && (
                <p className="help">Chỉ kỹ thuật viên hoặc quản lý mới được đổi chủ sở hữu.</p>
              )}
            </div>
            <div className="field">
              <label htmlFor="name">Tên món</label>
              <input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? 'name-err' : undefined}
                placeholder="vd. Bình hoa men celadon"
                required
              />
              <FieldError id="name-err" message={fieldErrors.name} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-eyebrow">2 · Vật liệu &amp; cấu hình nung</div>
          <h3>Đất, men và mục tiêu nhiệt</h3>
          <div className="field-row">
            <div className="field">
              <label htmlFor="clayBody">Loại đất</label>
              <select
                id="clayBody"
                value={form.clayBody}
                onChange={(e) => setForm({ ...form, clayBody: e.target.value })}
              >
                {CLAY_BODIES.map((c) => (
                  <option key={c} value={c}>
                    {clayBodyLabel[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="glazeFamily">Họ men</label>
              <select
                id="glazeFamily"
                value={form.glazeFamily}
                onChange={(e) => setForm({ ...form, glazeFamily: e.target.value })}
              >
                {GLAZE_FAMILIES.map((g) => (
                  <option key={g} value={g}>
                    {glazeFamilyLabel[g]}
                  </option>
                ))}
              </select>
              {form.glazeFamily === 'unknown' && (
                <p className="help" style={{ color: 'var(--warning)' }}>
                  ⚠ Men không xác định vẫn được lưu nhưng sẽ bị loại khỏi lập kế hoạch
                  tự động cho đến khi kỹ thuật viên xem xét.
                </p>
              )}
            </div>
            <div className="field">
              <label htmlFor="targetCone">Cone mục tiêu</label>
              <select
                id="targetCone"
                value={form.targetCone}
                onChange={(e) => setForm({ ...form, targetCone: e.target.value })}
              >
                {TARGET_CONES.map((c) => (
                  <option key={c} value={c}>{targetConeLabel[c]}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="firingType">Kiểu nung</label>
              <select
                id="firingType"
                value={form.firingType}
                onChange={(e) => setForm({ ...form, firingType: e.target.value })}
              >
                {FIRING_TYPES.map((f) => (
                  <option key={f} value={f}>{firingTypeLabel[f]}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-eyebrow">3 · Kích thước &amp; cân nặng</div>
          <h3>Đo đạc piece</h3>
          <div className="field-row">
            <div className="field">
              <label htmlFor="widthCm">Chiều rộng (cm)</label>
              <input
                id="widthCm"
                type="number"
                step="0.1"
                value={form.widthCm}
                onChange={(e) => setForm({ ...form, widthCm: e.target.value })}
                aria-invalid={Boolean(fieldErrors.widthCm)}
                aria-describedby={fieldErrors.widthCm ? 'widthCm-err' : undefined}
                required
              />
              <FieldError id="widthCm-err" message={fieldErrors.widthCm} />
            </div>
            <div className="field">
              <label htmlFor="depthCm">Chiều sâu (cm)</label>
              <input
                id="depthCm"
                type="number"
                step="0.1"
                value={form.depthCm}
                onChange={(e) => setForm({ ...form, depthCm: e.target.value })}
                aria-invalid={Boolean(fieldErrors.depthCm)}
                aria-describedby={fieldErrors.depthCm ? 'depthCm-err' : undefined}
                required
              />
              <FieldError id="depthCm-err" message={fieldErrors.depthCm} />
            </div>
            <div className="field">
              <label htmlFor="heightCm">Chiều cao (cm)</label>
              <input
                id="heightCm"
                type="number"
                step="0.1"
                value={form.heightCm}
                onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
                aria-invalid={Boolean(fieldErrors.heightCm)}
                aria-describedby={fieldErrors.heightCm ? 'heightCm-err' : undefined}
                required
              />
              <FieldError id="heightCm-err" message={fieldErrors.heightCm} />
            </div>
            <div className="field">
              <label htmlFor="weightKg">Cân nặng (kg)</label>
              <input
                id="weightKg"
                type="number"
                step="0.05"
                value={form.weightKg}
                onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                aria-invalid={Boolean(fieldErrors.weightKg)}
                aria-describedby={fieldErrors.weightKg ? 'weightKg-err' : undefined}
                required
              />
              <FieldError id="weightKg-err" message={fieldErrors.weightKg} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-eyebrow">4 · Tình trạng &amp; lịch</div>
          <h3>Độ khô, hạn nung &amp; trạng thái</h3>
          <div className="field-row">
            <div className="field">
              <label htmlFor="dryness">Độ khô (%)</label>
              <input
                id="dryness"
                type="number"
                step="1"
                min="0"
                max="100"
                value={form.drynessPercent}
                onChange={(e) => setForm({ ...form, drynessPercent: e.target.value })}
                aria-invalid={Boolean(fieldErrors.drynessPercent)}
                aria-describedby={fieldErrors.drynessPercent ? 'dryness-err' : undefined}
                required
              />
              <FieldError id="dryness-err" message={fieldErrors.drynessPercent} />
              {!fieldErrors.drynessPercent &&
                form.drynessPercent !== '' &&
                Number(form.drynessPercent) < 80 && (
                  <p className="help" style={{ color: 'var(--warning)' }}>
                    ⚠ Dưới 80% sẽ bị planner loại với lý do <code>under-dry</code>.
                  </p>
                )}
            </div>
            <div className="field">
              <label htmlFor="dueDate">Hạn nung</label>
              <input
                id="dueDate"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                aria-invalid={Boolean(fieldErrors.dueDate)}
                aria-describedby={fieldErrors.dueDate ? 'dueDate-err' : undefined}
                required
              />
              <FieldError id="dueDate-err" message={fieldErrors.dueDate} />
            </div>
            {canManageOwner && (
              <div className="field">
                <label htmlFor="status">Trạng thái</label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {PIECE_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {pieceStatusLabel[s]}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="field">
            <label htmlFor="notes">Ghi chú</label>
            <textarea
              id="notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Chi tiết về kỹ thuật men, yêu cầu đặc biệt, hoặc bối cảnh khác…"
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="ghost" onClick={() => navigate('/backlog')}>
            Hủy
          </button>
          <button type="submit" disabled={saving}>
            {saving ? (
              'Đang lưu…'
            ) : (
              <>
                <Icon.Check size={16} />
                {id ? 'Lưu thay đổi' : 'Đăng ký món'}
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
}
