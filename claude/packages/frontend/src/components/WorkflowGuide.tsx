import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Role } from '@kilnflow/shared';
import { ROLE_GUIDE } from '../state/roleGuide';
import { roleLabel } from '../i18n';
import { Icon } from './Icon';

const STORAGE_KEY = 'kilnflow.guideCollapsed';

// "Bạn nên làm gì tiếp theo" — bảng hướng dẫn workflow theo role hiện tại.
// Có thể thu gọn (lưu localStorage) để không cản trở user đã quen việc.
export function WorkflowGuide({
  role,
  userName,
}: {
  role: Role;
  userName: string;
}) {
  const guide = ROLE_GUIDE[role];
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      // ignore
    }
  }, [collapsed]);

  return (
    <section className="workflow-guide" aria-label="Hướng dẫn workflow">
      <header className="workflow-guide-head">
        <div className="workflow-guide-title">
          <div className="section-eyebrow">Chào {userName.split(' ').slice(-1)[0]} · vai trò {roleLabel[role]}</div>
          <h2>Bạn nên làm gì tiếp theo</h2>
          <p className="workflow-guide-tagline">{guide.tagline}</p>
        </div>
        <button
          type="button"
          className="ghost small"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <>
              <Icon.Sparkles size={14} /> Mở hướng dẫn
            </>
          ) : (
            <>
              <Icon.X size={14} /> Thu gọn
            </>
          )}
        </button>
      </header>

      {!collapsed && (
        <>
          <ol className="workflow-steps-list">
            {guide.nextSteps.map((step) => (
              <li key={step.num} className="workflow-step-card">
                <div className="workflow-step-num">{step.num}</div>
                <div className="workflow-step-body">
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  {step.cta && (
                    <Link to={step.cta.to} className="btn small secondary workflow-step-cta">
                      {step.cta.label} →
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <details className="workflow-guide-permissions">
            <summary>
              <Icon.User size={14} /> Quyền của vai trò {roleLabel[role]}
            </summary>
            <div className="workflow-permissions-grid">
              <div>
                <div className="perm-label perm-can">
                  <Icon.Check size={12} /> Có thể
                </div>
                <ul>
                  {guide.can.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
              {guide.cannot && (
                <div>
                  <div className="perm-label perm-cannot">
                    <Icon.X size={12} /> Không thể
                  </div>
                  <ul>
                    {guide.cannot.items.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                  <p className="perm-askfor">{guide.cannot.askFor}</p>
                </div>
              )}
            </div>
          </details>
        </>
      )}
    </section>
  );
}
