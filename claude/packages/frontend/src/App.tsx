import { NavLink, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { BacklogPage } from './pages/BacklogPage';
import { IntakePage } from './pages/IntakePage';
import { LoadsPage } from './pages/LoadsPage';
import { LoadDetailPage } from './pages/LoadDetailPage';
import { PlannerPage } from './pages/PlannerPage';
import { useAuth } from './state/auth';
import { roleLabel } from './i18n';
import { Icon } from './components/Icon';

export function App() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="app guest">
        <main className="page">
          <div className="card" style={{ maxWidth: 360, margin: '4rem auto' }}>
            <div className="stack">
              <div className="skeleton skeleton-row" style={{ width: '50%' }} />
              <div className="skeleton skeleton-row" />
              <div className="skeleton skeleton-row" style={{ width: '80%' }} />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="app guest">
        <LoginPage />
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="main-area">
        <main className="page">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/backlog" element={<BacklogPage />} />
            <Route path="/intake" element={<IntakePage />} />
            <Route path="/intake/:id" element={<IntakePage />} />
            <Route path="/planner" element={<PlannerPage />} />
            <Route path="/loads" element={<LoadsPage />} />
            <Route path="/loads/:id" element={<LoadDetailPage />} />
            <Route
              path="*"
              element={
                <div className="card">
                  <h2 className="section-title">Không tìm thấy trang</h2>
                  <p className="help">Đường dẫn này không tồn tại.</p>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function Sidebar() {
  const { currentUser, setUser } = useAuth();
  if (!currentUser) return null;

  const initials = currentUser.name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside className="sidebar" aria-label="Điều hướng chính">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">K</div>
        <div>
          <div className="brand-name">KilnFlow Ops</div>
          <div className="brand-tag">Studio gốm</div>
        </div>
      </div>

      <nav>
        <NavItem to="/" end icon={<Icon.Dashboard />}>Bảng điều khiển</NavItem>

        <div className="nav-section">
          <span className="nav-section-num">1</span> Tiếp nhận
        </div>
        <NavItem to="/intake" icon={<Icon.Plus />}>Đăng ký món</NavItem>
        <NavItem to="/backlog" icon={<Icon.Stack />}>Hàng đợi</NavItem>

        <div className="nav-section">
          <span className="nav-section-num">2</span> Lập kế hoạch
        </div>
        <NavItem to="/planner" icon={<Icon.Wand />}>Auto-planner</NavItem>

        <div className="nav-section">
          <span className="nav-section-num">3</span> Vận hành
        </div>
        <NavItem to="/loads" icon={<Icon.Flame />}>Đợt nung</NavItem>
      </nav>

      <div className="sidebar-spacer" />

      <div className="user-card">
        <div className="avatar" aria-hidden="true">{initials || '?'}</div>
        <div className="user-info">
          <div className="user-name" title={currentUser.name}>{currentUser.name}</div>
          <div className="user-role">{roleLabel[currentUser.role]}</div>
        </div>
        <button
          className="ghost"
          onClick={() => setUser(null)}
          aria-label="Đăng xuất"
          title="Đăng xuất"
        >
          <Icon.Logout size={16} />
        </button>
      </div>
    </aside>
  );
}

function NavItem({
  to,
  end,
  icon,
  children,
}: {
  to: string;
  end?: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <NavLink to={to} end={end}>
      <span className="nav-icon" aria-hidden="true">{icon}</span>
      <span>{children}</span>
    </NavLink>
  );
}
