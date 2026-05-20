import { AlertTriangle, ArrowRight, BellRing, Boxes, CalendarClock, CheckCircle2, ChevronRight, ClipboardList, Flame, Gauge, LayoutDashboard, ListFilter, LockKeyhole, Plus, RefreshCw, Route, ShieldCheck, Upload, UserRound, X } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPieceBlockReasons, type Alert, type FiringType, type Kiln, type Load, type Piece, type TargetCone, type User } from "../shared/domain";
import type { PlannerResult } from "../shared/planner";
import { Api, type ApiError, type DashboardSummary, type LoadDetail, canManageLoads, canManageSchedule } from "./lib/api";
import { formatAlertSeverity, formatAlertType, formatClayBody, formatFiringType, formatGlazeFamily, formatLoadStatus, formatPieceStatus, formatReasonCode, formatRole } from "./lib/labels";

type View = "dashboard" | "backlog" | "planner" | "loads";

type WorkflowStep = {
  targetView: View;
  title: string;
  detail: string;
  enabled: boolean;
};

type ViewGuide = {
  summary: string;
  primaryAction: string;
  nextAction: string;
};

type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
};

const coneOptions: TargetCone[] = ["04", "6", "10"];
const firingOptions: FiringType[] = ["bisque", "oxidation", "reduction", "raku"];
const clayOptions = ["stoneware", "porcelain", "earthenware", "wild-clay"];
const glazeOptions = ["clear", "celadon", "shino", "crawl", "soda-sensitive", "unknown"];
const statusOptions = ["", "draft", "ready", "blocked", "planned", "loaded", "fired"];
const blockedReasonOptions = ["", "UNDER_DRY", "UNKNOWN_GLAZE", "RAKU_CLAY_MISMATCH", "CONE10_EARTHENWARE"];

const sampleCsv = `timestamp,tempC,targetTempC,note
2026-05-19T09:00:00Z,24,24,bắt đầu
2026-05-19T10:00:00Z,120,100,tăng nhiệt nhanh hơn kế hoạch
2026-05-19T11:00:00Z,340,250,tăng nhiệt quá nhanh`;

export function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState(1);
  const [view, setView] = useState<View>("dashboard");
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [kilns, setKilns] = useState<Kiln[]>([]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [selectedLoadId, setSelectedLoadId] = useState<number | null>(null);
  const [loadDetail, setLoadDetail] = useState<LoadDetail | null>(null);
  const [planResult, setPlanResult] = useState<PlannerResult | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [pending, setPending] = useState(0);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const currentUser = users.find((user) => user.id === currentUserId) ?? users[0];
  const isBusy = pending > 0;

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const handleError = useCallback((err: unknown) => {
    const apiError = err as ApiError;
    if (apiError.status === 409) {
      setError("Xung đột: mẻ nung này đã thay đổi trên máy chủ. Hãy làm mới mẻ nung, kiểm tra phiên bản mới nhất rồi thử lại.");
      return;
    }
    setError(localizeApiError(apiError));
  }, []);

  const track = useCallback(<T,>(promise: Promise<T>): Promise<T> => {
    setPending((value) => value + 1);
    return promise.finally(() => setPending((value) => Math.max(0, value - 1)));
  }, []);

  const selectedLoadIdRef = useRef<number | null>(null);
  useEffect(() => {
    selectedLoadIdRef.current = selectedLoadId;
  }, [selectedLoadId]);

  const refreshCore = useCallback(async (userId = currentUserId) => {
    const [dashboardResponse, kilnsResponse, loadsResponse] = await Promise.all([
      Api.dashboard(userId),
      Api.kilns(userId),
      Api.loads(userId)
    ]);
    setDashboard(dashboardResponse);
    setKilns(kilnsResponse.kilns);
    setLoads(loadsResponse.loads);

    const currentSelectedId = selectedLoadIdRef.current;
    const stillExists = currentSelectedId !== null && loadsResponse.loads.some((load) => load.id === currentSelectedId);
    if (!stillExists) {
      setSelectedLoadId(loadsResponse.loads[0]?.id ?? null);
      setLoadDetail(null);
    }
  }, [currentUserId]);

  const refreshPieces = useCallback(async (filters: Record<string, string> = {}, userId = currentUserId) => {
    if (!currentUser || currentUser.role === "observer") {
      setPieces([]);
      return;
    }
    const response = await Api.pieces(userId, filters);
    setPieces(response.pieces);
  }, [currentUser, currentUserId]);

  const refreshLoadDetail = useCallback(async (loadId = selectedLoadId, userId = currentUserId) => {
    if (!loadId) return;
    const detail = await Api.loadDetail(userId, loadId);
    setLoadDetail(detail);
  }, [currentUserId, selectedLoadId]);

  useEffect(() => {
    let cancelled = false;
    Api.users(1)
      .then((response) => {
        if (cancelled) return;
        setUsers(response.users);
        const manager = response.users.find((user) => user.role === "manager");
        if (manager) setCurrentUserId(manager.id);
      })
      .catch((err) => {
        if (!cancelled) handleError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [handleError]);

  useEffect(() => {
    if (!currentUser) return;
    setError("");
    refreshCore(currentUser.id).catch(handleError);
    refreshPieces({}, currentUser.id).catch(() => setPieces([]));
  }, [currentUser?.id]);

  useEffect(() => {
    if (!selectedLoadId || !currentUser) return;
    refreshLoadDetail(selectedLoadId, currentUser.id).catch(handleError);
  }, [selectedLoadId, currentUser?.id]);

  const navItems = useMemo(() => [
    { id: "dashboard" as View, label: "Tổng quan", description: "Cảnh báo, công suất, mẻ gần nhất", step: "01", icon: LayoutDashboard, enabled: true },
    { id: "backlog" as View, label: "Danh sách chờ", description: "Nhận món, lọc ready/blocked", step: "02", icon: ListFilter, enabled: currentUser?.role !== "observer" },
    { id: "planner" as View, label: "Lập mẻ nung", description: "Chọn lò, cone, kiểu nung", step: "03", icon: Boxes, enabled: currentUser ? canManageLoads(currentUser.role) : false },
    { id: "loads" as View, label: "Lịch nung", description: "Duyệt, lên lịch, theo dõi", step: "04", icon: Flame, enabled: true }
  ], [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    if (view === "backlog" && currentUser.role === "observer") {
      setView("dashboard");
      return;
    }
    if (view === "planner" && !canManageLoads(currentUser.role)) {
      setView("dashboard");
    }
  }, [currentUser?.role, view]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Bỏ qua đến nội dung chính</a>
      <aside className="sidebar" aria-label="Điều hướng chính">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"><Flame size={23} /></span>
          <div>
            <strong>KilnFlow Ops</strong>
            <span>Lò gốm cộng đồng</span>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={view === item.id ? "nav-item active" : "nav-item"}
                disabled={!item.enabled}
                aria-label={item.label}
                aria-describedby={`nav-desc-${item.id}`}
                title={item.enabled ? item.description : "Vai trò hiện tại không có quyền mở màn này"}
                onClick={() => setView(item.id)}
              >
                <span className="nav-step" aria-hidden="true">{item.step}</span>
                <Icon size={18} aria-hidden="true" />
                <span className="nav-copy">
                  <span>{item.label}</span>
                  <small id={`nav-desc-${item.id}`}>{item.description}</small>
                </span>
                {view === item.id ? <ChevronRight className="nav-chevron" size={16} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-status" aria-live="polite">
          <span className="status-dot" aria-hidden="true" />
          <div>
            <strong>{currentUser?.name ?? "Đang tải"}</strong>
            <span>{currentUser ? formatRole(currentUser.role) : "Chưa có vai trò"}</span>
          </div>
        </div>
      </aside>

      <main className="main-panel" id="main-content" aria-busy={isBusy ? true : undefined}>
        <header className="topbar">
          <div>
            <h1>{viewTitle(view)}</h1>
            <p>
              {currentUser ? `${currentUser.name} - ${formatRole(currentUser.role)}` : "Đang tải hồ sơ vận hành"}
              {isBusy ? <span className="busy-indicator" aria-live="polite"> · đang xử lý...</span> : null}
            </p>
          </div>
          <label className="login-control">
            Đăng nhập giả lập
            <select value={currentUserId} onChange={(event) => setCurrentUserId(Number(event.target.value))} disabled={isBusy}>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.name} - {formatRole(user.role)}</option>
              ))}
            </select>
          </label>
        </header>

        <RoleContextPanel user={currentUser} view={view} onNavigate={setView} />

        {notice ? (
          <DismissibleNotice tone="success" onDismiss={() => setNotice("")} message={notice} />
        ) : null}
        {error ? (
          <DismissibleNotice tone="error" onDismiss={() => setError("")} message={error} />
        ) : null}

        {view === "dashboard" && dashboard ? (
          <Dashboard dashboard={dashboard} onOpenLoads={() => setView("loads")} />
        ) : null}

        {view === "backlog" && currentUser ? (
          <Backlog
            users={users}
            user={currentUser}
            pieces={pieces}
            isBusy={isBusy}
            onRefresh={(filters) => track(refreshPieces(filters)).catch(handleError)}
            onCreate={(input) =>
              track((async () => {
                setError("");
                const response = await Api.createPiece(currentUser.id, input);
                setNotice(`Đã tạo món: ${response.piece.name}`);
                await refreshPieces();
                await refreshCore();
              })())
            }
            onError={handleError}
          />
        ) : null}

        {view === "planner" && currentUser ? (
          <Planner
            user={currentUser}
            kilns={kilns}
            planResult={planResult}
            isBusy={isBusy}
            onPlan={(input) =>
              track((async () => {
                setError("");
                const response = await Api.planLoad(currentUser.id, input);
                setPlanResult(response.plan);
                setLoadDetail(response.detail);
                setSelectedLoadId(response.load.id);
                setNotice(`Đã tạo mẻ nung nháp ${response.load.id} với ${response.plan.selectedPieces.length} món được chọn.`);
                await refreshCore();
              })())
            }
            onError={handleError}
          />
        ) : null}

        {view === "loads" && currentUser ? (
          <LoadsView
            user={currentUser}
            loads={loads}
            detail={loadDetail}
            selectedLoadId={selectedLoadId}
            isBusy={isBusy}
            onSelectLoad={setSelectedLoadId}
            onRefresh={() => {
              setError("");
              track(refreshCore().then(() => refreshLoadDetail())).catch(handleError);
            }}
            onDetailChange={(detail) => {
              setLoadDetail(detail);
              track(refreshCore()).catch(handleError);
            }}
            onError={handleError}
            onConfirm={(request) => setConfirm(request)}
            trackAsync={track}
          />
        ) : null}
      </main>

      <ConfirmDialog
        open={Boolean(confirm)}
        request={confirm}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          const current = confirm;
          setConfirm(null);
          if (current) await current.onConfirm();
        }}
      />
    </div>
  );
}

function RoleContextPanel({ user, view, onNavigate }: { user?: User; view: View; onNavigate: (view: View) => void }) {
  const profile = getRoleProfile(user);
  const guide = getViewGuide(view, user);
  const workflowSteps = getWorkflowSteps(user);

  return (
    <section className="orientation-panel" aria-label="Định hướng theo vai trò">
      <div className="orientation-summary">
        <article className="orientation-card">
          <span className="context-icon" aria-hidden="true"><UserRound size={20} /></span>
          <div>
            <span className="context-label">Vai trò hiện tại</span>
            <strong className="orientation-title">{profile.title}</strong>
            <p>{profile.summary}</p>
            <ul className="role-action-list">
              {profile.actions.map((action) => (
                <li key={action}><CheckCircle2 size={15} aria-hidden="true" />{action}</li>
              ))}
            </ul>
          </div>
        </article>

        <article className="orientation-card">
          <span className="context-icon route" aria-hidden="true"><Route size={20} /></span>
          <div>
            <span className="context-label">Màn hình này</span>
            <strong className="orientation-title">{viewTitle(view)}</strong>
            <p>{guide.summary}</p>
            <div className="guide-action-row">
              <span><CheckCircle2 size={15} aria-hidden="true" />{guide.primaryAction}</span>
              <span><ArrowRight size={15} aria-hidden="true" />{guide.nextAction}</span>
            </div>
          </div>
        </article>
      </div>

      <div className="workflow-area">
        <div className="workflow-heading">
          <ClipboardList size={18} aria-hidden="true" />
          <span>Thứ tự thao tác gợi ý</span>
        </div>
        <ol className="workflow-list">
          {workflowSteps.map((step, index) => (
            <li key={`${step.title}-${index}`} className={`${view === step.targetView ? "active" : ""}${step.enabled ? "" : " locked"}`}>
              <button
                type="button"
                disabled={!step.enabled}
                aria-label={`${step.title}: ${step.detail}`}
                onClick={() => onNavigate(step.targetView)}
              >
                <span className="workflow-index">{index + 1}</span>
                <span>
                  <strong>{step.title}</strong>
                  <small>{step.detail}</small>
                </span>
                {step.enabled ? <ArrowRight size={15} aria-hidden="true" /> : <LockKeyhole size={15} aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Dashboard({ dashboard, onOpenLoads }: { dashboard: DashboardSummary; onOpenLoads: () => void }) {
  const highlightedAlert = dashboard.recentAlerts.find((alert) => alert.severity !== "info") ?? dashboard.recentAlerts[0];

  return (
    <section className="dashboard-layout" aria-labelledby="dashboard-heading">
      <h2 id="dashboard-heading" className="sr-only">Tóm tắt tổng quan</h2>
      <div className="dashboard-main">
        <KilnHero dashboard={dashboard} />

        {highlightedAlert ? (
          <div className={`incident-banner ${highlightedAlert.severity}`} role="status">
            <AlertTriangle size={20} aria-hidden="true" />
            <div>
              <strong>{formatAlertType(highlightedAlert.type)} ({formatAlertSeverity(highlightedAlert.severity)})</strong>
              <span>{highlightedAlert.message}</span>
            </div>
          </div>
        ) : null}

        <div className="metric-row">
          <MetricCard label="Món đang chờ" value={dashboard.pendingPieces} icon={<Boxes size={20} />} />
          <MetricCard label="Đủ điều kiện nung" value={dashboard.readyPieces} icon={<ShieldCheck size={20} />} tone="ok" />
          <MetricCard label="Món đang bị chặn" value={dashboard.blockedPieces} icon={<AlertTriangle size={20} />} tone="warn" />
        </div>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Ảnh chụp công suất lò</h2>
              <p>{dashboard.kilnCapacity.length} lò đang được theo dõi</p>
            </div>
          </div>
          <div className="capacity-grid">
            {dashboard.kilnCapacity.map((item) => {
              const loadCount = item.scheduledLoads + item.activeLoads;
              return (
                <div className="capacity-item" key={item.kiln.id}>
                  <div className="capacity-copy">
                    <strong>{item.kiln.name}</strong>
                    <span>{item.kiln.shelfCount} kệ, tối đa {item.kiln.maxWeightKg}kg</span>
                  </div>
                  <meter value={loadCount} min={0} max={4} aria-label={`Số load đã lên lịch của ${item.kiln.name}`} />
                  <small>{item.scheduledLoads} đã lên lịch, {item.activeLoads} đang nung</small>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Mẻ nung sắp tới</h2>
              <p>{dashboard.upcomingLoads.length} mẻ có lịch gần nhất</p>
            </div>
            <button type="button" className="text-button" onClick={onOpenLoads}>Mở lịch nung</button>
          </div>
          <div className="load-strip">
            {dashboard.upcomingLoads.length === 0 ? <p className="muted">Chưa có mẻ nung nào trong lịch.</p> : null}
            {dashboard.upcomingLoads.map((load) => (
              <article className="load-card" key={load.id}>
                <div>
                  <strong>{load.kilnName}</strong>
                  <LoadStatusBadge status={load.status} />
                </div>
                <span>Cone {load.targetCone} - {formatFiringType(load.firingType)}</span>
                <small>{load.scheduledStart ? `Từ ${formatDateTime(load.scheduledStart)}` : "Chưa có thời gian bắt đầu"}</small>
              </article>
            ))}
          </div>
        </section>
      </div>

      <aside className="dashboard-rail">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Lý do chặn phổ biến</h2>
              <p>{dashboard.blockedReasonCounts.length} nhóm đang hoạt động</p>
            </div>
          </div>
          <div className="reason-list">
            {dashboard.blockedReasonCounts.length === 0 ? <p className="muted">Không có lý do chặn đang hoạt động.</p> : null}
            {dashboard.blockedReasonCounts.map((reason) => (
              <div className="reason-row" key={reason.code}>
                <div>
                  <strong>{formatReasonCode(reason.code)}</strong>
                  <span>{reason.message}</span>
                </div>
                <b>{reason.count}</b>
              </div>
            ))}
          </div>
        </section>

        <RecentAlerts alerts={dashboard.recentAlerts} />
      </aside>
    </section>
  );
}

function KilnHero({ dashboard }: { dashboard: DashboardSummary }) {
  const activeLoads = dashboard.kilnCapacity.reduce((total, item) => total + item.activeLoads, 0);
  const scheduledLoads = dashboard.kilnCapacity.reduce((total, item) => total + item.scheduledLoads, 0);
  const totalPieces = dashboard.pendingPieces + dashboard.readyPieces + dashboard.blockedPieces;
  const readyPercent = totalPieces === 0 ? 0 : Math.round((dashboard.readyPieces / totalPieces) * 100);
  const nextLoad = dashboard.upcomingLoads[0];
  const headline = activeLoads > 0 ? `${activeLoads} lò đang giữ nhiệt` : "Buồng lò sẵn sàng cho mẻ kế tiếp";

  return (
    <section className="kiln-hero" aria-label="Nhịp lò hôm nay">
      <div className="kiln-hero-copy">
        <span className="kiln-kicker"><Flame size={16} aria-hidden="true" />Nhịp lò hôm nay</span>
        <h2>{headline}</h2>
        <p>
          {nextLoad
            ? `Mẻ gần nhất: ${nextLoad.kilnName ?? `Lò ${nextLoad.kilnId}`} - cone ${nextLoad.targetCone}, ${nextLoad.scheduledStart ? formatDateTime(nextLoad.scheduledStart) : "chưa đặt giờ"}.`
            : "Chưa có mẻ nung sắp tới, ưu tiên kiểm tra backlog và độ khô trước khi xếp lò."}
        </p>
      </div>
      <div className="kiln-visual" aria-hidden="true">
        <div className="kiln-arch">
          <div className="kiln-mouth">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
      <div className="kiln-hero-stats">
        <div>
          <strong>{readyPercent}%</strong>
          <span>Món đã đủ điều kiện</span>
        </div>
        <div>
          <strong>{scheduledLoads}</strong>
          <span>Mẻ đã lên lịch</span>
        </div>
      </div>
    </section>
  );
}

function Backlog({
  users,
  user,
  pieces,
  isBusy,
  onRefresh,
  onCreate,
  onError
}: {
  users: User[];
  user: User;
  pieces: Piece[];
  isBusy: boolean;
  onRefresh: (filters: Record<string, string>) => void;
  onCreate: (input: Parameters<typeof Api.createPiece>[1]) => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const defaultOwnerId = useMemo(() => String(user.role === "member" ? user.id : users.find((item) => item.role === "member")?.id ?? user.id), [user.id, user.role, users]);
  const [form, setForm] = useState({
    ownerId: defaultOwnerId,
    name: "",
    clayBody: "stoneware",
    glazeFamily: "clear",
    targetCone: "6",
    firingType: "oxidation",
    widthCm: "12",
    depthCm: "12",
    heightCm: "8",
    weightKg: "0.8",
    drynessPercent: "90",
    dueDate: "2026-06-10",
    notes: ""
  });

  useEffect(() => {
    onRefresh(filters);
  }, []);

  useEffect(() => {
    setForm((current) => current.ownerId === defaultOwnerId ? current : { ...current, ownerId: defaultOwnerId });
  }, [defaultOwnerId]);

  useEffect(() => {
    if (user.role !== "member" || !filters.ownerId) return;
    const nextFilters = { ...filters };
    delete nextFilters.ownerId;
    setFilters(nextFilters);
    onRefresh(nextFilters);
  }, [user.id, user.role]);

  function updateFilter(key: string, value: string) {
    const next = { ...filters, [key]: value };
    if (!value) delete next[key];
    setFilters(next);
    onRefresh(next);
  }

  return (
    <section className="split-layout">
      <div className="panel wide-panel">
        <div className="panel-heading">
          <div>
            <h2>Tìm trong danh sách chờ</h2>
            <p>{pieces.length} món khớp bộ lọc hiện tại</p>
          </div>
          <button type="button" className="icon-button" aria-label="Làm mới danh sách chờ" onClick={() => onRefresh(filters)}>
            <RefreshCw size={18} />
          </button>
        </div>
        <div className="filter-grid" aria-label="Bộ lọc danh sách chờ">
          <label>Chủ món
            <select value={filters.ownerId ?? ""} disabled={user.role === "member"} onChange={(event) => updateFilter("ownerId", event.target.value)}>
              <option value="">Tất cả chủ món</option>
              {users.filter((item) => item.role === "member").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>Cone
            <select value={filters.cone ?? ""} onChange={(event) => updateFilter("cone", event.target.value)}>
              <option value="">Tất cả cone</option>
              {coneOptions.map((cone) => <option key={cone} value={cone}>{cone}</option>)}
            </select>
          </label>
          <label>Kiểu nung
            <select value={filters.firingType ?? ""} onChange={(event) => updateFilter("firingType", event.target.value)}>
              <option value="">Tất cả kiểu nung</option>
              {firingOptions.map((type) => <option key={type} value={type}>{formatFiringType(type)}</option>)}
            </select>
          </label>
          <label>Lý do chặn
            <select value={filters.blockedReason ?? ""} onChange={(event) => updateFilter("blockedReason", event.target.value)}>
              {blockedReasonOptions.map((reason) => <option key={reason} value={reason}>{reason ? formatReasonCode(reason) : "Mọi lý do"}</option>)}
            </select>
          </label>
          <label>Hạn trước
            <input type="date" value={filters.dueDate ?? ""} onChange={(event) => updateFilter("dueDate", event.target.value)} />
          </label>
          <label>Trạng thái
            <select value={filters.status ?? ""} onChange={(event) => updateFilter("status", event.target.value)}>
              {statusOptions.map((status) => <option key={status} value={status}>{status ? formatPieceStatus(status) : "Mọi trạng thái"}</option>)}
            </select>
          </label>
        </div>
        <BacklogTable pieces={pieces} />
      </div>

      <form className="panel intake-form" onSubmit={(event) => {
        event.preventDefault();
        onCreate({
          ownerId: Number(form.ownerId),
          name: form.name,
          clayBody: form.clayBody,
          glazeFamily: form.glazeFamily,
          targetCone: form.targetCone,
          firingType: form.firingType,
          widthCm: Number(form.widthCm),
          depthCm: Number(form.depthCm),
          heightCm: Number(form.heightCm),
          weightKg: Number(form.weightKg),
          drynessPercent: Number(form.drynessPercent),
          dueDate: form.dueDate,
          notes: form.notes
        }).catch(onError);
      }}>
        <div className="panel-heading">
          <div>
            <h2>Nhận món mới</h2>
            <p>Mặc định: Cone 6, oxy hóa</p>
          </div>
        </div>
        <label>Chủ món/thành viên
          <select value={form.ownerId} disabled={user.role === "member"} onChange={(event) => setForm({ ...form, ownerId: event.target.value })}>
            {users.filter((item) => item.role === "member").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>Tên món
          <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <div className="two-col">
          <label>Loại đất
            <select value={form.clayBody} onChange={(event) => setForm({ ...form, clayBody: event.target.value })}>
              {clayOptions.map((option) => <option key={option} value={option}>{formatClayBody(option)}</option>)}
            </select>
          </label>
          <label>Nhóm men
            <select value={form.glazeFamily} onChange={(event) => setForm({ ...form, glazeFamily: event.target.value })}>
              {glazeOptions.map((option) => <option key={option} value={option}>{formatGlazeFamily(option)}</option>)}
            </select>
          </label>
        </div>
        <div className="two-col">
          <label>Cone mục tiêu
            <select value={form.targetCone} onChange={(event) => setForm({ ...form, targetCone: event.target.value })}>
              {coneOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>Kiểu nung
            <select value={form.firingType} onChange={(event) => setForm({ ...form, firingType: event.target.value })}>
              {firingOptions.map((option) => <option key={option} value={option}>{formatFiringType(option)}</option>)}
            </select>
          </label>
        </div>
        <div className="three-col">
          <NumberField label="Rộng (cm)" value={form.widthCm} onChange={(value) => setForm({ ...form, widthCm: value })} />
          <NumberField label="Sâu (cm)" value={form.depthCm} onChange={(value) => setForm({ ...form, depthCm: value })} />
          <NumberField label="Cao (cm)" value={form.heightCm} onChange={(value) => setForm({ ...form, heightCm: value })} />
        </div>
        <div className="two-col">
          <NumberField label="Trọng lượng (kg)" value={form.weightKg} onChange={(value) => setForm({ ...form, weightKg: value })} />
          <NumberField label="Độ khô (%)" value={form.drynessPercent} min={0} max={100} onChange={(value) => setForm({ ...form, drynessPercent: value })} />
        </div>
        <label>Hạn cần xong
          <input required type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
        </label>
        <label>Ghi chú
          <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </label>
        <button type="submit" className="primary-button" disabled={isBusy}><Plus size={18} />Tạo phiếu nhận</button>
      </form>
    </section>
  );
}

function Planner({
  user,
  kilns,
  planResult,
  isBusy,
  onPlan,
  onError
}: {
  user: User;
  kilns: Kiln[];
  planResult: PlannerResult | null;
  isBusy: boolean;
  onPlan: (input: { kilnId: number; targetCone: TargetCone; firingType: FiringType; dueDatePriority: boolean }) => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const [kilnId, setKilnId] = useState(kilns[0]?.id ?? 1);
  const [targetCone, setTargetCone] = useState<TargetCone>("6");
  const [firingType, setFiringType] = useState<FiringType>("oxidation");
  const selectedKiln = kilns.find((kiln) => kiln.id === kilnId) ?? kilns[0];

  useEffect(() => {
    if (kilns[0] && !kilns.some((kiln) => kiln.id === kilnId)) {
      setKilnId(kilns[0].id);
    }
  }, [kilns, kilnId]);

  return (
    <section className="planner-grid">
      <form className="panel planner-controls" onSubmit={(event) => {
        event.preventDefault();
        onPlan({ kilnId, targetCone, firingType, dueDatePriority: true }).catch(onError);
      }}>
        <div className="panel-heading">
          <div>
            <h2>Tự động lập mẻ</h2>
            <p>{selectedKiln ? `${selectedKiln.shelfCount} kệ, ${selectedKiln.maxWeightKg}kg tối đa` : "Đang tải lò"}</p>
          </div>
        </div>
        {selectedKiln ? (
          <div className="kiln-summary">
            <span>{selectedKiln.shelfWidthCm}x{selectedKiln.shelfDepthCm}cm</span>
            <span>Cao tối đa {selectedKiln.maxHeightPerShelfCm}cm/kệ</span>
          </div>
        ) : null}
        <label>Lò nung
          <select value={kilnId} onChange={(event) => setKilnId(Number(event.target.value))}>
            {kilns.map((kiln) => <option key={kiln.id} value={kiln.id}>{kiln.name}</option>)}
          </select>
        </label>
        <label>Cone mục tiêu
          <select value={targetCone} onChange={(event) => setTargetCone(event.target.value as TargetCone)}>
            {coneOptions.map((cone) => <option key={cone} value={cone}>{cone}</option>)}
          </select>
        </label>
        <label>Kiểu nung
          <select value={firingType} onChange={(event) => setFiringType(event.target.value as FiringType)}>
            {firingOptions.map((type) => <option key={type} value={type}>{formatFiringType(type)}</option>)}
          </select>
        </label>
        <button type="submit" className="primary-button" disabled={!canManageLoads(user.role) || isBusy}>
          <Gauge size={18} />Chạy lập mẻ
        </button>
      </form>

      <div className="panel planner-output">
        <div className="panel-heading">
          <h2>Kết quả lập mẻ</h2>
        </div>
        {!planResult ? <p className="muted">Chạy bộ lập kế hoạch để xem món được chọn, món bị loại, công suất và vị trí trên kệ.</p> : null}
        {planResult && selectedKiln ? (
          <>
            <div className="metric-row compact">
              <MetricCard label="Điểm" value={planResult.score} />
              <MetricCard label="Trọng lượng" value={`${planResult.capacityUsage.weightPercent}%`} />
              <MetricCard label="Diện tích đáy" value={`${planResult.capacityUsage.footprintPercent}%`} />
            </div>
            {planResult.warnings.map((warning) => <div className="notice warn" key={warning}>{warning}</div>)}
            <ShelfLayout kiln={selectedKiln} assignments={planResult.shelfAssignments} pieces={planResult.selectedPieces} />
            <ResultLists planResult={planResult} />
          </>
        ) : null}
      </div>
    </section>
  );
}

function LoadsView({
  user,
  loads,
  detail,
  selectedLoadId,
  isBusy,
  onSelectLoad,
  onRefresh,
  onDetailChange,
  onError,
  onConfirm,
  trackAsync
}: {
  user: User;
  loads: Load[];
  detail: LoadDetail | null;
  selectedLoadId: number | null;
  isBusy: boolean;
  onSelectLoad: (loadId: number) => void;
  onRefresh: () => void;
  onDetailChange: (detail: LoadDetail) => void;
  onError: (error: unknown) => void;
  onConfirm: (request: ConfirmRequest) => void;
  trackAsync: <T,>(promise: Promise<T>) => Promise<T>;
}) {
  return (
    <section className="loads-layout">
      <aside className="panel load-list" aria-label="Các mẻ nung">
        <div className="panel-heading">
          <div>
            <h2>Mẻ nung</h2>
            <p>{loads.length} mẻ trong hệ thống</p>
          </div>
          <button type="button" className="icon-button" aria-label="Làm mới mẻ nung" onClick={onRefresh}><RefreshCw size={18} /></button>
        </div>
        {loads.length === 0 ? <p className="muted">Chưa có mẻ nung nào.</p> : null}
        {loads.map((load) => (
          <button
            type="button"
            key={load.id}
            className={selectedLoadId === load.id ? "load-row active" : "load-row"}
            onClick={() => onSelectLoad(load.id)}
          >
            <strong>Mẻ {load.id}</strong>
            <span>{load.kilnName} - cone {load.targetCone}</span>
            <small>{formatLoadStatus(load.status)} - v{load.version}</small>
          </button>
        ))}
      </aside>

      {detail ? (
        <LoadDetailPanel
          user={user}
          detail={detail}
          isBusy={isBusy}
          onDetailChange={onDetailChange}
          onError={onError}
          onRefresh={onRefresh}
          onConfirm={onConfirm}
          trackAsync={trackAsync}
        />
      ) : (
        <div className="panel"><p className="muted">Chọn một mẻ nung để xem lịch nung, ghi chú nhật ký và cảnh báo cảm biến.</p></div>
      )}
    </section>
  );
}

function LoadDetailPanel({
  user,
  detail,
  isBusy,
  onDetailChange,
  onError,
  onRefresh,
  onConfirm,
  trackAsync
}: {
  user: User;
  detail: LoadDetail;
  isBusy: boolean;
  onDetailChange: (detail: LoadDetail) => void;
  onError: (error: unknown) => void;
  onRefresh: () => void;
  onConfirm: (request: ConfirmRequest) => void;
  trackAsync: <T,>(promise: Promise<T>) => Promise<T>;
}) {
  const [note, setNote] = useState("");
  const [csv, setCsv] = useState(sampleCsv);
  const defaultStart = useMemo(() => formatLocalDateTime(addDays(new Date(), 1, 9)), []);
  const defaultEnd = useMemo(() => formatLocalDateTime(addDays(new Date(), 1, 17)), []);
  const [scheduledStart, setScheduledStart] = useState(defaultStart);
  const [scheduledEnd, setScheduledEnd] = useState(defaultEnd);
  const manager = canManageSchedule(user.role);
  const technician = canManageLoads(user.role);
  const canRegenerate = technician && detail.load.status === "draft";
  const canApprove = manager && detail.load.status === "draft";
  const canSchedule = manager && detail.load.status === "approved";
  const canCancel = manager && detail.load.status !== "cancelled" && detail.load.status !== "completed";

  async function runAction(action: () => Promise<{ detail: LoadDetail }>) {
    try {
      const response = await trackAsync(action());
      onDetailChange(response.detail);
    } catch (error) {
      onError(error);
    }
  }

  return (
    <article className="panel load-detail">
      <div className="panel-heading">
        <div>
          <h2>Mẻ {detail.load.id}: {detail.kiln.name}</h2>
          <p className="muted">Cone {detail.load.targetCone} - {formatFiringType(detail.load.firingType)} - {formatLoadStatus(detail.load.status)} - phiên bản {detail.load.version}</p>
        </div>
        <button type="button" className="icon-button" aria-label="Làm mới chi tiết mẻ nung" onClick={onRefresh}><RefreshCw size={18} /></button>
      </div>

      <div className="load-meta-row">
        <MetricCard label="Món được chọn" value={detail.selectedPieces.length} icon={<Boxes size={20} />} />
        <MetricCard label="Món bị loại" value={detail.excludedPieces.length} icon={<AlertTriangle size={20} />} tone={detail.excludedPieces.length ? "warn" : "ok"} />
        <MetricCard label="Cảnh báo" value={detail.alerts.length} icon={<BellRing size={20} />} tone={detail.alerts.length ? "warn" : "ok"} />
      </div>

      <div className="detail-actions" aria-label="Thao tác mẻ nung">
        <button type="button" disabled={!canRegenerate || isBusy} onClick={() => {
          trackAsync(Api.regenerate(user.id, detail.load.id, detail.load.version))
            .then((response) => onDetailChange(response.detail))
            .catch(onError);
        }}>
          <RefreshCw size={16} />Tạo lại nháp
        </button>
        <button type="button" disabled={!canApprove || isBusy} onClick={() => runAction(() => Api.approve(user.id, detail.load.id, detail.load.version))}>
          <ShieldCheck size={16} />Duyệt
        </button>
        <button type="button" disabled={!canSchedule || isBusy} onClick={() => {
          const start = new Date(scheduledStart);
          const end = new Date(scheduledEnd);
          if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            onError(new Error("Thời gian lịch nung không hợp lệ."));
            return;
          }
          if (end <= start) {
            onError(new Error("Thời điểm kết thúc phải sau thời điểm bắt đầu."));
            return;
          }
          runAction(() => Api.schedule(user.id, detail.load.id, {
            expectedVersion: detail.load.version,
            scheduledStart: start.toISOString(),
            scheduledEnd: end.toISOString()
          }));
        }}>
          <CalendarClock size={16} />Lên lịch
        </button>
        <button type="button" className="danger-button" disabled={!canCancel || isBusy} onClick={() => {
          onConfirm({
            title: `Hủy mẻ ${detail.load.id}?`,
            message: "Hành động hủy mẻ nung sẽ chốt trạng thái và không thể quay lại. Vẫn tiếp tục?",
            confirmLabel: "Hủy mẻ nung",
            onConfirm: () => runAction(() => Api.cancel(user.id, detail.load.id, detail.load.version))
          });
        }}>
          <AlertTriangle size={16} />Hủy
        </button>
      </div>

      <div className="schedule-fields">
        <label>Bắt đầu lịch nung
          <input type="datetime-local" value={scheduledStart} onChange={(event) => setScheduledStart(event.target.value)} />
        </label>
        <label>Kết thúc lịch nung
          <input type="datetime-local" value={scheduledEnd} onChange={(event) => setScheduledEnd(event.target.value)} />
        </label>
      </div>

      <ShelfLayout
        kiln={detail.kiln}
        assignments={detail.selectedPieces.map((piece) => ({
          pieceId: piece.id,
          shelfIndex: piece.shelfIndex,
          xCm: piece.xCm,
          yCm: piece.yCm,
          widthCm: piece.placedWidthCm,
          depthCm: piece.placedDepthCm
        }))}
        pieces={detail.selectedPieces}
      />

      <div className="detail-columns">
        <section>
          <h3>Món được chọn</h3>
          <ul className="plain-list">
            {detail.selectedPieces.map((piece) => <li key={piece.id}><strong>{piece.name}</strong><span>{piece.ownerName} - {piece.weightKg}kg</span></li>)}
          </ul>
        </section>
        <section>
          <h3>Món bị loại</h3>
          <ul className="plain-list">
            {detail.excludedPieces.map((piece) => <li key={`${piece.pieceId}-${piece.reasonCode}`}><strong>{formatReasonCode(piece.reasonCode)}</strong><span>{piece.pieceName}: {piece.message}</span></li>)}
          </ul>
        </section>
      </div>

      <section className="sensor-section">
        <div className="panel-heading inline">
          <h3>Theo dõi quá trình nung</h3>
          <span>{detail.sensorReadings.length} bản ghi</span>
        </div>
        <TemperatureChart readings={detail.sensorReadings} />
        <label>CSV cảm biến
          <textarea className="csv-box" value={csv} onChange={(event) => setCsv(event.target.value)} />
        </label>
        <button type="button" className="primary-button" disabled={!technician || isBusy} onClick={() => {
          trackAsync(
            Api.importCsv(user.id, detail.load.id, csv)
              .then(() => Api.loadDetail(user.id, detail.load.id))
          )
            .then(onDetailChange)
            .catch(onError);
        }}>
          <Upload size={18} />Nhập CSV cảm biến
        </button>
      </section>

      <RecentAlerts alerts={detail.alerts} />

      <section>
        <h3>Nhật ký quyết định</h3>
        <form className="note-form" onSubmit={(event) => {
          event.preventDefault();
          const trimmed = note.trim();
          if (!trimmed) return;
          trackAsync(Api.addNote(user.id, detail.load.id, detail.load.version, trimmed))
            .then((response) => {
              setNote("");
              onDetailChange(response.detail);
            })
            .catch(onError);
        }}>
          <label className="sr-only" htmlFor="technical-note">Ghi chú kỹ thuật</label>
          <input
            id="technical-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Thêm ghi chú kỹ thuật"
            disabled={!technician || isBusy}
            maxLength={1000}
          />
          <button type="submit" disabled={!technician || isBusy || !note.trim()}>Thêm ghi chú</button>
        </form>
        <ul className="audit-list">
          {detail.auditNotes.map((item) => <li key={item.id}><strong>{item.userName}</strong><span>{item.note}</span><small>{formatDateTime(item.createdAt)}</small></li>)}
        </ul>
      </section>
    </article>
  );
}

function BacklogTable({ pieces }: { pieces: Piece[] }) {
  return (
    <div className="table-wrap">
      <table>
        <caption className="sr-only">Các món trong danh sách chờ</caption>
        <thead>
          <tr>
            <th>Món</th>
            <th>Chủ món</th>
            <th>Cone/kiểu</th>
            <th>Kích thước</th>
            <th>Độ khô</th>
            <th>Trạng thái</th>
            <th>Lý do chặn</th>
          </tr>
        </thead>
        <tbody>
          {pieces.length === 0 ? (
            <tr>
              <td colSpan={7}>
                <span className="muted">Không có món nào khớp bộ lọc hiện tại.</span>
              </td>
            </tr>
          ) : null}
          {pieces.map((piece) => {
            const reasons = getPieceBlockReasons(piece);
            return (
              <tr key={piece.id}>
                <td><strong>{piece.name}</strong><small>{formatGlazeFamily(piece.glazeFamily)}</small></td>
                <td>{piece.ownerName}</td>
                <td>Cone {piece.targetCone}<small>{formatFiringType(piece.firingType)}</small></td>
                <td>{piece.widthCm}x{piece.depthCm}x{piece.heightCm}cm</td>
                <td>{piece.drynessPercent}%</td>
                <td><StatusBadge status={piece.status} /></td>
                <td>{reasons.length ? reasons.map((reason) => <span className="reason-chip" key={reason.code}>{formatReasonCode(reason.code)}</span>) : <span className="muted">Không có</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ShelfLayout({
  kiln,
  assignments,
  pieces
}: {
  kiln: Kiln;
  assignments: Array<{ pieceId: number; shelfIndex: number; xCm: number; yCm: number; widthCm: number; depthCm: number }>;
  pieces: Array<Pick<Piece, "id" | "name">>;
}) {
  const pieceNames = new Map(pieces.map((piece) => [piece.id, piece.name]));
  return (
    <section className="shelf-layout" aria-label={`Sơ đồ kệ cho ${kiln.name}`}>
      <h3>Sơ đồ kệ</h3>
      <div className="shelves">
        {Array.from({ length: kiln.shelfCount }, (_, shelfIndex) => (
          <div className="shelf" key={shelfIndex} aria-label={`Kệ ${shelfIndex + 1}`}>
            <span className="shelf-label">Kệ {shelfIndex + 1}</span>
            {assignments.filter((assignment) => assignment.shelfIndex === shelfIndex).map((assignment) => (
              <div
                key={assignment.pieceId}
                className="piece-block"
                title={pieceNames.get(assignment.pieceId)}
                style={{
                  left: `${(assignment.xCm / kiln.shelfWidthCm) * 100}%`,
                  top: `${(assignment.yCm / kiln.shelfDepthCm) * 100}%`,
                  width: `${(assignment.widthCm / kiln.shelfWidthCm) * 100}%`,
                  height: `${(assignment.depthCm / kiln.shelfDepthCm) * 100}%`
                }}
              >
                {pieceNames.get(assignment.pieceId)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function TemperatureChart({ readings }: { readings: Array<{ timestamp: string; tempC: number; targetTempC: number }> }) {
  if (readings.length === 0) {
    return <div className="empty-chart" role="img" aria-label="Chưa nhập bản ghi nhiệt độ">Chưa có bản ghi.</div>;
  }

  const maxTemp = Math.max(...readings.flatMap((reading) => [reading.tempC, reading.targetTempC]), 100);
  const points = readings.map((reading, index) => {
    const x = readings.length === 1 ? 50 : (index / (readings.length - 1)) * 100;
    const y = 100 - (reading.tempC / maxTemp) * 90;
    return `${x},${y}`;
  }).join(" ");
  const targetPoints = readings.map((reading, index) => {
    const x = readings.length === 1 ? 50 : (index / (readings.length - 1)) * 100;
    const y = 100 - (reading.targetTempC / maxTemp) * 90;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg className="temp-chart" viewBox="0 0 100 100" role="img" aria-label="Biểu đồ nhiệt độ so sánh thực tế và mục tiêu" preserveAspectRatio="none">
      <polyline points={targetPoints} fill="none" stroke="var(--steel)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <polyline points={points} fill="none" stroke="var(--fire)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function ResultLists({ planResult }: { planResult: PlannerResult }) {
  return (
    <div className="detail-columns">
      <section>
        <h3>Được chọn</h3>
        <ul className="plain-list">
          {planResult.selectedPieces.map((piece) => <li key={piece.id}><strong>{piece.name}</strong><span>{piece.ownerName} - hạn {piece.dueDate}</span></li>)}
        </ul>
      </section>
      <section>
        <h3>Bị loại</h3>
        <ul className="plain-list">
          {planResult.excludedPieces.map((piece) => <li key={`${piece.pieceId}-${piece.reasonCode}`}><strong>{formatReasonCode(piece.reasonCode)}</strong><span>{piece.pieceName}: {piece.message}</span></li>)}
        </ul>
      </section>
    </div>
  );
}

function RecentAlerts({ alerts }: { alerts: Alert[] }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Cảnh báo gần đây</h2>
      </div>
      <ul className="alert-list">
        {alerts.length === 0 ? <li className="muted">Chưa có cảnh báo.</li> : null}
        {alerts.map((alert) => (
          <li key={alert.id ?? `${alert.type}-${alert.message}`} className={`alert-item ${alert.severity}`}>
            <AlertTriangle size={18} aria-hidden="true" />
            <div>
              <strong>{formatAlertType(alert.type)} ({formatAlertSeverity(alert.severity)})</strong>
              <span>{alert.message}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DismissibleNotice({ message, tone, onDismiss }: { message: string; tone: "success" | "error"; onDismiss: () => void }) {
  return (
    <div className={`notice ${tone}`} role={tone === "error" ? "alert" : "status"}>
      <span className="notice-body">{message}</span>
      <button type="button" className="notice-dismiss" aria-label="Đóng thông báo" onClick={onDismiss}>
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

function ConfirmDialog({
  open,
  request,
  onCancel,
  onConfirm
}: {
  open: boolean;
  request: ConfirmRequest | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open || !request) return null;

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="dialog">
        <h2 id="confirm-dialog-title">{request.title}</h2>
        <p>{request.message}</p>
        <div className="dialog-actions">
          <button type="button" onClick={onCancel}>Không, để sau</button>
          <button type="button" className="primary-button danger" onClick={onConfirm} autoFocus>
            {request.confirmLabel ?? "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, tone }: { label: string; value: string | number; icon?: ReactNode; tone?: "warn" | "ok" }) {
  const toneClass = tone ? ` ${tone}` : "";

  return (
    <article className={`metric-card${toneClass}`}>
      {icon ? <span className="metric-icon" aria-hidden="true">{icon}</span> : null}
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </article>
  );
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: string; min?: number; max?: number; onChange: (value: string) => void }) {
  return (
    <label>{label}
      <input required type="number" min={min ?? 0.01} max={max} step="0.1" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge ${status}`}>{formatPieceStatus(status)}</span>;
}

function LoadStatusBadge({ status }: { status: string }) {
  return <span className={`status-badge load-${status}`}>{formatLoadStatus(status)}</span>;
}

function getRoleProfile(user?: User): { title: string; summary: string; actions: string[] } {
  if (!user) {
    return {
      title: "Đang tải hồ sơ",
      summary: "Ứng dụng đang lấy vai trò để bật đúng luồng thao tác.",
      actions: ["Đọc tổng quan khi dữ liệu sẵn sàng"]
    };
  }

  if (user.role === "manager") {
    return {
      title: `${user.name} - ${formatRole(user.role)}`,
      summary: "Toàn quyền vận hành: đọc tình trạng, lập mẻ, duyệt và chốt lịch nung.",
      actions: ["Xem toàn bộ backlog", "Duyệt, lên lịch hoặc hủy mẻ", "Theo dõi cảm biến và nhật ký"]
    };
  }

  if (user.role === "technician") {
    return {
      title: `${user.name} - ${formatRole(user.role)}`,
      summary: "Tập trung vào chuẩn bị kỹ thuật: nhận món, kiểm tra điều kiện, tạo mẻ nháp và theo dõi quá trình nung.",
      actions: ["Tạo phiếu nhận và lọc món", "Chạy hoặc tạo lại mẻ nháp", "Nhập CSV cảm biến, thêm ghi chú"]
    };
  }

  if (user.role === "member") {
    return {
      title: `${user.name} - ${formatRole(user.role)}`,
      summary: "Theo dõi món của mình và gửi thêm phiếu nhận, không can thiệp vào lịch vận hành lò.",
      actions: ["Tạo phiếu cho món của mình", "Xem trạng thái món đã gửi", "Theo dõi lịch nung ở chế độ đọc"]
    };
  }

  return {
    title: `${user.name} - ${formatRole(user.role)}`,
    summary: "Chế độ chỉ đọc dành cho người cần nắm tình trạng vận hành mà không chỉnh sửa dữ liệu.",
    actions: ["Xem tổng quan vận hành", "Xem lịch và cảnh báo", "Không tạo, duyệt hoặc nhập dữ liệu"]
  };
}

function getViewGuide(view: View, user?: User): ViewGuide {
  const canPlan = user ? canManageLoads(user.role) : false;
  const canSchedule = user ? canManageSchedule(user.role) : false;

  if (view === "dashboard") {
    return {
      summary: "Điểm bắt đầu để đọc nhanh rủi ro, công suất lò, mẻ sắp tới và backlog cần xử lý.",
      primaryAction: "Ưu tiên cảnh báo và món bị chặn",
      nextAction: canPlan ? "Sang danh sách chờ hoặc lập mẻ" : "Sang lịch nung để theo dõi"
    };
  }

  if (view === "backlog") {
    return {
      summary: user?.role === "member"
        ? "Nơi gửi phiếu cho món của bạn và kiểm tra trạng thái món đang chờ."
        : "Nơi nhận món mới, lọc theo cone/kiểu nung/lý do chặn và chuẩn bị đầu vào cho planner.",
      primaryAction: user?.role === "member" ? "Tạo phiếu nhận đúng chủ món" : "Lọc món ready hoặc blocked",
      nextAction: canPlan ? "Chạy lập mẻ khi backlog đủ sạch" : "Theo dõi lịch sau khi gửi món"
    };
  }

  if (view === "planner") {
    return {
      summary: "Tạo mẻ nháp từ các món đủ điều kiện, kèm lý do loại và sơ đồ xếp kệ để kiểm tra trước khi duyệt.",
      primaryAction: "Chọn lò, cone, kiểu nung",
      nextAction: "Mở lịch nung để duyệt hoặc theo dõi"
    };
  }

  return {
    summary: "Nơi xem mẻ nung, trạng thái, sơ đồ kệ, nhật ký quyết định và dữ liệu cảm biến theo từng phiên bản.",
    primaryAction: canSchedule ? "Duyệt hoặc đặt lịch bằng phiên bản mới nhất" : "Chọn mẻ để đọc trạng thái",
    nextAction: canPlan ? "Nhập CSV hoặc ghi chú khi cần" : "Quay lại tổng quan khi cần bức tranh chung"
  };
}

function getWorkflowSteps(user?: User): WorkflowStep[] {
  const canOpenBacklog = Boolean(user && user.role !== "observer");
  const canPlan = Boolean(user && canManageLoads(user.role));
  const canSchedule = Boolean(user && canManageSchedule(user.role));

  return [
    {
      targetView: "dashboard",
      title: "Đọc tổng quan",
      detail: "Cảnh báo, công suất, backlog.",
      enabled: Boolean(user)
    },
    {
      targetView: "backlog",
      title: user?.role === "member" ? "Gửi món" : "Nhận và lọc món",
      detail: canOpenBacklog ? "Tạo phiếu, lọc ready/blocked." : "Khóa với vai trò quan sát.",
      enabled: canOpenBacklog
    },
    {
      targetView: "planner",
      title: "Lập mẻ nháp",
      detail: canPlan ? "Chọn lò, cone, kiểu nung." : "Cần kỹ thuật viên/quản lý.",
      enabled: canPlan
    },
    {
      targetView: "loads",
      title: canSchedule ? "Chốt mẻ" : "Xem lịch",
      detail: canSchedule ? "Kiểm tra phiên bản và giờ nung." : "Đọc trạng thái mẻ nung.",
      enabled: Boolean(user)
    },
    {
      targetView: "loads",
      title: "Theo dõi sau nung",
      detail: canPlan ? "Nhập CSV, xem cảnh báo, ghi chú." : "Theo dõi cảnh báo ở chế độ đọc.",
      enabled: Boolean(user)
    }
  ];
}

function viewTitle(view: View): string {
  if (view === "dashboard") return "Tổng quan vận hành";
  if (view === "backlog") return "Danh sách nhận món";
  if (view === "planner") return "Lập kế hoạch xếp lò";
  return "Lịch nung";
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function addDays(base: Date, days: number, hours: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  next.setHours(hours, 0, 0, 0);
  return next;
}

function formatLocalDateTime(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localizeApiError(apiError: ApiError): string {
  if (apiError.code === "FORBIDDEN") return "Bạn không có quyền thực hiện thao tác này.";
  if (apiError.code === "VALIDATION_ERROR") return "Dữ liệu nhập chưa hợp lệ. Hãy kiểm tra lại các trường bắt buộc.";
  if (apiError.code === "NOT_FOUND") return "Không tìm thấy dữ liệu cần thao tác.";
  if (apiError.code === "VERSION_CONFLICT") return "Dữ liệu đã thay đổi. Hãy làm mới rồi thử lại.";
  return apiError.message ?? "Yêu cầu thất bại.";
}
