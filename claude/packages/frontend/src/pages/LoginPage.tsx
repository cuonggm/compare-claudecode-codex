import { useEffect, useState } from 'react';
import { useAuth } from '../state/auth';
import { roleLabel } from '../i18n';
import { Icon } from '../components/Icon';
import { KilnIllustration } from '../components/KilnIllustration';

export function LoginPage() {
  const { users, setUser } = useAuth();
  const [selectedId, setSelectedId] = useState<string>(users[0]?.id ?? '');

  useEffect(() => {
    if (!selectedId && users[0]) {
      setSelectedId(users[0].id);
    }
  }, [selectedId, users]);

  function initials(name: string) {
    return name
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  return (
    <div className="login-shell">
      <section className="login-hero" aria-label="Giới thiệu KilnFlow">
        <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
          <div className="brand-mark lg" aria-hidden="true">K</div>
          <div>
            <div style={{ fontSize: '0.85rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(253, 243, 227, 0.55)' }}>
              KilnFlow Ops
            </div>
            <div style={{ fontSize: '1rem', color: 'rgba(253, 243, 227, 0.78)' }}>
              vận hành lò nung gốm
            </div>
          </div>
        </div>

        <div>
          <h1>
            Từ <span style={{ color: '#f0b87e' }}>đất ướt</span>
            <br />đến lửa hoàn hảo.
          </h1>
          <p className="lead">
            Quản lý hàng đợi pieces, lập kế hoạch nung tự động theo cone &amp; firing-type,
            giám sát cảm biến đợt nung — tất cả trong một workspace nội bộ.
          </p>
        </div>

        <ul className="feature-list">
          <li>
            <span className="check"><Icon.Check size={14} /></span>
            Auto-planner gợi ý món sẵn sàng + cảnh báo lý do loại trừ rõ ràng.
          </li>
          <li>
            <span className="check"><Icon.Check size={14} /></span>
            Optimistic concurrency &amp; RBAC server-side cho mọi đợt nung.
          </li>
          <li>
            <span className="check"><Icon.Check size={14} /></span>
            Theo dõi nhiệt độ thực tế vs mục tiêu, tự động phát hiện alert.
          </li>
        </ul>

        <div className="kiln-art-wrap" aria-hidden="true">
          <KilnIllustration size={260} />
        </div>
      </section>

      <section className="login-form" aria-label="Đăng nhập">
        <div className="card">
          <div className="section-eyebrow">Đăng nhập (mock)</div>
          <h2 className="section-title" style={{ marginTop: 0 }}>Chọn một thành viên studio</h2>
          <p className="help" style={{ marginBottom: '1rem' }}>
            KilnFlow chạy hoàn toàn local với 5 tài khoản giả lập. Mỗi vai trò có
            quyền khác nhau, được enforce phía backend.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const u = users.find((x) => x.id === selectedId);
              if (u) setUser(u);
            }}
          >
            <div className="field">
              <label htmlFor="user-radio-group" className="sr-only">Chọn người dùng</label>
              <div className="user-picker" id="user-radio-group" role="radiogroup" aria-label="Chọn người dùng">
                {users.map((u) => {
                  const checked = selectedId === u.id;
                  return (
                    <label
                      key={u.id}
                      className="opt"
                      data-selected={checked}
                    >
                      <input
                        type="radio"
                        name="user"
                        value={u.id}
                        checked={checked}
                        onChange={() => setSelectedId(u.id)}
                      />
                      <span className="avatar" aria-hidden="true">{initials(u.name)}</span>
                      <span>{u.name}</span>
                      <span className="role-tag">{roleLabel[u.role]}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="form-actions" style={{ borderTop: 'none', paddingTop: 0, marginTop: '1rem' }}>
              <button type="submit" disabled={!selectedId}>
                <Icon.User size={16} /> Vào workspace
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
